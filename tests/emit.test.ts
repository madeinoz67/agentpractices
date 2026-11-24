// author: Stephen Eaton
import { describe, expect, test } from 'bun:test';
import jsonld from 'jsonld';
import { loadTaxonomy, makeTaxonomy } from '../scripts/lib/taxonomy';
import { loadPractices } from '../scripts/lib/practices';
import { buildCatalog, buildSkos, buildTaxonomyJson, buildLlmsTxt } from '../scripts/lib/emit';

const BASE = 'https://madeinoz67.github.io/best-practices/';
const t = loadTaxonomy('taxonomy');
const ps = loadPractices('tests/fixtures/docs');
const SKOS = 'http://www.w3.org/2004/02/skos/core#';

describe('buildCatalog', () => {
  const cat = buildCatalog(ps, t, { baseUrl: BASE, generated: '2026-11-24T00:00:00Z' });
  test('urls carry base path', () => {
    expect(cat.practices[0].url).toBe(`${BASE}software-engineering/cli/sample/`);
    expect(cat.practices[0].md_url).toBe(`${BASE}software-engineering/cli/sample.md`);
  });
  test('domain_path labels root-first', () => expect(cat.practices[0].domain_path).toEqual(['Software Engineering', 'CLI Design']));
  test('header fields', () => {
    expect(cat.taxonomy_version).toBe('0.1.0');
    expect(cat.base_url).toBe(BASE);
    expect(cat.generated).toBe('2026-11-24T00:00:00Z');
  });
  test('no internal fields leak', () => {
    expect(cat.practices[0]).not.toHaveProperty('body');
    expect(cat.practices[0]).not.toHaveProperty('file');
  });
});

describe('buildSkos', () => {
  test('expands to one skos:Concept per domain concept', async () => {
    const expanded = await jsonld.expand(buildSkos(t, { baseUrl: BASE }) as any);
    const concepts = expanded.filter((n: any) => n['@type']?.includes(`${SKOS}Concept`) && n['@id'].startsWith(`${BASE}taxonomy/D.`));
    expect(concepts.length).toBe(t.concepts.length);
  });
  test('special characters survive', async () => {
    const label = 'Q&A "tests" — naïve';
    const tt = makeTaxonomy('0.0.1', [{ id: 'D.AA', label, definition: 'A <b> & "c".', status: 'active' }], t.facets);
    const expanded = await jsonld.expand(buildSkos(tt, { baseUrl: BASE }) as any);
    const node: any = expanded.find((n: any) => n['@id'] === `${BASE}taxonomy/D.AA`);
    expect(node[`${SKOS}prefLabel`][0]['@value']).toBe(label);
    expect(node[`${SKOS}prefLabel`][0]['@language']).toBe('en');
  });
  test('deprecated concept carries owl:deprecated and isReplacedBy', async () => {
    const tt = makeTaxonomy('0.0.1', [
      { id: 'D.AA', label: 'A', definition: 'A a.', status: 'active' },
      { id: 'D.BB', label: 'B', definition: 'A b.', status: 'deprecated', replaced_by: 'D.AA' },
    ], t.facets);
    const expanded = await jsonld.expand(buildSkos(tt, { baseUrl: BASE }) as any);
    const b: any = expanded.find((n: any) => n['@id'] === `${BASE}taxonomy/D.BB`);
    expect(b['http://www.w3.org/2002/07/owl#deprecated'][0]['@value']).toBe(true);
    expect(b['http://purl.org/dc/terms/isReplacedBy'][0]['@id']).toBe(`${BASE}taxonomy/D.AA`);
  });
  test('facet schemes present', async () => {
    const expanded = await jsonld.expand(buildSkos(t, { baseUrl: BASE }) as any);
    expect(expanded.some((n: any) => n['@id'] === `${BASE}taxonomy/role/reviewer`)).toBe(true);
  });
});

describe('buildTaxonomyJson', () => {
  test('nested tree keyed by id', () => {
    const j = buildTaxonomyJson(t);
    expect(j.version).toBe('0.1.0');
    expect(j.domains.length).toBe(7);
    expect(j.domains.find((d) => d.id === 'D.SWE')!.children.map((c) => c.id)).toContain('D.SWE.CLI');
    expect(j.facets.stage.map((f) => f.id)).toEqual(['plan', 'build', 'verify', 'operate']);
  });
});

describe('buildLlmsTxt', () => {
  const txt = buildLlmsTxt(ps, t, { baseUrl: BASE, title: 'Agent Best Practices', description: 'Desc.' });
  test('llmstxt.org shape: H1 then blockquote', () => expect(txt.startsWith('# Agent Best Practices\n\n> Desc.\n')).toBe(true));
  test('practice listed under its top domain with md link and description', () => {
    const section = txt.split('\n## Software Engineering\n')[1];
    expect(section).toContain(`- [Sample practice](${BASE}software-engineering/cli/sample.md): BP-9001@1.0.0 [draft] A sample.`);
  });
  test('links machine indexes', () => {
    expect(txt).toContain(`${BASE}catalog.json`);
    expect(txt).toContain(`${BASE}taxonomy.jsonld`);
    expect(txt).toContain(`${BASE}llms-full.txt`);
  });
  test('every link carries the base path', () => {
    for (const m of txt.matchAll(/\]\(([^)]+)\)/g)) expect(m[1].startsWith(BASE)).toBe(true);
  });
});
