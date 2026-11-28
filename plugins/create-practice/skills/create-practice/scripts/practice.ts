#!/usr/bin/env bun
// author: Stephen Eaton
// create-practice helper for the agentpractices.dev corpus. Bun only, no dependencies.
//
//   taxonomy                     domains and facet values (local repo if --repo, else published)
//   similar  --title T [--text]  existing practices that may duplicate a proposal
//   propose  --draft draft.json  validate a proposal; print the issue title, labels, body and a prefilled URL
//   scaffold --repo DIR --id BP-NNNN --domain D.X.Y --title T --description D --type T --roles a,b --stage s,t
//            [--slug S] [--fast] [--related BP-1,BP-2] [--issue N]
//                                write the practice file in its domain folder and a CHANGELOG line
//
// JSON on stdout. One line on stderr and exit 1 on failure.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const DEFAULT_BASE = 'https://agentpractices.dev/';
export const REPO_URL = 'https://github.com/madeinoz67/agentpractices';
const MAX_URL = 7500;

// ---------- taxonomy ----------

export interface Domain { id: string; label: string; definition?: string; status?: string; scope_note?: string; children: Domain[] }
export interface Vocab { domains: Domain[]; facets: Record<string, string[]>; source: string; version: string }

export const slugify = (s: string) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function flatten(ds: Domain[], parents: Domain[] = []): { d: Domain; path: Domain[] }[] {
  return ds.flatMap((d) => [{ d, path: [...parents, d] }, ...flatten(d.children ?? [], [...parents, d])]);
}

/** Content folder for a domain, e.g. D.SWE.CLI → software-engineering/cli-design. Null when unknown. */
export function dirOf(v: Vocab, id: string): string | null {
  const hit = flatten(v.domains).find((x) => x.d.id === id);
  return hit ? hit.path.map((c) => slugify(c.label)).join('/') : null;
}

/** Build the domain tree from the repo's taxonomy YAML, so a concept added on this branch counts. */
export function vocabFromYaml(domainsYaml: string, facetsYaml: string): Vocab {
  const d = Bun.YAML.parse(domainsYaml) as { version: unknown; concepts: { id: string; label: string; broader?: string; definition?: string; status?: string }[] };
  const f = Bun.YAML.parse(facetsYaml) as { facets: Record<string, { id: string }[]> };
  const nodes = new Map<string, Domain>();
  for (const c of d.concepts ?? []) nodes.set(c.id, { id: c.id, label: c.label, definition: c.definition, status: c.status ?? 'active', children: [] });
  const roots: Domain[] = [];
  for (const c of d.concepts ?? []) {
    const n = nodes.get(c.id)!;
    const parent = c.broader ? nodes.get(c.broader) : undefined;
    (parent ? parent.children : roots).push(n);
  }
  const facets = Object.fromEntries(Object.entries(f.facets ?? {}).map(([k, vs]) => [k, vs.map((x) => x.id)]));
  return { domains: roots, facets, source: 'repo', version: String(d.version) };
}

export function vocabFromJson(j: { version: string; domains: Domain[]; facets: Record<string, { id: string }[]> }): Vocab {
  const facets = Object.fromEntries(Object.entries(j.facets ?? {}).map(([k, vs]) => [k, vs.map((x) => x.id)]));
  return { domains: j.domains, facets, source: 'published', version: j.version };
}

// ---------- network (one origin) ----------

const base = () => {
  const b = process.env.AGENTPRACTICES_URL || DEFAULT_BASE;
  return b.endsWith('/') ? b : `${b}/`;
};

