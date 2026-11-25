// author: Stephen Eaton
// Scan an issue/PR/comment body (from env, never interpolated into the shell) with the deterministic injection rules.
// Writes `count` and `rules` to GITHUB_OUTPUT. Never echoes the untrusted text back. Always exits 0; the workflow decides.
// Usage: SCAN_TITLE=... SCAN_BODY=... bun scripts/scan-issue.ts
import { appendFileSync } from 'node:fs';
import { scanText } from './lib/injection';

const text = [process.env.SCAN_TITLE ?? '', process.env.SCAN_BODY ?? ''].join('\n');
const findings = scanText('issue.md', text).filter((f) => f.level === 'error');
const rules = [...new Set(findings.map((f) => f.rule))].sort();
console.log(`issue scan: ${findings.length} finding(s)${rules.length ? `: ${rules.join(', ')}` : ''}`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `count=${findings.length}\nrules=${rules.join(',')}\n`);
