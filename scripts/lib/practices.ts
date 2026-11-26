// author: Stephen Eaton
// Load practice pages (Markdown with an `id` in frontmatter) and validate them against the taxonomy.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import matter from 'gray-matter';
import { dirOf, slugify, type Issue, type Taxonomy } from './taxonomy';

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
  /** Date the page was last checked against its sources and current practice. */
  reviewed: string;
  /** Date by which the page must be reviewed again. */
  review_by: string;
  related: string[];
  superseded_by: string | null;
  sources: Source[];
  file: string;
  slug: string;
  body: string;
}

export const PRACTICE_ID = /^BP-\d{4}$/;
const REQUIRED = ['title', 'description', 'domain', 'type', 'roles', 'stage', 'status', 'version', 'updated', 'reviewed', 'review_by'] as const;
const MAX_REVIEW_DAYS = 366;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000;

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
      reviewed: isoDate(data.reviewed), review_by: isoDate(data.review_by),
      related: data.related ?? [], superseded_by: data.superseded_by ?? null, sources: data.sources ?? [],
      file, slug: relative(dir, file).replace(/\\/g, '/').replace(/\.mdx?$/, '').replace(/\/index$/, ''), body: content,
    });
  }
  return out;
}

/** Markdown files inside a domain folder that lack an `id` would silently drop out of catalog.json and llms.txt. */
export function findUnidentified(dir: string, t: Taxonomy): Issue[] {
  const domainDirs = t.concepts.filter((c) => !c.broader).map((c) => slugify(c.label) + '/');
  return walk(dir).sort().flatMap((file) => {
    const rel = relative(dir, file).replace(/\\/g, '/');
    if (!domainDirs.some((d) => rel.startsWith(d)) || matter(readFileSync(file, 'utf8')).data.id) return [];
    return [{ level: 'error' as const, code: 'E_NOID', msg: `${file}: page inside a domain folder has no practice id` }];
  });
}

export function validatePractices(ps: Practice[], t: Taxonomy, opts: { checkPath?: boolean; today?: string } = {}): Issue[] {
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
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
    if (opts.checkPath && c && !p.slug.startsWith(dirOf(t, p.domain) + '/'))
      err('E_PATH', p, `must live under ${dirOf(t, p.domain)}/ to match its domain`);
    if (!/^[a-z0-9-]+$/.test(p.slug.split('/').pop() ?? ''))
      err('E_SLUG', p, 'file name must be lower-case kebab-case (a-z, 0-9, -) so catalog URLs match site URLs');
    if (!/^##\s+Rules\b/m.test(p.body)) err('E_RULES', p, 'body must contain a "## Rules" section');
    if (!/\*\*MUST\b/.test(p.body)) err('E_NORMATIVE', p, 'body must state at least one **MUST** rule');
    if (p.reviewed && p.review_by) {
      const rev = (msg: string) => err('E_REVIEW', p, msg);
      if (!ISO_DAY.test(p.reviewed) || !ISO_DAY.test(p.review_by)) rev('reviewed and review_by must be YYYY-MM-DD');
      else {
        if (p.review_by <= p.reviewed) rev(`review_by ${p.review_by} must be after reviewed ${p.reviewed}`);
        if (p.reviewed > today) rev(`reviewed ${p.reviewed} is in the future`);
        if (days(p.reviewed, p.review_by) > MAX_REVIEW_DAYS) rev(`review_by is more than 12 months after reviewed`);
        if (p.updated && p.reviewed < p.updated) rev(`updated ${p.updated} after reviewed ${p.reviewed}; changing a page counts as reviewing it`);
        if (p.review_by < today) issues.push({ level: 'warn', code: 'W_REVIEW_DUE', msg: `${p.id} (${p.file}): review was due ${p.review_by}` });
      }
    }
    for (const s of p.sources)
      if (!/^https?:\/\//i.test(String(s?.url ?? '')))
        err('E_SOURCE', p, `source "${s?.title ?? ''}" needs an http:// or https:// url`);
  }
  return issues;
}

export interface SeeAlsoItem { id: string; title: string; slug: string }
/** Related practices for the "See also" block: declared `related` first, then practices that list this one. */
export function seeAlso(p: Pick<Practice, 'id' | 'related'>, all: Pick<Practice, 'id' | 'title' | 'slug' | 'related'>[]): SeeAlsoItem[] {
  const byId = new Map(all.map((x) => [x.id, x]));
  const ids = [...p.related, ...all.filter((x) => x.related.includes(p.id)).map((x) => x.id)];
  const seen = new Set<string>([p.id]);
  const out: SeeAlsoItem[] = [];
  for (const id of ids) {
    const x = byId.get(id);
    if (!x || seen.has(id)) continue;
    seen.add(id);
    out.push({ id: x.id, title: x.title, slug: x.slug });
  }
  return out;
}

export interface SourceLink { title: string; url: string; host: string }
/** Sources to show on a practice page: http(s) only, in the order the page lists them. */
export function sourceLinks(sources: { title: string; url: string }[] | undefined): SourceLink[] {
  const out: SourceLink[] = [];
  for (const s of sources ?? []) {
    let u: URL;
    try { u = new URL(s.url); } catch { continue; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') continue;
    out.push({ title: s.title, url: s.url, host: u.hostname.replace(/^www\./, '') });
  }
  return out;
}