async function getJson<T>(path: string): Promise<T> {
  const url = new URL(path, base());
  if (url.origin !== new URL(base()).origin) throw new Error(`refusing to fetch outside ${base()}`);
  const res = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`cannot reach ${url}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export function isRepo(dir: string) {
  return existsSync(join(dir, 'taxonomy/domains.yaml')) && existsSync(join(dir, 'src/content/docs')) && existsSync(join(dir, 'AGENTS.md'));
}

async function loadVocab(repo?: string): Promise<Vocab> {
  if (repo && isRepo(repo)) {
    return vocabFromYaml(readFileSync(join(repo, 'taxonomy/domains.yaml'), 'utf8'), readFileSync(join(repo, 'taxonomy/facets.yaml'), 'utf8'));
  }
  return vocabFromJson(await getJson('taxonomy.json'));
}

// ---------- duplicates ----------

interface CatalogRecord { id: string; title: string; description: string; domain: string; version: string; status: string; url: string }

const STOP = new Set('a an and are as at be by do for from how in into is it its not of on or the to use when with without your you'.split(' '));
export const tokens = (s: string) => new Set(slugify(s).split('-').filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.replace(/(ies|es|s)$/, '')));

/** Share of the proposal's words that also appear in the practice. */
export function overlap(query: string, text: string): number {
  const q = tokens(query);
  if (!q.size) return 0;
  const t = tokens(text);
  let n = 0;
  for (const w of q) if (t.has(w)) n++;
  return n / q.size;
}

export function rankSimilar(records: CatalogRecord[], query: string, limit = 8) {
  return records
    .map((r) => ({ id: r.id, title: r.title, domain: r.domain, version: r.version, status: r.status, url: r.url,
      score: Math.round((0.6 * overlap(query, r.title) + 0.4 * overlap(query, r.description)) * 100) / 100 }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}

// ---------- proposal ----------

export interface Draft {
  title: string; problem: string; domain: string; type: string; roles: string[]; stage: string[];
  rules: string; related?: string[]; sources?: { title: string; url: string; note: string }[];
  /** Set when no domain fits; proposes the new concept in the issue text. */
  taxonomy_note?: string;
}

const NONE_FITS = 'None fits — needs a taxonomy change';
const RULE_LINE = /^\s*\d+\.\s+\*\*(MUST NOT|MUST|SHOULD NOT|SHOULD|MAY)\*\*\s+\S/;

/** One source as it appears in a proposal: the link, then the note that says why it matters. */
export const sourceLine = (x: { title: string; url: string; note: string }) => `- [${x.title}](${x.url}): ${x.note}`;

export function validateDraft(d: Draft, v: Vocab): string[] {
  const errs: string[] = [];
  const ids = new Set(flatten(v.domains).map((x) => x.d.id));
  if (!d.title?.trim()) errs.push('title is required');
  else if (/^BP-\d{4}/.test(d.title)) errs.push('title must not carry a BP-NNNN ID; the owner assigns one');
  if (!d.problem?.trim()) errs.push('problem is required');
  if (d.domain !== 'none' && !ids.has(d.domain)) errs.push(`unknown domain ${d.domain}; use an ID from \`taxonomy\` or "none"`);
  if (d.domain === 'none' && !d.taxonomy_note?.trim()) errs.push('domain "none" needs taxonomy_note describing the concept to add');
  if (!v.facets.type?.includes(d.type)) errs.push(`type must be one of ${v.facets.type?.join(', ')}`);
  for (const [k, vals] of [['role', d.roles], ['stage', d.stage]] as const) {
    if (!vals?.length) errs.push(`${k === 'role' ? 'roles' : 'stage'} needs at least one value`);
    for (const x of vals ?? []) if (!v.facets[k]?.includes(x)) errs.push(`unknown ${k} ${x}; valid: ${v.facets[k]?.join(', ')}`);
  }
  const lines = (d.rules ?? '').split('\n').filter((l) => /^\s*\d+\./.test(l));
  if (!lines.length) errs.push('rules needs numbered lines such as "1. **MUST** …"');
  for (const l of lines) if (!RULE_LINE.test(l)) errs.push(`rule without a bold MUST/SHOULD/MAY keyword: ${l.trim().slice(0, 60)}`);
  for (const r of d.related ?? []) if (!/^BP-\d{4}$/.test(r)) errs.push(`related entry ${r} is not a BP-NNNN ID`);
  for (const s of d.sources ?? []) {
    try { if (!/^https?:$/.test(new URL(s.url).protocol)) throw 0; } catch { errs.push(`source "${s.title}" has a bad URL`); }
    if (!String(s.note ?? '').trim()) errs.push(`source "${s.title}" needs a note that says why it matters to the rules`);
  }
  return errs;
}

export function domainOption(v: Vocab, id: string): string {
  if (id === 'none') return NONE_FITS;
  const hit = flatten(v.domains).find((x) => x.d.id === id)!;
  return `${hit.d.id} — ${hit.d.label}`;
}

