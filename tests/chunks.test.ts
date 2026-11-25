// author: Stephen Eaton
import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { chunkMarkdown } from '../scripts/lib/chunks';

test('paragraph chunks carry their starting line; fences stay whole; tiny chunks are dropped', () => {
  const md = ['# Title', '', 'First paragraph has enough words to count.', 'Still first.', '', '```sh', 'echo one', '', 'echo two after blank', '```', '', '- x'].join('\n');
  const c = chunkMarkdown(md);
  expect(c.map((x) => x.line)).toEqual([3, 6]);
  expect(c[1].text).toContain('echo two after blank');
});

test('long paragraphs split on line boundaries under maxChars', () => {
  const md = Array.from({ length: 40 }, (_, i) => `line ${i} with some filler text to make it long`).join('\n');
  const c = chunkMarkdown(md, { maxChars: 400 });
  expect(c.length).toBeGreaterThan(3);
  expect(c.every((x) => x.text.length <= 450)).toBe(true);
  expect(c[1].line).toBeGreaterThan(1);
});

test('classifier model is pinned to a commit, and its package is isolated from the site build', () => {
  const src = readFileSync('security/classifier/classify.ts', 'utf8');
  expect(src).toMatch(/REVISION = '[0-9a-f]{40}'/);
  const root = JSON.parse(readFileSync('package.json', 'utf8'));
  expect({ ...root.dependencies, ...root.devDependencies }['@huggingface/transformers']).toBeUndefined();
});

test('issue scan never interpolates untrusted event fields into run scripts', () => {
  const wf = readFileSync('.github/workflows/issue-scan.yml', 'utf8');
  const w = parse(wf);
  expect(w.on.pull_request_target).toBeUndefined();
  expect(w.on.pull_request.types).toEqual(expect.arrayContaining(['opened', 'edited', 'reopened', 'synchronize']));
  for (const job of Object.values<any>(w.jobs))
    for (const s of job.steps.filter((x: any) => String(x.uses).startsWith('actions/checkout@')))
      expect(s.with?.ref).toBe('${{ github.event.repository.default_branch }}');
  for (const job of Object.values<any>(w.jobs))
    for (const run of job.steps.filter((s: any) => s.run).map((s: any) => s.run))
      expect(run).not.toMatch(/\$\{\{\s*github\.event\.(issue|comment|pull_request)\.(title|body)/);
});
