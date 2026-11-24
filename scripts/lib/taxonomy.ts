// author: Stephen Eaton
// Load and validate the domain taxonomy (taxonomy/domains.yaml) and facet vocabularies (taxonomy/facets.yaml).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

export type Status = 'active' | 'deprecated';
export interface Concept {
  id: string;
  label: string;
  definition: string;
  scope_note?: string;
  alt_labels?: string[];
  broader?: string;
  status: Status;
  replaced_by?: string;
}
export interface FacetValue { id: string; label: string; definition: string }
export interface Taxonomy {
  version: string;
  concepts: Concept[];
  byId: Map<string, Concept>;
  facets: Record<string, FacetValue[]>;
}
export interface Issue { level: 'error' | 'warn'; code: string; msg: string }

export const CONCEPT_ID = /^D(\.[A-Z]{2,4}){1,3}$/;

export function makeTaxonomy(version: string, concepts: Concept[], facets: Record<string, FacetValue[]>): Taxonomy {
  const byId = new Map<string, Concept>();
  for (const x of concepts) if (!byId.has(x.id)) byId.set(x.id, x);
  return { version, concepts, byId, facets };
}

export function loadTaxonomy(dir: string): Taxonomy {
  const d = parse(readFileSync(join(dir, 'domains.yaml'), 'utf8'));
  const f = parse(readFileSync(join(dir, 'facets.yaml'), 'utf8'));
  const concepts: Concept[] = (d.concepts ?? []).map((x: Concept) => ({ status: 'active', ...x }));
  return makeTaxonomy(String(d.version), concepts, f.facets ?? {});
}

/** Ancestors root-first, ending with the concept itself. Empty if unknown. Stops on cycles. */
export function pathOf(t: Taxonomy, id: string): Concept[] {
  const out: Concept[] = [];
  const seen = new Set<string>();
  let cur = t.byId.get(id);
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    out.unshift(cur);
    cur = cur.broader ? t.byId.get(cur.broader) : undefined;
  }
  return out;
}

export function validateTaxonomy(t: Taxonomy): Issue[] {
  const issues: Issue[] = [];
  const err = (code: string, msg: string) => issues.push({ level: 'error', code, msg });
  const seen = new Set<string>();
  for (const x of t.concepts) {
    if (seen.has(x.id)) err('E_DUPID', `duplicate concept id ${x.id}`);
    seen.add(x.id);
    if (!CONCEPT_ID.test(x.id)) err('E_IDFMT', `bad concept id ${x.id}`);
    if (!x.definition?.trim()) err('E_NODEF', `${x.id} has no definition`);
    if (x.broader && !t.byId.has(x.broader)) err('E_ORPHAN', `${x.id} broader ${x.broader} not found`);
    if (x.status === 'deprecated' && !(x.replaced_by && t.byId.has(x.replaced_by)))
      err('E_DEPREC', `${x.id} deprecated without valid replaced_by`);
  }
  for (const x of t.concepts) {
    const visited = new Set<string>();
    let cur: Concept | undefined = x;
    while (cur?.broader) {
      if (visited.has(cur.id)) { err('E_CYCLE', `cycle through ${x.id}`); break; }
      visited.add(cur.id);
      cur = t.byId.get(cur.broader);
    }
  }
  const children = new Map<string, number>();
  for (const x of t.concepts) if (x.broader) children.set(x.broader, (children.get(x.broader) ?? 0) + 1);
  for (const [id, n] of children) if (n === 1) issues.push({ level: 'warn', code: 'W_SINGLE', msg: `${id} has a single child` });
  return issues;
}

/** URL/folder slug for a label: lower case, non-alphanumerics collapsed to single hyphens. */
export const slugify = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Content folder for a concept, e.g. D.SWE.CLI → software-engineering/cli-design. */
export const dirOf = (t: Taxonomy, id: string) => pathOf(t, id).map((c) => slugify(c.label)).join('/');