/** Issue body in the shape GitHub renders the Propose a practice form, so the owner reads one format. */
export function issueBody(d: Draft, v: Vocab): string {
  const s = (h: string, body: string) => `### ${h}\n\n${body.trim() || '_No response_'}\n`;
  const sources = (d.sources ?? []).map(sourceLine).join('\n');
  const problem = d.domain === 'none' ? `${d.problem.trim()}\n\n**Taxonomy change needed:** ${d.taxonomy_note!.trim()}` : d.problem;
  return [
    s('Practice title', d.title),
    s('Problem', problem),
    s('Domain', domainOption(v, d.domain)),
    s('Type', d.type),
    s('Roles', d.roles.join(', ')),
    s('Stage', d.stage.join(', ')),
    s('Draft rules', d.rules),
    s('Related or overlapping practices', (d.related ?? []).join(', ')),
    s('Sources', sources),
    s('Checks', '- [x] I searched existing practices and open issues for duplicates\n- [x] The proposal contains no secrets or personal data'),
  ].join('\n');
}

export function prefillUrl(d: Draft, v: Vocab): string {
  const p = new URLSearchParams({
    template: 'propose-practice.yml', title: `[Practice]: ${d.title}`,
    practice_title: d.title, problem: d.domain === 'none' ? `${d.problem}\n\nTaxonomy change needed: ${d.taxonomy_note}` : d.problem,
    domain: domainOption(v, d.domain), type: d.type, roles: d.roles.join(','), stage: d.stage.join(','),
    rules: d.rules, related: (d.related ?? []).join(', '),
    sources: (d.sources ?? []).map(sourceLine).join('\n'),
  });
  return `${REPO_URL}/issues/new?${p}`;
}

// ---------- scaffold ----------

export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function addMonths(day: string, months: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(y, m - 1 + months, 1);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  return isoDay(new Date(t.getFullYear(), t.getMonth(), Math.min(d, last)));
}

/** Short file slug from a title, cut at a word boundary. */
export function fileSlug(title: string, max = 60): string {
  const s = slugify(title);
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return cut.slice(0, cut.lastIndexOf('-') > 20 ? cut.lastIndexOf('-') : max).replace(/-$/, '');
}

const yamlStr = (s: string) => (/^[\w][\w .,'()/&+-]*$/.test(s) && !/: /.test(s) ? s : JSON.stringify(s));

export interface ScaffoldOpts {
  id: string; domain: string; title: string; description: string; type: string; roles: string[]; stage: string[];
  related?: string[]; today: string; fast?: boolean;
}

export function practiceMarkdown(o: ScaffoldOpts): string {
  const reviewBy = addMonths(o.today, o.fast ? 3 : 6);
  return `---
title: ${yamlStr(o.title)}
description: ${yamlStr(o.description)}
id: ${o.id}
domain: ${o.domain}
type: ${o.type}
roles: [${o.roles.join(', ')}]
stage: [${o.stage.join(', ')}]
status: draft
version: 1.0.0
updated: ${o.today}
reviewed: ${o.today}
review_by: ${reviewBy}
related: [${(o.related ?? []).join(', ')}]
superseded_by: null
sources:
  - title: TODO source title
    url: https://example.org/TODO
    note: TODO say why this source matters to the rules
---

TODO: one or two paragraphs — the problem this practice prevents and why the rules below fix it.

## Rules

1. **MUST** TODO
2. **SHOULD** TODO

## When to apply

TODO

## Procedure

1. TODO

## Examples

TODO

## Anti-patterns

- TODO

## Checklist

- [ ] TODO
`;
}

function walkMd(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walkMd(p) : /\.mdx?$/.test(n) ? [p] : [];
  });
}

/** Files in the repo that already declare this id. */
export function findId(docs: string, id: string): string[] {
  const re = new RegExp(`^id:\\s*${id}\\s*$`, 'm');
  return walkMd(docs).filter((f) => re.test(readFileSync(f, 'utf8').split(/\n---\n/)[0]));
}

export function changelogWith(changelog: string, line: string): string {
  const head = '## Unreleased\n\n';
  const at = changelog.indexOf(head);
  if (at < 0) throw new Error('CHANGELOG.md has no "## Unreleased" section');
  return changelog.slice(0, at + head.length) + `${line}\n` + changelog.slice(at + head.length);
}

// ---------- CLI ----------

const USAGE = 'usage: practice.ts taxonomy [--repo DIR] | similar --title T [--text X] | propose --draft FILE [--repo DIR] | scaffold --repo DIR --id BP-NNNN --domain D.X --title T --description D --type T --roles a,b --stage s [--slug S] [--fast] [--related BP-1,BP-2] [--issue N]';
const BOOL = new Set(['fast']);

export function parseArgs(argv: string[]): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) throw new Error(`unexpected argument ${a}`);
    const k = a.slice(2);
    if (BOOL.has(k)) { out[k] = true; continue; }
    const val = argv[++i];
    if (val === undefined || val.startsWith('--')) throw new Error(`--${k} needs a value`);
    out[k] = val;
  }
  return out;
}

