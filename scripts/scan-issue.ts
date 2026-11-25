// author: Stephen Eaton
// Scan an issue/PR/comment body (from env, never interpolated into the shell) with the deterministic injection rules.
// Writes `count` and `rules` to GITHUB_OUTPUT. Never echoes the untrusted text back. Always exits 0; the workflow decides.
// Usage: SCAN_TITLE=... SCAN_BODY=... bun scripts/scan-issue.ts
import { appendFileSync } from 'node:fs';
import { scanText } from './lib/injection';

export const DEPENDABOT = 'dependabot[bot]';
const BADGE = /^.*\]\(https:\/\/dependabot-badges\.githubapp\.com\/badges\/compatibility_score\?[^)\s]*\).*$/gm;

/** Neutralise Dependabot's three known body artefacts, and nothing else: the zero-width space it puts after `@` in
 *  release notes (to stop mentions), its compatibility-score badge, and the renderer's literal
 *  `<!-- raw HTML omitted -->` placeholder. Upstream release-note text is still scanned. */
export function normaliseDependabot(body: string): string {
  return body.replace(/@\u200B/g, '@').replace(BADGE, '').replace(/<!-- raw HTML omitted -->/g, '');
}

const author = process.env.SCAN_AUTHOR ?? '';
const body = author === DEPENDABOT ? normaliseDependabot(process.env.SCAN_BODY ?? '') : process.env.SCAN_BODY ?? '';
const text = [process.env.SCAN_TITLE ?? '', body].join('\n');
const findings = scanText('issue.md', text).filter((f) => f.level === 'error');
const rules = [...new Set(findings.map((f) => f.rule))].sort();
console.log(`issue scan: ${findings.length} finding(s)${rules.length ? `: ${rules.join(', ')}` : ''}`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `count=${findings.length}\nrules=${rules.join(',')}\n`);
