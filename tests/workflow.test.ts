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

test('build gets GITHUB_TOKEN for the star count, and a daily schedule refreshes it', () => {
  const build = wf.jobs.build.steps.find((s: any) => s.run === 'bun run build');
  expect(build.env.GITHUB_TOKEN).toBe('${{ secrets.GITHUB_TOKEN }}');
  expect(wf.on.schedule?.[0]?.cron).toBeTruthy();
});