const list = (s: unknown) => (typeof s === 'string' ? s.split(',').map((x) => x.trim()).filter(Boolean) : []);
const need = (a: Record<string, string | true>, k: string) => {
  if (typeof a[k] !== 'string' || !(a[k] as string).trim()) throw new Error(`--${k} is required`);
  return a[k] as string;
};

async function main(argv: string[]) {
  const [cmd, ...rest] = argv;
  const a = parseArgs(rest);
  const repo = typeof a.repo === 'string' ? a.repo : undefined;
  const say = (x: unknown) => console.log(JSON.stringify(x, null, 2));

  switch (cmd) {
    case 'taxonomy': {
      const v = await loadVocab(repo);
      const show = (ds: Domain[]): unknown[] => ds.filter((d) => d.status !== 'deprecated')
        .map((d) => ({ id: d.id, label: d.label, definition: d.definition, folder: dirOf(v, d.id), children: show(d.children ?? []) }));
      return say({ source: v.source, taxonomy_version: v.version, domains: show(v.domains), facets: v.facets });
    }
    case 'similar': {
      const q = `${need(a, 'title')} ${typeof a.text === 'string' ? a.text : ''}`;
      const cat = await getJson<{ generated: string; practices: CatalogRecord[] }>('catalog.json');
      return say({ catalog_generated: cat.generated, candidates: rankSimilar(cat.practices, q) });
    }
    case 'propose': {
      const d = JSON.parse(readFileSync(need(a, 'draft'), 'utf8')) as Draft;
      const v = await loadVocab(repo);
      const errs = validateDraft(d, v);
      if (errs.length) throw new Error(`draft invalid: ${errs.join('; ')}`);
      const url = prefillUrl(d, v);
      return say({
        title: `[Practice]: ${d.title}`, labels: ['proposal', 'practice'], body: issueBody(d, v),
        prefill_url: url.length <= MAX_URL ? url : null,
        prefill_note: url.length <= MAX_URL ? null : 'proposal too long for a prefilled URL; file it with gh or paste the body',
      });
    }
    case 'scaffold': {
      if (!repo || !isRepo(repo)) throw new Error('--repo must point at a clone of madeinoz67/agentpractices');
      const id = need(a, 'id');
      if (!/^BP-\d{4}$/.test(id)) throw new Error(`--id ${id} is not BP-NNNN`);
      const v = await loadVocab(repo);
      const domain = need(a, 'domain');
      const folder = dirOf(v, domain);
      if (!folder) throw new Error(`unknown domain ${domain}; add it to taxonomy/domains.yaml first`);
      const o: ScaffoldOpts = {
        id, domain, title: need(a, 'title'), description: need(a, 'description'), type: need(a, 'type'),
        roles: list(a.roles), stage: list(a.stage), related: list(a.related), today: isoDay(new Date()), fast: a.fast === true,
      };
      const errs = validateDraft({ ...o, problem: 'x', rules: '1. **MUST** x', domain }, v).filter((e) => !e.startsWith('title must not'));
      if (errs.length) throw new Error(errs.join('; '));
      const docs = join(repo, 'src/content/docs');
      const taken = findId(docs, id);
      if (taken.length) throw new Error(`${id} is already used by ${taken.map((f) => relative(repo, f)).join(', ')}`);
      const file = join(docs, folder, `${typeof a.slug === 'string' ? slugify(a.slug) : fileSlug(o.title)}.md`);
      mkdirSync(dirname(file), { recursive: true });
      // Exclusive create: the existence check and the write are one operation, so nothing can slip in between.
      try { writeFileSync(file, practiceMarkdown(o), { flag: 'wx' }); } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'EEXIST') throw new Error(`${relative(repo, file)} already exists`);
        throw e;
      }
      const issue = typeof a.issue === 'string' ? ` (#${a.issue.replace(/^#/, '')})` : '';
      const line = `- ${id} ${o.title} (${domain}, draft)${issue}.`;
      const cl = join(repo, 'CHANGELOG.md');
      writeFileSync(cl, changelogWith(readFileSync(cl, 'utf8'), line));
      return say({ file: relative(repo, file), changelog_line: line, review_by: addMonths(o.today, o.fast ? 3 : 6), todo: 'replace every TODO, then run bun run verify' });
    }
    default:
      throw new Error(USAGE);
  }
}

if (import.meta.main) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(`create-practice: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
}
