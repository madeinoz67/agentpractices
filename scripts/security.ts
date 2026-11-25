// author: Stephen Eaton
// Scan agent-facing content for prompt injection and hidden content. Exit 1 on any unallowlisted error.
// Usage: bun scripts/security.ts [--dist dist] [--baseline]
//   --dist <dir>  also scan built output (hard rules only: invisible, tag and control characters)
//   --baseline    print allowlist YAML for current heuristic findings (review every entry before committing it)
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'yaml';
import { applyAllowlist, HARD_RULES, scanText, type AllowEntry, type Finding } from './lib/injection';

const ALLOWLIST = 'security/injection-allowlist.yaml';
// Everything an agent reads from the site, or that becomes part of it.
const SOURCE_ROOTS = ['src/content/docs', 'taxonomy', '.github/ISSUE_TEMPLATE', 'AGENTS.md', 'README.md', 'CHANGELOG.md', 'public'];
const SOURCE_EXT = /\.(md|mdx|ya?ml|json|txt|svg)$/i;
const DIST_EXT = /\.(html|md|txt|json|jsonld|xml|svg)$/i;

const args = process.argv.slice(2);
const distIdx = args.indexOf('--dist');
const dist = distIdx >= 0 ? args[distIdx + 1] : undefined;
const baseline = args.includes('--baseline');

const walk = (p: string, ext: RegExp): string[] =>
  !existsSync(p) ? [] : statSync(p).isDirectory() ? readdirSync(p).sort().flatMap((n) => walk(join(p, n), ext)) : ext.test(p) ? [p] : [];

const rel = (p: string) => relative('.', p).replace(/\\/g, '/');
let findings: Finding[] = [];
let files = 0;
for (const f of SOURCE_ROOTS.flatMap((r) => walk(r, SOURCE_EXT))) { findings.push(...scanText(rel(f), readFileSync(f, 'utf8'))); files++; }
// Repo code and workflows: hard rules only (Trojan Source: bidi and invisible characters in code).
const CODE_ROOTS = ['scripts', 'tests', 'src/plugins', 'src/components', '.github/workflows', 'astro.config.mjs', 'package.json'];
for (const f of CODE_ROOTS.flatMap((r) => walk(r, /\.(ts|mjs|js|astro|ya?ml|json)$/i))) { findings.push(...scanText(rel(f), readFileSync(f, 'utf8'), { hardOnly: true })); files++; }
if (dist) for (const f of walk(dist, DIST_EXT)) { findings.push(...scanText(rel(f), readFileSync(f, 'utf8'), { hardOnly: true })); files++; }

if (baseline) {
  const rows = findings.filter((f) => f.level === 'error' && !HARD_RULES.has(f.rule));
  console.log('# Review each entry: keep only quoted attack examples and legitimate references.');
  for (const f of rows) console.log(`- { file: ${f.file}, rule: ${f.rule}, hash: ${f.hash}, reason: "TODO" }  # L${f.line}: ${f.excerpt.replace(/[#\n]/g, ' ')}`);
  process.exit(0);
}

const allow: AllowEntry[] = existsSync(ALLOWLIST) ? (parse(readFileSync(ALLOWLIST, 'utf8')) ?? []) : [];
const { reported, suppressed, stale, invalid } = applyAllowlist(findings, allow);
const gha = !!process.env.GITHUB_ACTIONS;
const esc = (s: string) => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');

for (const f of reported) {
  const text = `${f.rule} ${f.msg} [hash ${f.hash}]`;
  if (gha) console.log(`::${f.level} file=${f.file},line=${f.line},title=${f.rule}::${esc(text)}`);
  console[f.level === 'error' ? 'error' : 'warn'](`${f.level.toUpperCase()} ${f.file}:${f.line} ${text}\n    > ${f.excerpt}`);
}
for (const a of invalid) console.error(`ERROR allowlist entry ${a.file} ${a.rule} ${a.hash}: ${HARD_RULES.has(a.rule) ? 'hard rules cannot be allowlisted' : 'needs a reason'}`);
for (const a of stale) console.warn(`WARNING stale allowlist entry (line changed or removed): ${a.file} ${a.rule} ${a.hash}`);

const errors = reported.filter((f) => f.level === 'error').length + invalid.length;
const warnings = reported.length - (errors - invalid.length) + stale.length;
const summary = `security: scanned ${files} files: ${errors} error(s), ${warnings} warning(s), ${suppressed.length} allowlisted`;
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = reported.map((f) => `| ${f.level} | \`${f.rule}\` | \`${f.file}:${f.line}\` | ${f.msg.replace(/\\/g, '\\\\').replace(/\|/g, '\\|')} |`).join('\n');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Prompt-injection scan\n\n${summary}\n\n${rows ? `| Level | Rule | Location | Finding |\n| --- | --- | --- | --- |\n${rows}\n` : ''}`);
}
process.exit(errors ? 1 : 0);
