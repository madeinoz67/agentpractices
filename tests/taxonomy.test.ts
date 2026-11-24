// author: Stephen Eaton
import { describe, expect, test } from 'bun:test';
import { loadTaxonomy, makeTaxonomy, validateTaxonomy, pathOf, type Concept } from '../scripts/lib/taxonomy';

const c = (id: string, broader?: string, extra: Partial<Concept> = {}): Concept => ({
  id, label: id, definition: `A thing that is ${id}.`, broader, status: 'active', ...extra,
});
const codes = (concepts: Concept[]) => validateTaxonomy(makeTaxonomy('0.0.1', concepts, {})).map((i) => i.code);

describe('repo taxonomy', () => {
  const t = loadTaxonomy('taxonomy');
  test('has no errors', () => {
    expect(validateTaxonomy(t).filter((i) => i.level === 'error')).toEqual([]);
  });
  test('has 7 top concepts and 23 narrower', () => {
    expect(t.concepts.filter((x) => !x.broader).length).toBe(7);
    expect(t.concepts.filter((x) => x.broader).length).toBe(23);
  });
  test('pathOf returns labels root-first', () => {
    expect(pathOf(t, 'D.SWE.CLI').map((x) => x.label)).toEqual(['Software Engineering', 'CLI Design']);
  });
  test('facets loaded with exact values', () => {
    expect(t.facets.type.map((f) => f.id)).toEqual(['guideline', 'pattern', 'anti-pattern', 'checklist', 'procedure', 'reference']);
    expect(t.facets.role.map((f) => f.id)).toEqual(['any', 'orchestrator', 'planner', 'implementer', 'reviewer', 'researcher']);
    expect(t.facets.stage.map((f) => f.id)).toEqual(['plan', 'build', 'verify', 'operate']);
  });
});

describe('validateTaxonomy', () => {
  test('orphan broader', () => expect(codes([c('D.AA'), c('D.AA.BB', 'D.ZZ')])).toContain('E_ORPHAN'));
  test('cycle', () => expect(codes([c('D.AA', 'D.BB'), c('D.BB', 'D.AA')])).toContain('E_CYCLE'));
  test('missing definition', () => expect(codes([c('D.AA', undefined, { definition: '' })])).toContain('E_NODEF'));
  test('duplicate id', () => expect(codes([c('D.AA'), c('D.AA')])).toContain('E_DUPID'));
  test('deprecated without replaced_by', () => expect(codes([c('D.AA'), c('D.BB', undefined, { status: 'deprecated' })])).toContain('E_DEPREC'));
  test('deprecated with unknown replaced_by', () => expect(codes([c('D.AA', undefined, { status: 'deprecated', replaced_by: 'D.QQ' })])).toContain('E_DEPREC'));
  test('single child warns', () => {
    const issues = validateTaxonomy(makeTaxonomy('0.0.1', [c('D.AA'), c('D.AA.BB', 'D.AA')], {}));
    expect(issues.find((i) => i.code === 'W_SINGLE')?.level).toBe('warn');
  });
  test('bad id format', () => expect(codes([c('d.lower')])).toContain('E_IDFMT'));
  test('clean taxonomy has no issues', () => expect(codes([c('D.AA'), c('D.AA.BB', 'D.AA'), c('D.AA.CC', 'D.AA')])).toEqual([]));
});
