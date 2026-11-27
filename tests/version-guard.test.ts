// author: Stephen Eaton
import { describe, expect, test } from 'bun:test';
import type { Practice } from '../scripts/lib/practices';
import { compareSemver, contentHash, guardVersions } from '../scripts/lib/version-guard';

const base: Practice = {
  id: 'BP-0100', title: 'T', description: 'D', domain: 'D.SWE.CLI', type: 'guideline',
  roles: ['implementer'], stage: ['build'], status: 'draft', version: '1.0.0', updated: '2026-11-24',
  reviewed: '2026-11-24', review_by: '2027-05-24', related: [], superseded_by: null,
  sources: [{ title: 'S', url: 'https://example.org', note: 'N' }], file: 'x.md', slug: 'x', body: '## Rules\n1. **MUST** x\n',
};
const p = (o: Partial<Practice>): Practice => ({ ...base, ...o });
const entry = (q: Practice, over: Record<string, unknown> = {}) => ({ id: q.id, version: q.version, content_hash: contentHash(q), ...over });
const codes = (local: Practice[], published: object[]) => guardVersions(local, published).map((i) => i.code);

describe('contentHash', () => {
  test('is a sha256 string', () => expect(contentHash(base)).toMatch(/^sha256:[0-9a-f]{64}$/));
  test('ignores version and dates', () =>
    expect(contentHash(p({ version: '9.9.9', updated: '2027-01-01', reviewed: '2027-01-01', review_by: '2027-06-01' }))).toBe(contentHash(base)));
  test('ignores line-ending and trailing-whitespace differences', () =>
    expect(contentHash(p({ body: '## Rules  \r\n1. **MUST** x\r\n' }))).toBe(contentHash(base)));
  test('changes when the body changes', () => expect(contentHash(p({ body: '## Rules\n1. **MUST** y\n' }))).not.toBe(contentHash(base)));
  test('changes when sources change', () =>
    expect(contentHash(p({ sources: [{ title: 'S', url: 'https://example.com', note: 'N' }] }))).not.toBe(contentHash(base)));
  test('changes when a source note changes', () =>
    expect(contentHash(p({ sources: [{ title: 'S', url: 'https://example.org', note: 'Another reason' }] }))).not.toBe(contentHash(base)));
  test('changes when related changes', () => expect(contentHash(p({ related: ['BP-0001'] }))).not.toBe(contentHash(base)));
});

describe('compareSemver', () => {
  test('orders numerically, not lexically', () => expect(compareSemver('1.10.0', '1.9.0')).toBeGreaterThan(0));
  test('equal', () => expect(compareSemver('1.0.1', '1.0.1')).toBe(0));
  test('lower', () => expect(compareSemver('1.0.0', '1.0.1')).toBeLessThan(0));
});

describe('guardVersions', () => {
  test('unchanged content, same version: ok', () => expect(codes([base], [entry(base)])).toEqual([]));
  test('changed content with a bump: ok', () => expect(codes([p({ body: 'new', version: '1.0.1' })], [entry(base)])).toEqual([]));
  test('changed content without a bump: error', () => expect(codes([p({ body: 'new' })], [entry(base)])).toEqual(['E_VERSION_NOT_BUMPED']));
  test('version went backwards: error', () => expect(codes([p({ version: '0.9.0' })], [entry(base)])).toEqual(['E_VERSION_BACKWARD']));
  test('published practice missing locally: error', () => expect(codes([], [entry(base)])).toEqual(['E_PRACTICE_REMOVED']));
  test('new practice not yet published: ok', () => expect(codes([base, p({ id: 'BP-0101' })], [entry(base)])).toEqual([]));
  test('published entry without content_hash is skipped (first deploy)', () =>
    expect(codes([p({ body: 'new' })], [{ id: base.id, version: '1.0.0' }])).toEqual([]));
});
