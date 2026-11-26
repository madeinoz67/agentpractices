// author: Stephen Eaton
import { describe, expect, test } from 'bun:test';
import { loadTaxonomy } from '../scripts/lib/taxonomy';
import { loadPractices, validatePractices, type Practice } from '../scripts/lib/practices';

const t = loadTaxonomy('taxonomy');
const base: Practice = {
  id: 'BP-0100', title: 'T', description: 'D', domain: 'D.SWE.CLI', type: 'guideline',
  roles: ['implementer'], stage: ['build'], status: 'draft', version: '1.0.0', updated: '2026-11-24',
  reviewed: '2026-11-24', review_by: '2027-05-24',
  related: [], superseded_by: null, sources: [], file: 'x.md', slug: 'x', body: '## Rules\n1. **MUST** x',
};
const p = (o: Partial<Practice>): Practice => ({ ...base, ...o });
const TODAY = '2026-11-25';
const codes = (ps: Practice[], tax = t, checkPath = false) => validatePractices(ps, tax, { checkPath, today: TODAY }).map((i) => i.code);

describe('loadPractices', () => {
  test('loads only files with an id and derives slug', () => {
    const ps = loadPractices('tests/fixtures/docs');
    expect(ps.map((x) => x.id)).toEqual(['BP-9001']);
    expect(ps[0].slug).toBe('software-engineering/cli/sample');
    expect(ps[0].updated).toBe('2026-11-24');
    expect(ps[0].reviewed).toBe('2026-11-24');
    expect(ps[0].review_by).toBe('2027-05-24');
  });
});

describe('validatePractices', () => {
  test('valid practice has no issues', () => expect(codes([base])).toEqual([]));
  test('unknown domain', () => expect(codes([p({ domain: 'D.SWE.XYZ' })])).toContain('E_DOMAIN'));
  test('deprecated domain', () => {
    const t2 = loadTaxonomy('taxonomy');
    const cli = t2.byId.get('D.SWE.CLI')!;
    cli.status = 'deprecated'; cli.replaced_by = 'D.SWE.API';
    expect(codes([base], t2)).toContain('E_DOMAIN_DEPREC');
  });
  test('duplicate id', () => expect(codes([base, p({ slug: 'y', file: 'y.md' })])).toContain('E_DUPID'));
  test('bad id format', () => expect(codes([p({ id: 'BP-1' })])).toContain('E_IDFMT'));
  test('unresolved related', () => expect(codes([p({ related: ['BP-0999'] })])).toContain('E_REL'));
  test('deprecated without superseded_by', () => expect(codes([p({ status: 'deprecated' })])).toContain('E_SUPER'));
  test('deprecated with unknown superseded_by', () => expect(codes([p({ status: 'deprecated', superseded_by: 'BP-0999' })])).toContain('E_SUPER'));
  test('bad facet value', () => expect(codes([p({ roles: ['wizard'] })])).toContain('E_FACET'));
  test('bad type facet', () => expect(codes([p({ type: 'essay' })])).toContain('E_FACET'));
  test('missing description', () => expect(codes([p({ description: '' })])).toContain('E_REQ'));
  test('missing Rules heading', () => expect(codes([p({ body: '## Intro\ntext' })])).toContain('E_RULES'));
  test('Rules section with no normative language', () =>
    expect(codes([p({ body: '## Rules\n1. always do the thing' })])).toContain('E_NORMATIVE'));
  test('bold MUST satisfies the normative rule', () =>
    expect(codes([p({ body: '## Rules\n1. **MUST** do the thing' })])).toEqual([]));
  test('source without a url', () =>
    expect(codes([p({ sources: [{ title: 'x' }] as any })])).toContain('E_SOURCE'));
  test('source with a non-http url', () =>
    expect(codes([p({ sources: [{ title: 'x', url: 'ftp://x' }] })])).toContain('E_SOURCE'));
  test('https source passes', () =>
    expect(codes([p({ sources: [{ title: 'x', url: 'https://x.test' }] })])).toEqual([]));
});

describe('path follows taxonomy', () => {
  test('practice outside its domain folder is an error', () =>
    expect(codes([p({ slug: 'operations/evaluation/x' })], t, true)).toContain('E_PATH'));
  test('practice inside its domain folder passes', () =>
    expect(codes([p({ slug: 'software-engineering/cli-design/x' })], t, true)).toEqual([]));
});

