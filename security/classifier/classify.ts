// author: Stephen Eaton
// Advisory ML layer: score Markdown chunks with a local prompt-injection classifier (ProtectAI DeBERTa v3, ONNX via transformers.js).
// Runs on the CI runner; no content leaves GitHub. The deterministic gate is scripts/security.ts — this catches phrasing its patterns miss.
// Usage: bun security/classifier/classify.ts [--strict] [--threshold 0.9] [--files-from list.txt] [files...]
//   with no files: scans src/content/docs and taxonomy. --strict exits 1 on any unallowlisted finding (default: annotate only).
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { chunkMarkdown } from '../../scripts/lib/chunks';
import { applyAllowlist, lineHash, type AllowEntry, type Finding } from '../../scripts/lib/injection';

export const MODEL = 'ProtectAI/deberta-v3-base-prompt-injection-v2';
export const REVISION = '90c9989b1a342275dd0d1a95aad283c04e075671'; // pin: a model swap upstream must be a reviewed change here
const RULE = 'ML_INJECTION';

const args = process.argv.slice(2);
const flag = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const strict = args.includes('--strict') ? (args.splice(args.indexOf('--strict'), 1), true) : false;
const threshold = Number(flag('--threshold') ?? 0.9);
const listFile = flag('--files-from');
const walk = (p: string): string[] => !existsSync(p) ? [] : statSync(p).isDirectory() ? readdirSync(p).sort().flatMap((n) => walk(join(p, n))) : /\.(mdx?|ya?ml)$/.test(p) ? [p] : [];
let files = listFile ? readFileSync(listFile, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean) : args;
if (!files.length && !listFile) files = ['src/content/docs', 'taxonomy'].flatMap(walk);
files = files.filter((f) => existsSync(f) && /\.(mdx?|ya?ml)$/.test(f));
if (!files.length) { console.log('classifier: no content files to scan'); process.exit(0); }

const { pipeline, env } = await import('@huggingface/transformers');
env.cacheDir = process.env.HF_CACHE_DIR ?? '.cache/hf';
env.allowLocalModels = false;
const clf = await pipeline('text-classification', MODEL, { revision: REVISION, dtype: 'fp32' });
const isInjection = (label: string) => /inject|malicious|unsafe|label_1/i.test(label);

const findings: Finding[] = [];
let chunks = 0;
for (const file of files) {
  for (const c of chunkMarkdown(readFileSync(file, 'utf8'))) {
    chunks++;
    const res = (await clf(c.text, { top_k: null })) as { label: string; score: number }[];
    const score = res.filter((r) => isInjection(r.label)).reduce((m, r) => Math.max(m, r.score), 0);
    if (score >= threshold) {
      findings.push({ file, line: c.line, rule: RULE, level: strict ? 'error' : 'warning', hash: lineHash(c.text),
        msg: `classifier score ${score.toFixed(3)} >= ${threshold}`, excerpt: c.text.replace(/\s+/g, ' ').slice(0, 120) });
    }
  }
}

const allowPath = 'security/injection-allowlist.yaml';
const allow: AllowEntry[] = existsSync(allowPath) ? (parse(readFileSync(allowPath, 'utf8')) ?? []) : [];
const { reported, suppressed } = applyAllowlist(findings, allow.filter((a) => a.rule === RULE));
for (const f of reported) {
  if (process.env.GITHUB_ACTIONS) console.log(`::${f.level} file=${f.file},line=${f.line},title=${RULE}::${f.msg} [hash ${f.hash}]`);
  console.log(`${f.level.toUpperCase()} ${f.file}:${f.line} ${RULE} ${f.msg} [hash ${f.hash}]\n    > ${f.excerpt}`);
}
const summary = `classifier (${MODEL}@${REVISION.slice(0, 7)}): ${files.length} files, ${chunks} chunks: ${reported.length} flagged, ${suppressed.length} allowlisted (threshold ${threshold}, ${strict ? 'strict' : 'advisory'})`;
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### ML injection classifier\n\n${summary}\n\n${reported.map((f) => `- \`${f.file}:${f.line}\` ${f.msg} — allowlist hash \`${f.hash}\``).join('\n')}\n`);
process.exit(strict && reported.length ? 1 : 0);
