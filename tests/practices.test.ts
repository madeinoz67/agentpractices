// author: Stephen Eaton
import { describe, expect, test } from 'bun:test';
import { loadTaxonomy } from '../scripts/lib/taxonomy';
import { loadPractices, validatePractices, type Practice } from '../scripts/lib/practices';

const t = loadTaxonomy('taxonomy');
const base: Practice = {
  id: 'BP-0100', title: 'T', description: 'D', domain: 'D.SWE.CLI', type: 'guideline',
  roles: ['implementer'], stage: ['build'], status: 'draft', version: '1.0.0', updated: '2026-11-24',
  related: [], superseded_by: null, sources: [], file: 'x.md', slug: 'x', body: '## Rules\n1. MUST x',
};
const p = (o: Partial<Practice>): Practice => ({ ...base, ...o });
const codes = (ps: Practice[], tax = t, checkPath = false) => validatePractices(ps, tax, { checkPath }).map((i) => i.code);

describe('loadPractices', () => {
  test('loads only files with an id and derives slug', () => {
    const ps = loadPractices('tests/fixtures/docs');
    expect(ps.map((x) => x.id)).toEqual(['BP-9001']);
    expect(ps[0].slug).toBe('software-engineering/cli/sample');
    expect(ps[0].updated).toBe('2026-11-24');
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
