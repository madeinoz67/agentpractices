// author: Stephen Eaton
// Load practice pages (Markdown with an `id` in frontmatter) and validate them against the taxonomy.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import matter from 'gray-matter';
import type { Issue, Taxonomy } from './taxonomy';

export interface Source { title: string; url: string }
export interface Practice {
  id: string;
  title: string;
  description: string;
  domain: string;
  type: string;
  roles: string[];
  stage: string[];
  status: string;
  version: string;
  updated: string;
  related: string[];
  superseded_by: string | null;
  sources: Source[];
  file: string;
  slug: string;
  body: string;
}

export const PRACTICE_ID = /^BP-\d{4}$/;
const REQUIRED = ['title', 'description', 'domain', 'type', 'roles', 'stage', 'status', 'version', 'updated'] as const;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.mdx?$/.test(n) ? [p] : [];
  });
}

const isoDate = (v: unknown): string => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? '' : String(v));

export function loadPractices(dir: string): Practice[] {
  const out: Practice[] = [];
  for (const file of walk(dir).sort()) {
    const { data, content } = matter(readFileSync(file, 'utf8'));
    if (!data.id) continue;
    out.push({
      id: String(data.id), title: data.title ?? '', description: data.description ?? '',
      domain: data.domain ?? '', type: data.type ?? '', roles: data.roles ?? [], stage: data.stage ?? [],
      status: data.status ?? '', version: data.version ? String(data.version) : '', updated: isoDate(data.updated),
      related: data.related ?? [], superseded_by: data.superseded_by ?? null, sources: data.sources ?? [],
      file, slug: relative(dir, file).replace(/\\/g, '/').replace(/\.mdx?$/, '').replace(/\/index$/, ''), body: content,
    });
  }
  return out;
}

export function validatePractices(ps: Practice[], t: Taxonomy): Issue[] {
  const issues: Issue[] = [];
  const err = (code: string, p: Practice, msg: string) => issues.push({ level: 'error', code, msg: `${p.id} (${p.file}): ${msg}` });
  const ids = new Map<string, number>();
  for (const p of ps) ids.set(p.id, (ids.get(p.id) ?? 0) + 1);
  const facet = (name: string) => new Set((t.facets[name] ?? []).map((f) => f.id));
  const [types, roles, stages, statuses] = ['type', 'role', 'stage', 'status'].map(facet);

  for (const p of ps) {
    if (!PRACTICE_ID.test(p.id)) err('E_IDFMT', p, 'id must match BP-NNNN');
    if ((ids.get(p.id) ?? 0) > 1) err('E_DUPID', p, 'duplicate practice id');
    for (const k of REQUIRED) {
      const v = p[k];
      if (Array.isArray(v) ? v.length === 0 : !String(v ?? '').trim()) err('E_REQ', p, `missing ${k}`);
    }
    const c = t.byId.get(p.domain);
    if (p.domain && !c) err('E_DOMAIN', p, `unknown domain ${p.domain}`);
    else if (c?.status === 'deprecated') err('E_DOMAIN_DEPREC', p, `domain ${p.domain} is deprecated; use ${c.replaced_by}`);
    if (p.type && !types.has(p.type)) err('E_FACET', p, `bad type ${p.type}`);
    for (const r of p.roles) if (!roles.has(r)) err('E_FACET', p, `bad role ${r}`);
    for (const s of p.stage) if (!stages.has(s)) err('E_FACET', p, `bad stage ${s}`);
    if (p.status && !statuses.has(p.status)) err('E_FACET', p, `bad status ${p.status}`);
    for (const r of p.related) if (!ids.has(r)) err('E_REL', p, `related ${r} not found`);
    if (p.status === 'deprecated' && !(p.superseded_by && ids.has(p.superseded_by)))
      err('E_SUPER', p, 'deprecated practice needs a valid superseded_by');
    if (!/^##\s+Rules\b/m.test(p.body)) err('E_RULES', p, 'body must contain a "## Rules" section');
  }
  return issues;
}
