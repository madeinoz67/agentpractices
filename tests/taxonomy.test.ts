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
  test('has 7 top concepts and 36 narrower', () => {
    expect(t.concepts.filter((x) => !x.broader).length).toBe(7);
    expect(t.concepts.filter((x) => x.broader).length).toBe(36);
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

import { slugify, dirOf } from '../scripts/lib/taxonomy';
describe('dirOf', () => {
  test('slugify strips & and punctuation', () => expect(slugify('Security & Safety')).toBe('security-safety'));
  test('dirOf joins slugified labels root-first', () => {
    expect(dirOf(loadTaxonomy('taxonomy'), 'D.SWE.CLI')).toBe('software-engineering/cli-design');
  });
});

test('D.DOC.HUM sits under Documentation & Writing', () => {
  const tx = loadTaxonomy('taxonomy');
  expect(pathOf(tx, 'D.DOC.HUM').map((x) => x.label)).toEqual(['Documentation & Writing', 'Human-Readable Docs']);
  expect(tx.version).toBe('0.10.0');
});

test('D.KNO.KG sits under Knowledge Modelling', () => {
  const tx = loadTaxonomy('taxonomy');
  expect(pathOf(tx, 'D.KNO.KG').map((x) => x.label)).toEqual(['Knowledge Modelling', 'Knowledge Graphs']);
});

test('D.SEC.DEF and D.OPS.GW exist under their domains', () => {
  const tx = loadTaxonomy('taxonomy');
  expect(pathOf(tx, 'D.SEC.DEF').map((x) => x.label)).toEqual(['Security & Safety', 'Defence Against Hostile Agents']);
  expect(pathOf(tx, 'D.OPS.GW').map((x) => x.label)).toEqual(['Operations', 'Model Gateways & Routing']);
});

test('D.SWE.QLT exists under Software Engineering', () => {
  const tx = loadTaxonomy('taxonomy');
  expect(pathOf(tx, 'D.SWE.QLT').map((x) => x.label)).toEqual(['Software Engineering', 'Code Quality & Comments']);
});

test('D.SWE.UI exists under Software Engineering', () => {
  const tx = loadTaxonomy('taxonomy');
  expect(pathOf(tx, 'D.SWE.UI').map((x) => x.label)).toEqual(['Software Engineering', 'UI & Design Systems']);
});

test('D.OPS.BDR exists under Operations', () => {
  const tx = loadTaxonomy('taxonomy');
  expect(pathOf(tx, 'D.OPS.BDR').map((x) => x.label)).toEqual(['Operations', 'Backup & Recovery']);
});

test('D.SEC.DAT exists under Security & Safety', () => {
  const tx = loadTaxonomy('taxonomy');
  expect(pathOf(tx, 'D.SEC.DAT').map((x) => x.label)).toEqual(['Security & Safety', 'Data Sovereignty & Privacy']);
});

test('D.SEC.OT exists under Security & Safety', () => {
  const tx = loadTaxonomy('taxonomy');
  expect(pathOf(tx, 'D.SEC.OT').map((x) => x.label)).toEqual(['Security & Safety', 'OT & Industrial Systems']);
});

test('D.SWE.REL exists under Software Engineering', () => {
  const tx = loadTaxonomy('taxonomy');
  expect(pathOf(tx, 'D.SWE.REL').map((x) => x.label)).toEqual(['Software Engineering', 'Release Engineering']);
});

test('D.SEC.FRM exists under Security & Safety', () => {
  const tx = loadTaxonomy('taxonomy');
  expect(pathOf(tx, 'D.SEC.FRM').map((x) => x.label)).toEqual(['Security & Safety', 'AI Security Frameworks & Threat Modelling']);
});

test('D.SEC.CYD exists under Security & Safety', () => {
  const tx = loadTaxonomy('taxonomy');
  expect(pathOf(tx, 'D.SEC.CYD').map((x) => x.label)).toEqual(['Security & Safety', 'AI-Enabled Cyber Defence']);
});

test('D.SEC.INF exists under Security & Safety', () => {
  const tx = loadTaxonomy('taxonomy');
  expect(pathOf(tx, 'D.SEC.INF').map((x) => x.label)).toEqual(['Security & Safety', 'Information Integrity & Influence Operations']);
});
