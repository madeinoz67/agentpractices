// author: Stephen Eaton
// #27: catalog.json's `generated` must describe the content (the source commit), not the build.
import { describe, expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sourceCommitTime } from '../scripts/lib/generated';

const commitTime = new Date(execFileSync('git', ['log', '-1', '--format=%cI'], { encoding: 'utf8' }).trim()).toISOString();

describe('sourceCommitTime', () => {
  test('normalises the commit time to UTC', () => {
    expect(sourceCommitTime(() => '2026-11-20T19:30:43+08:00\n')).toBe('2026-11-20T11:30:43.000Z');
  });

  test('fails loudly when git has no usable time, instead of falling back to the clock', () => {
    expect(() => sourceCommitTime(() => '')).toThrow();
    expect(() => sourceCommitTime(() => 'not a date')).toThrow();
  });
});

test('catalog.json generated is the source commit time, not the build time', () => {
  const out = mkdtempSync(join(tmpdir(), 'postbuild-'));
  try {
    execFileSync('bun', ['scripts/postbuild.ts', out], { encoding: 'utf8' });
    expect(JSON.parse(readFileSync(join(out, 'catalog.json'), 'utf8')).generated).toBe(commitTime);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
