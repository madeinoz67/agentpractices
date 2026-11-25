// author: Stephen Eaton
// Pure builders for the agent-facing outputs: catalog.json, taxonomy.jsonld (SKOS), taxonomy.json, llms.txt.
import { pathOf, type Concept, type Taxonomy } from './taxonomy';
import type { Practice } from './practices';
import { REPO_URL } from './site';
import { contentHash } from './version-guard';

/** Pre-filled "Report a problem with a practice" issue form URL. */
export const reportUrl = (id: string, version: string) =>
  `${REPO_URL}/issues/new?${new URLSearchParams({ template: 'report-practice-problem.yml', title: `[Problem]: ${id}@${version}`, practice: `${id}@${version}` })}`;

export interface EmitOpts { baseUrl: string }
export const pageUrl = (base: string, slug: string) => (slug ? `${base}${slug}/` : base);
export const mdUrl = (base: string, slug: string) => `${base}${slug || 'index'}.md`;

export interface CatalogEntry extends Omit<Practice, 'file' | 'body' | 'slug'> { slug: string; content_hash: string; domain_path: string[]; url: string; md_url: string; report_url: string }
export interface Catalog { version: number; taxonomy_version: string; generated: string; base_url: string; count: number; practices: CatalogEntry[] }

export function buildCatalog(ps: Practice[], t: Taxonomy, o: EmitOpts & { generated: string }): Catalog {
  const practices = ps.map(({ file: _f, body: _b, ...p }) => ({
    ...p,
    content_hash: contentHash({ ...p, file: _f, body: _b }),
    domain_path: pathOf(t, p.domain).map((c) => c.label),
    url: pageUrl(o.baseUrl, p.slug),
    md_url: mdUrl(o.baseUrl, p.slug),
    report_url: reportUrl(p.id, p.version),
  }));
  return { version: 1, taxonomy_version: t.version, generated: o.generated, base_url: o.baseUrl, count: practices.length, practices };
}

const CONTEXT = {
  skos: 'http://www.w3.org/2004/02/skos/core#',
  dct: 'http://purl.org/dc/terms/',
  owl: 'http://www.w3.org/2002/07/owl#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  prefLabel: { '@id': 'skos:prefLabel', '@language': 'en' },
  altLabel: { '@id': 'skos:altLabel', '@language': 'en' },
  definition: { '@id': 'skos:definition', '@language': 'en' },
  scopeNote: { '@id': 'skos:scopeNote', '@language': 'en' },
  notation: 'skos:notation',
  broader: { '@id': 'skos:broader', '@type': '@id' },
  narrower: { '@id': 'skos:narrower', '@type': '@id' },
  inScheme: { '@id': 'skos:inScheme', '@type': '@id' },
  topConceptOf: { '@id': 'skos:topConceptOf', '@type': '@id' },
  hasTopConcept: { '@id': 'skos:hasTopConcept', '@type': '@id' },
  deprecated: { '@id': 'owl:deprecated', '@type': 'xsd:boolean' },
  isReplacedBy: { '@id': 'dct:isReplacedBy', '@type': '@id' },
  version: 'owl:versionInfo',
};

export function buildSkos(t: Taxonomy, o: EmitOpts): object {
  const iri = (id: string) => `${o.baseUrl}taxonomy/${id}`;
  const scheme = iri('domains');
  const tops = t.concepts.filter((c) => !c.broader);
  const graph: object[] = [
    { '@id': scheme, '@type': 'skos:ConceptScheme', prefLabel: 'Practice Domains', version: t.version, hasTopConcept: tops.map((c) => iri(c.id)) },
    ...t.concepts.map((c: Concept) => ({
      '@id': iri(c.id), '@type': 'skos:Concept', notation: c.id, inScheme: scheme,
      prefLabel: c.label, definition: c.definition,
      ...(c.alt_labels?.length ? { altLabel: c.alt_labels } : {}),
      ...(c.scope_note ? { scopeNote: c.scope_note } : {}),
      ...(c.broader ? { broader: iri(c.broader) } : { topConceptOf: scheme }),
      ...(c.status === 'deprecated' ? { deprecated: true, ...(c.replaced_by ? { isReplacedBy: iri(c.replaced_by) } : {}) } : {}),
    })),
  ];
  for (const [facet, values] of Object.entries(t.facets)) {
    const fs = iri(facet);
    graph.push({ '@id': fs, '@type': 'skos:ConceptScheme', prefLabel: `Facet: ${facet}`, version: t.version, hasTopConcept: values.map((v) => `${fs}/${v.id}`) });
    for (const v of values)
      graph.push({ '@id': `${fs}/${v.id}`, '@type': 'skos:Concept', notation: v.id, inScheme: fs, topConceptOf: fs, prefLabel: v.label, definition: v.definition });
  }
  return { '@context': CONTEXT, '@graph': graph };
}

interface TreeNode { id: string; label: string; definition: string; status: string; alt_labels?: string[]; scope_note?: string; replaced_by?: string; children: TreeNode[] }
export function buildTaxonomyJson(t: Taxonomy) {
  const node = (c: Concept): TreeNode => ({
    id: c.id, label: c.label, definition: c.definition, status: c.status,
    ...(c.alt_labels ? { alt_labels: c.alt_labels } : {}), ...(c.scope_note ? { scope_note: c.scope_note } : {}),
    ...(c.replaced_by ? { replaced_by: c.replaced_by } : {}),
    children: t.concepts.filter((x) => x.broader === c.id).map(node),
  });
  return { version: t.version, domains: t.concepts.filter((c) => !c.broader).map(node), facets: t.facets };
}

export function buildLlmsTxt(ps: Practice[], t: Taxonomy, o: EmitOpts & { title: string; description: string }): string {
  const b = o.baseUrl;
  const lines = [
    `# ${o.title}`, '', `> ${o.description}`, '',
    'Each practice has a permanent ID (BP-NNNN) and a semver version; cite as BP-NNNN@x.y.z.',
    'Fetch the raw .md of a practice; its "## Rules" section uses MUST/SHOULD/MAY (RFC 2119).',
    'Filter by domain, role, stage or type with catalog.json. Practices with status draft are proposals.', '',
    '## Machine indexes', '',
    `- [catalog.json](${b}catalog.json): every practice with metadata, taxonomy path, url and md_url`,
    `- [taxonomy.jsonld](${b}taxonomy.jsonld): domain and facet vocabularies as SKOS JSON-LD`,
    `- [taxonomy.json](${b}taxonomy.json): the same taxonomy as a plain nested tree`,
    `- [AGENTS.md](${b}AGENTS.md): how agents should use this site`,
    `- [llms-full.txt](${b}llms-full.txt): all content in one file`,
    `- [llms-small.txt](${b}llms-small.txt): abridged content`,
    '',
    '## Report a problem',
    '',
    `If a rule is wrong, unclear, out of date or caused a bad outcome, report it: each practice's \`report_url\` in catalog.json opens a pre-filled form (template report-practice-problem.yml). See [Report a problem](${b}contributing/report-a-problem/).`,
  ];
  for (const top of t.concepts.filter((c) => !c.broader)) {
    const inTop = ps.filter((p) => pathOf(t, p.domain)[0]?.id === top.id).sort((a, z) => a.id.localeCompare(z.id));
    if (!inTop.length) continue;
    lines.push('', `## ${top.label}`, '');
    for (const p of inTop) lines.push(`- [${p.title}](${mdUrl(b, p.slug)}): ${p.id}@${p.version} [${p.status}] ${p.description}`);
  }
  return lines.join('\n') + '\n';
}
