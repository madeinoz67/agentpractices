// author: Stephen Eaton
// Prompt-injection and hidden-content scanner for content that AI agents consume.
// Deterministic, line-based. Hard rules (invisible/control characters) can never be allowlisted;
// heuristic rules can, but only by an entry pinned to the exact line's hash in security/injection-allowlist.yaml.
import { createHash } from 'node:crypto';

export type Level = 'error' | 'warning';
export interface Finding { file: string; line: number; rule: string; level: Level; msg: string; hash: string; excerpt: string }
export interface AllowEntry { file: string; rule: string; hash: string; reason: string }

/** Rules that no allowlist entry can suppress. Write such characters as escapes (`U+200B`) instead. */
export const HARD_RULES = new Set(['INJ_INVISIBLE', 'INJ_TAG_CHARS', 'INJ_CONTROL']);

// Zero-width, bidi overrides/isolates, word joiners, soft hyphen, interlinear annotation, BOM (BOM allowed at file start only).
const INVISIBLE = /[\u00AD\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFFF9-\uFFFB\uFEFF]|[\u{E0100}-\u{E01EF}]/u;
// Unicode tag block: renders as nothing, read by LLMs as ASCII ("ASCII smuggling").
const TAG_CHARS = /[\u{E0000}-\u{E007F}]/u;
// C0/C1 controls except tab, LF, CR.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/;
const PRIVATE_USE = /[\uE000-\uF8FF]|[\u{F0000}-\u{FFFFD}]|[\u{100000}-\u{10FFFD}]/u;

interface Rule { id: string; level: Level; msg: string; re: RegExp }