import { findUnidentified } from '../scripts/lib/practices';
describe('review fixes', () => {
  test('markdown under a domain folder without an id is an error; root pages are exempt', () => {
    const issues = findUnidentified('tests/fixtures/noid', t);
    expect(issues.map((i) => i.code)).toEqual(['E_NOID']);
    expect(issues[0].msg).toContain('forgot.md');
  });
  test('filename must be lower-case kebab so catalog urls match Starlight urls', () =>
    expect(codes([p({ slug: 'software-engineering/cli-design/My Practice' })])).toContain('E_SLUG'));
});

import { seeAlso } from '../scripts/lib/practices';
describe('seeAlso', () => {
  const a = p({ id: 'BP-0100', slug: 'x/a', title: 'A', related: ['BP-0102', 'BP-0101'] });
  const b = p({ id: 'BP-0101', slug: 'x/b', title: 'B', related: [] });
  const c = p({ id: 'BP-0102', slug: 'x/c', title: 'C', related: ['BP-0100'] });
  test('lists related practices in the order given, with title and slug', () =>
    expect(seeAlso(a, [a, b, c])).toEqual([{ id: 'BP-0102', title: 'C', slug: 'x/c' }, { id: 'BP-0101', title: 'B', slug: 'x/b' }]));
  test('adds practices that point back (reverse links) after the declared ones, without duplicates', () =>
    expect(seeAlso(b, [a, b, c]).map((x) => x.id)).toEqual(['BP-0100']));
  test('unknown related IDs are skipped', () =>
    expect(seeAlso(p({ id: 'BP-0103', related: ['BP-0999'] }), [a]).map((x) => x.id)).toEqual([]));
  test('never lists itself', () =>
    expect(seeAlso(p({ id: 'BP-0104', related: ['BP-0104'] }), [p({ id: 'BP-0104' })])).toEqual([]));
});

describe('review dates', () => {
  test('missing reviewed', () => expect(codes([p({ reviewed: '' })])).toContain('E_REQ'));
  test('missing review_by', () => expect(codes([p({ review_by: '' })])).toContain('E_REQ'));
  test('review_by must be after reviewed', () => expect(codes([p({ review_by: '2026-11-24' })])).toContain('E_REVIEW'));
  test('reviewed cannot be in the future', () =>
    expect(codes([p({ updated: '2026-11-24', reviewed: '2026-12-01', review_by: '2027-03-01' })])).toContain('E_REVIEW'));
  test('review interval at most 12 months', () => expect(codes([p({ review_by: '2027-12-01' })])).toContain('E_REVIEW'));
  test('changing a page counts as reviewing it', () =>
    expect(codes([p({ updated: '2026-11-25', reviewed: '2026-11-24' })])).toContain('E_REVIEW'));
  test('overdue review is a warning, not an error', () => {
    const issues = validatePractices([p({ reviewed: '2026-01-10', updated: '2026-01-10', review_by: '2026-07-10' })], t, { today: TODAY });
    expect(issues.map((i) => [i.level, i.code])).toEqual([['warn', 'W_REVIEW_DUE']]);
  });
});

import { sourceLinks } from '../scripts/lib/practices';
describe('sourceLinks', () => {
  test('returns title, url and host for each http(s) source, in order', () =>
    expect(sourceLinks([{ title: 'NIST AI RMF', url: 'https://www.nist.gov/itl/ai-risk-management-framework' }, { title: 'Paper', url: 'http://arxiv.org/abs/1' }]))
      .toEqual([{ title: 'NIST AI RMF', url: 'https://www.nist.gov/itl/ai-risk-management-framework', host: 'nist.gov' }, { title: 'Paper', url: 'http://arxiv.org/abs/1', host: 'arxiv.org' }]));
  test('drops anything that is not an http(s) URL', () =>
    expect(sourceLinks([{ title: 'bad', url: 'javascript:alert(1)' }, { title: 'rel', url: '/x' }, { title: 'ok', url: 'https://example.org' }]).map((s) => s.title)).toEqual(['ok']));
  test('handles missing sources', () => expect(sourceLinks(undefined)).toEqual([]));
});
