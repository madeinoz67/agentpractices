// author: Stephen Eaton
import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const wf = parse(readFileSync('.github/workflows/deploy.yml', 'utf8'));
test('PR runs cannot cancel a pending deploy: concurrency lives on the deploy job only', () => {
  expect(wf.concurrency).toBeUndefined();
  expect(wf.jobs.deploy.concurrency.group).toBe('pages');
  expect(wf.jobs.deploy.concurrency['cancel-in-progress']).toBe(false);
});
