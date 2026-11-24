// author: Stephen Eaton
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { loadTaxonomy } from '../scripts/lib/taxonomy';

const t = loadTaxonomy('taxonomy');
const form = (f: string) => parse(readFileSync(`.github/ISSUE_TEMPLATE/${f}`, 'utf8'));
const field = (f: any, id: string) => f.body.find((b: any) => b.id === id);
const activeIds = t.concepts.filter((c) => c.status !== 'deprecated').map((c) => c.id);

describe('issue forms stay in step with the taxonomy', () => {
  test('practice proposal domain dropdown lists every active concept, as "ID — Label"', () => {
    const opts: string[] = field(form('propose-practice.yml'), 'domain').attributes.options;
    expect(opts.filter((o) => o.startsWith('D.')).map((o) => o.split(' — ')[0])).toEqual(activeIds);
    for (const o of opts.filter((o) => o.startsWith('D.'))) expect(o).toBe(`${o.split(' — ')[0]} — ${t.byId.get(o.split(' — ')[0])!.label}`);
    expect(opts.at(-1)).toBe('None fits — needs a taxonomy change');
  });
  test('facet dropdowns match facets.yaml', () => {
    const f = form('propose-practice.yml');
    expect(field(f, 'type').attributes.options).toEqual(t.facets.type.map((x) => x.id));
    expect(field(f, 'roles').attributes.options).toEqual(t.facets.role.map((x) => x.id));
    expect(field(f, 'stage').attributes.options).toEqual(t.facets.stage.map((x) => x.id));
  });
  test('taxonomy change form lists top-level domains as parents', () => {
    const opts: string[] = field(form('propose-taxonomy-change.yml'), 'parent').attributes.options;
    const tops = t.concepts.filter((c) => !c.broader && c.status !== 'deprecated').map((c) => `${c.id} — ${c.label}`);
    expect(opts).toEqual(['None (new top-level domain)', ...tops]);
  });
  test('every form parses and has name, description, labels and a body', () => {
    for (const f of ['propose-practice.yml', 'propose-taxonomy-change.yml', 'report-practice-problem.yml']) {
      const y = form(f);
      expect(y.name && y.description && y.labels?.length && y.body?.length).toBeTruthy();
    }
    expect(parse(readFileSync('.github/ISSUE_TEMPLATE/config.yml', 'utf8')).blank_issues_enabled).toBe(true);
  });
});
