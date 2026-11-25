// author: Stephen Eaton
import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const wf = parse(readFileSync('.github/workflows/deploy.yml', 'utf8'));
// A superseded build must not deploy (#27): its checkout is older than the build that replaced it.
test('a superseded build is cancelled before it can deploy', () => {
  expect(wf.concurrency).toBeUndefined();
  expect(wf.jobs.build.concurrency).toEqual({ group: 'pages-build-${{ github.ref }}', 'cancel-in-progress': true });
  // The build keeps its own group: cancelling a build must never cancel a deploy in progress.
  expect(wf.jobs.build.concurrency.group).not.toBe('pages');
  expect(wf.jobs.deploy.concurrency.group).toBe('pages');
  expect(wf.jobs.deploy.concurrency['cancel-in-progress']).toBe(false);
});

test('build gets GITHUB_TOKEN for the star count, and a daily schedule refreshes it', () => {
  const build = wf.jobs.build.steps.find((s: any) => s.run === 'bun run build');
  expect(build.env.GITHUB_TOKEN).toBe('${{ secrets.GITHUB_TOKEN }}');
  expect(wf.on.schedule?.[0]?.cron).toBeTruthy();
});

test('deploy is gated by the prompt-injection scan of source and built output', () => {
  const steps = wf.jobs.build.steps.map((s: any) => s.run ?? s.uses);
  const scan = steps.indexOf('bun run security');
  expect(scan).toBeGreaterThan(steps.indexOf('bun run build'));
  expect(scan).toBeLessThan(steps.findIndex((s: string) => s?.startsWith('actions/upload-pages-artifact')));
  expect(JSON.parse(readFileSync('package.json', 'utf8')).scripts.security).toContain('--dist dist');
});

test('least-privilege tokens and SHA-pinned actions in every workflow', () => {
  for (const name of ['deploy.yml', 'security.yml', 'issue-scan.yml']) {
    const w = parse(readFileSync(`.github/workflows/${name}`, 'utf8'));
    expect(w.permissions).toEqual({});
    for (const [id, job] of Object.entries<any>(w.jobs)) {
      expect(job.permissions, `${name}:${id} permissions`).toBeDefined();
      for (const s of job.steps ?? []) if (s.uses) expect(s.uses, `${name}:${id}`).toMatch(/@[0-9a-f]{40}$/);
    }
  }
  expect(wf.jobs.build.permissions).toEqual({ contents: 'read' });
});