/** Heuristic text rules, matched against the NFKC-normalised line with invisible characters removed. */
export const TEXT_RULES: Rule[] = [
  { id: 'INJ_OVERRIDE', level: 'error', msg: 'instruction-override phrase',
    re: /\b(ignore|disregard|forget|override|bypass)\b.{0,40}\b(all\s+)?(previous|prior|above|earlier|preceding|your|any|the\s+system)\b.{0,20}\b(instructions?|rules?|prompts?|guidelines?|directives?|context|policies)\b/i },
  { id: 'INJ_OVERRIDE', level: 'error', msg: 'persona or mode switch phrase',
    re: /\b(you\s+are\s+now\b|from\s+now\s+on,?\s+you\b|new\s+instructions?\s*:|developer\s+mode|jailbreak|\bDAN\b\s+mode|do\s+anything\s+now|act\s+as\s+an?\s+(unrestricted|unfiltered|uncensored))/i },
  { id: 'INJ_ROLE_MARKER', level: 'error', msg: 'chat-template or role marker',
    re: /(<\|(im_start|im_end|system|user|assistant|endoftext|eot_id|start_header_id)\|>|\[\/?INST\]|<\/?s>|<<\/?SYS>>|<\/?(system|system_prompt|instructions)>|^\s*(#+\s*)?(SYSTEM|ASSISTANT|HUMAN)\s*:|BEGIN\s+(SYSTEM|HIDDEN)\s+(PROMPT|INSTRUCTIONS))/i },
  { id: 'INJ_AGENT_ADDRESS', level: 'error', msg: 'text addressed directly at AI agents',
    re: /\b(note\s+to|attention|hey|dear)\s+(the\s+)?(ai|llm|agents?|assistants?|language\s+models?|claude|gpt|chatgpt|copilot|gemini)\b|\b(if\s+you\s+are\s+(an?\s+)?(ai|llm|language\s+model|agent|assistant)\b)|\b(ai|llm)\s+(agents?|assistants?|models?)\s*(:|,\s*(you|please|ignore|now|do|must|always)\b)/i },
  { id: 'INJ_EXFIL', level: 'error', msg: 'instruction to send secrets or local data somewhere',
    re: /\b(send|post|upload|exfiltrate|transmit|forward|email|leak|paste|curl|wget|fetch)\b.{0,60}\b(api[\s_-]?keys?|tokens?|secrets?|credentials?|passwords?|private\s+keys?|ssh\s+keys?|\.env\b|env(ironment)?\s+var(iable)?s?|~\/\.ssh|~\/\.aws|cookies?|session\s+ids?)\b.{0,40}\b(to|into|at|via)\b.{0,30}(https?:\/\/|[\w.-]+@[\w-]+\.|webhooks?|endpoints?|servers?|pastebin|gist|\bme\b|this\s+(url|address|email))/i },
  { id: 'INJ_REMOTE_EXEC', level: 'error', msg: 'download-and-execute pattern',
    re: /\b(curl|wget|iwr|irm|Invoke-WebRequest|Invoke-RestMethod)\b[^\n|]{0,200}\|\s*(sudo\s+)?(ba|z|fi|da)?sh\b|\b(iex|Invoke-Expression)\b\s*\(?\s*(\(?\s*(iwr|irm|New-Object\s+Net\.WebClient|Invoke-WebRequest|Invoke-RestMethod))|powershell(\.exe)?\s+(-\w+\s+)*-e(nc(odedcommand)?)?\s+[A-Za-z0-9+/=]{20,}|\beval\s+["']?\$\((curl|wget)/i },
  { id: 'INJ_SAFETY_OFF', level: 'error', msg: 'instruction to disable agent safety controls',
    re: /--dangerously-skip-permissions|\bbypassPermissions\b|--yolo\b|\b(disable|turn\s+off|skip|remove)\s+(the\s+|all\s+|your\s+)?(sandbox(ing)?|guardrails?|safety\s+(checks?|filters?)|permission\s+prompts?|approvals?|confirmation)\b|\bwithout\s+(asking|confirmation|approval)\b|\bauto-?approve\s+(all|everything)\b/i },
  { id: 'INJ_HIDDEN_HTML', level: 'error', msg: 'HTML comment: invisible on the rendered page but read by agents from raw .md / llms-full.txt',
    re: /<!--/ },
  { id: 'INJ_HIDDEN_HTML', level: 'error', msg: 'active or visually hidden HTML',
    re: /<\s*(script|iframe|object|embed|style|meta|link|base|form|svg)\b|<[^>]+\s(hidden|aria-hidden\s*=\s*["']?true)\b|style\s*=\s*["'][^"']*(display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0|opacity\s*:\s*0(\.0+)?\s*(;|["'])|color\s*:\s*(#fff(fff)?|white|transparent)\b)|<[^>]+\son[a-z]+\s*=\s*["']/i },
  { id: 'INJ_SCRIPT_URL', level: 'error', msg: 'script or data URL',
    re: /\b(javascript|vbscript)\s*:\s*[^\s,;)]|\bdata:[a-z]+\/[a-z0-9.+-]+[;,]/i },
  { id: 'INJ_EXFIL_IMG', level: 'error', msg: 'remote image with a query string (zero-click exfiltration via image fetch)',
    re: /!\[[^\]]*\]\(\s*<?https?:\/\/[^)\s>]+\?[^)\s>]*=|<img\b[^>]*\bsrc\s*=\s*["']?https?:\/\/[^"'\s>]+\?[^"'\s>]*=/i },
];

const SHORTENERS = new Set(['bit.ly', 't.co', 'tinyurl.com', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'rebrand.ly', 'cutt.ly', 'shorturl.at', 'rb.gy', 'tiny.cc', 'lnkd.in', 's.id', 'v.gd']);
const URL_RE = /\bhttps?:\/\/[^\s)<>"'`\]]+/gi;
const BASE64_RUN = /[A-Za-z0-9+/]{100,}={0,2}/g;
// Full-width forms and mathematical alphanumerics: used to dodge keyword filters while reading the same to an LLM.
const STYLED = /[\uFF01-\uFF5E]|[\u{1D400}-\u{1D7FF}]/u;
// In .svg files the <svg> root is expected; flag only active content.
const SVG_ACTIVE = /<\s*(script|foreignObject|iframe|use\b[^>]*href\s*=\s*["']https?:)|<[^>]+\son[a-z]+\s*=\s*["']/i;
const NAMESPACE_HOSTS = new Set(['www.w3.org', 'purl.org', 'xmlns.com', 'schema.org', 'ns.adobe.com']);
const LATIN = /\p{Script=Latin}/u;
const LOOKALIKE = /[\p{Script=Cyrillic}\p{Script=Greek}\p{Script=Armenian}\p{Script=Cherokee}]/u;

export const stripInvisible = (s: string) => s.replace(new RegExp(INVISIBLE.source, 'gu'), '').replace(new RegExp(TAG_CHARS.source, 'gu'), '');
export const normalise = (s: string) => stripInvisible(s.normalize('NFKC')).replace(/\s+/g, ' ').trim();
export const lineHash = (s: string) => createHash('sha256').update(normalise(s)).digest('hex').slice(0, 16);

const cp = (ch: string) => 'U+' + ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0');
const excerptOf = (s: string) => {
  const e = normalise(s);
  return e.length > 120 ? e.slice(0, 117) + '...' : e;
};

function checkUrl(raw: string): { level: Level; msg: string } | null {
  let u: URL;
  try { u = new URL(raw.replace(/[.,;:!?]+$/, '')); } catch { return { level: 'error', msg: `unparseable URL ${raw}` }; }
  const host = u.hostname.toLowerCase();
  if (u.username || u.password) return { level: 'error', msg: `URL with userinfo (host spoofing): ${raw}` };
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[')) return { level: 'error', msg: `URL to an IP literal: ${raw}` };
  if (host.split('.').some((l) => l.startsWith('xn--'))) return { level: 'error', msg: `punycode (IDN) host, possible homograph: ${host}` };
  if (SHORTENERS.has(host)) return { level: 'error', msg: `URL shortener hides the destination: ${raw}` };
  if (u.port && !(host === 'localhost' || host === '127.0.0.1')) return { level: 'warning', msg: `URL with explicit port: ${raw}` };
  if (u.protocol === 'http:' && !NAMESPACE_HOSTS.has(host) && host !== 'localhost' && host !== '127.0.0.1') return { level: 'warning', msg: `plain http URL: ${raw}` };
  return null;
}

function decodesToText(b64: string): boolean {
  try {
    const buf = Buffer.from(b64, 'base64');
    if (buf.length < 60) return false;
    let printable = 0;
    for (const b of buf) if ((b >= 0x20 && b < 0x7f) || b === 0x0a || b === 0x0d || b === 0x09) printable++;
    return printable / buf.length > 0.9;
  } catch { return false; }
}

export interface ScanOptions { hardOnly?: boolean }

/** Scan one text file. `file` is the repo-relative path used in findings and allowlist entries. */
export function scanText(file: string, text: string, opts: ScanOptions = {}): Finding[] {
  const out: Finding[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((raw, i) => {
    let line = i === 0 ? raw.replace(/^\uFEFF/, '') : raw;
    // Expressive Code stores copy-button text in data-code="..." with U+007F as its newline separator. Exempt only that.
    if (file.endsWith('.html')) line = line.replace(/data-code="[^"]*"/g, (m) => m.replace(/\u007F/g, ' '));
    const hash = lineHash(line);
    const add = (rule: string, level: Level, msg: string) => out.push({ file, line: i + 1, rule, level, msg, hash, excerpt: excerptOf(line) });

    const inv = line.match(INVISIBLE);
    if (inv) add('INJ_INVISIBLE', 'error', `invisible/bidi character ${cp(inv[0])}; write it as an escape (\`${cp(inv[0])}\`) if it is being discussed`);
    const tag = line.match(TAG_CHARS);
    if (tag) {
      const hidden = [...line].filter((c) => TAG_CHARS.test(c)).map((c) => String.fromCodePoint(c.codePointAt(0)! - 0xe0000)).join('');
      add('INJ_TAG_CHARS', 'error', `Unicode tag characters (ASCII smuggling); hidden text decodes to: "${hidden.slice(0, 80)}"`);
    }
    const ctl = line.match(CONTROL);
    if (ctl) add('INJ_CONTROL', 'error', `control character ${cp(ctl[0])}`);
    if (opts.hardOnly) return;

    if (PRIVATE_USE.test(line)) add('INJ_PRIVATE_USE', 'error', 'private-use code point (renders as nothing or a glyph with no defined meaning)');
    const n = normalise(line);
    if (STYLED.test(line)) add('INJ_CONFUSABLE', 'error', 'full-width or mathematical-alphanumeric characters (keyword-filter evasion)');
    for (const word of n.split(/[^\p{L}\p{M}]+/u)) {
      if (word.length > 2 && LATIN.test(word) && LOOKALIKE.test(word)) { add('INJ_CONFUSABLE', 'error', `mixed-script word "${word}" (homoglyph)`); break; }
    }
    const seen = new Set<string>();
    for (const r of TEXT_RULES) {
      if (seen.has(r.id)) continue;
      if (r.id === 'INJ_HIDDEN_HTML' && file.endsWith('.svg')) {
        if (SVG_ACTIVE.test(line)) { add(r.id, r.level, 'active content in SVG'); seen.add(r.id); }
        continue;
      }
      if (r.re.test(n) || (r.id === 'INJ_HIDDEN_HTML' && r.re.test(line))) { add(r.id, r.level, r.msg); seen.add(r.id); }
    }
    for (const m of n.matchAll(BASE64_RUN)) {
      if (decodesToText(m[0])) { add('INJ_ENCODED', 'error', `base64 run that decodes to readable text (${m[0].length} chars)`); break; }
    }
    for (const m of line.matchAll(URL_RE)) {
      const r = checkUrl(m[0]);
      if (r) add('INJ_URL', r.level, r.msg);
    }
  });
  return out;
}

const key = (f: { file: string; rule: string; hash: string }) => `${f.file}\0${f.rule}\0${f.hash}`;

/** Split findings into reported and allowlisted; also return allowlist entries that no longer match anything. */
export function applyAllowlist(findings: Finding[], allow: AllowEntry[]) {
  const byKey = new Map(allow.map((a) => [key(a), a]));
  const used = new Set<string>();
  const reported: Finding[] = [];
  const suppressed: Finding[] = [];
  for (const f of findings) {
    const k = key(f);
    if (!HARD_RULES.has(f.rule) && byKey.has(k)) { suppressed.push(f); used.add(k); } else reported.push(f);
  }
  const stale = allow.filter((a) => !used.has(key(a)));
  const invalid = allow.filter((a) => HARD_RULES.has(a.rule) || !a.reason || !String(a.reason).trim());
  return { reported, suppressed, stale, invalid };
}
