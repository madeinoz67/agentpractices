// author: Stephen Eaton
// Fetch, filter and cite agentpractices.dev practices. Deterministic: the skill runs this, it does not re-derive the logic.
// Usage: bun <skill base directory>/scripts/practices.ts <list|get|check|domains|sync> [flags]
//   list  [--domain D.SWE] [--domain D.AGT.SKL] [--role implementer] [--stage plan] [--type guideline] [--status draft] [--limit N]
//   get   BP-NNNN
//   check BP-NNNN@x.y.z [more...]
//   domains  the domain tree from taxonomy.json
//   sync  force a refetch of catalog.json and taxonomy.json
// Output: JSON on stdout. Network or usage failure: one line on stderr, exit 1.
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const BASE_URL = process.env.AGENTPRACTICES_URL ?? 'https://agentpractices.dev/';
const CACHE = process.env.AGENTPRACTICES_CACHE ?? join(homedir(), '.cache', 'agentpractices');
const TTL_MS = 15 * 60 * 1000;

export interface Record_ {
  id: string; title: string; description: string; domain: string; domain_path: string[];
  type: string; roles: string[]; stage: string[]; status: string; version: string;
  updated: string; reviewed?: string; review_by?: string; content_hash?: string;
  superseded_by: string | null; url: string; md_url: string; report_url: string;
}
export interface Catalog { version: number; taxonomy_version: string; generated: string; count: number; practices: Record_[] }
export interface Filters { domain?: string; role?: string; stage?: string; type?: string; status?: string; limit?: number }
export interface DomainNode { id: string; label: string; children: DomainNode[] }
export interface TaxonomyJson { version: string; domains: DomainNode[]; facets: Record<string, { id: string }[]> }
export interface Vocabulary { domains: string[]; facets: Record<string, string[]> }

/** A domain filter matches the exact ID or its children: D.SWE covers D.SWE and D.SWE.CLI. */
export const matchesDomain = (domain: string, filter: string) => domain === filter || domain.startsWith(filter + '.');

/** Practices with role "any" apply to every role. */
export const matchesRole = (roles: string[], filter: string) => roles.includes(filter) || roles.includes('any');

export function filterPractices<T extends Record_>(practices: T[], f: Filters): T[] {
  const domains = f.domain?.split(',').map((d) => d.trim()).filter(Boolean) ?? [];
  const out = practices.filter((p) =>
    (!domains.length || domains.some((d) => matchesDomain(p.domain, d))) &&
    (!f.role || matchesRole(p.roles, f.role)) &&
    (!f.stage || p.stage.includes(f.stage)) &&
    (!f.type || p.type === f.type) &&
    (!f.status || p.status === f.status));
  return f.limit === undefined ? out : out.slice(0, f.limit);
}

export const parseCitation = (s: string): { id: string; version: string } | null => {
  const m = /^(BP-\d{4})@(\S+)$/.exec(s.trim());
  return m ? { id: m[1], version: m[2] } : null;
};

/** The `## Rules` section verbatim, up to the next level-2 heading. */
export function rulesSection(md: string): string | null {
  const start = /^## Rules[^\S\n]*\r?\n/m.exec(md);
  if (!start) return null;
  const rest = md.slice(start.index + start[0].length);
  const next = /^## /m.exec(rest);
  return (`## Rules\n` + (next ? rest.slice(0, next.index) : rest)).trimEnd();
}

/** Ids numerically closest to `id`, for the unknown-practice error. */
export const nearestIds = (practices: { id: string }[], id: string, n = 3): string[] => {
  const target = Number(id.slice(3));
  return practices.map((p) => ({ id: p.id, d: Math.abs(Number(p.id.slice(3)) - target) }))
    .sort((a, b) => a.d - b.d).slice(0, n).map((p) => p.id);
};

/** Valid IDs closest to an unknown one, for the unknown-domain error: shared prefix first. */
export const nearestDomains = (ids: string[], id: string, n = 3): string[] => {
  const shared = (c: string) => { let i = 0; while (i < c.length && i < id.length && c[i] === id[i]) i++; return i; };
  return [...ids].sort((a, b) => shared(b) - shared(a) || a.length - b.length || a.localeCompare(b)).slice(0, n);
};

/** Semver change from the cited version to the current one, compared numerically (1.10.0 > 1.9.0). */
export function versionChange(cited: string, current: string): 'none' | 'patch' | 'minor' | 'major' | 'older' {
  const part = (v: string) => v.split('.').map((x) => Number.parseInt(x, 10) || 0);
  const [major, minor, patch] = part(cited);
  const now = part(current);
  for (let i = 0; i < 3; i++) {
    const citedPart = [major, minor, patch][i];
    if (citedPart === now[i]) continue;
    if (citedPart > now[i]) return 'older';
    return (['major', 'minor', 'patch'] as const)[i];
  }
  return 'none';
}

/** A practice is overdue when its review_by date is before today. Dates are YYYY-MM-DD, so they sort as text. */
export const isOverdue = (reviewBy: string | undefined, today = new Date().toISOString().slice(0, 10)) =>
  !!reviewBy && reviewBy < today;

export const flattenDomains = (nodes: DomainNode[]): DomainNode[] => nodes.flatMap((n) => [n, ...flattenDomains(n.children)]);

/** The values a flag may take: every domain ID and every facet value in the taxonomy. */
export const vocabulary = (t: TaxonomyJson): Vocabulary => ({
  domains: flattenDomains(t.domains).map((d) => d.id),
  facets: Object.fromEntries(Object.entries(t.facets).map(([facet, values]) => [facet, values.map((v) => v.id)])),
});

/** The catalogue is stale when its generation time is not newer than the cached copy. */
export const isGeneratedNewer = (remote: string, cached: string) => Date.parse(remote) > Date.parse(cached);
export const isFresh = (fetchedAtMs: number, nowMs: number, ttlMs = TTL_MS) => nowMs - fetchedAtMs < ttlMs;

const die = (msg: string): never => { console.error(msg); process.exit(1); };

function cachePath(name: string) { return join(CACHE, name); }

function readCache<T>(name: string): T | null {
  try { return JSON.parse(readFileSync(cachePath(name), 'utf8')) as T; } catch { return null; }
}

/** mtime of a cache file, or 0 when it is absent. No separate stamp file. */
function cacheAge(name: string): number {
  try { return statSync(cachePath(name)).mtimeMs; } catch { return 0; }
}

/** Temp file then rename: a concurrent reader never sees a partial file, and a killed writer leaves no damage. */
function writeAtomic(path: string, text: string) {
  writeFileSync(`${path}.tmp`, text);
  renameSync(`${path}.tmp`, path);
}

function writeCache(name: string, value: unknown) {
  mkdirSync(CACHE, { recursive: true });
  writeAtomic(cachePath(name), JSON.stringify(value, null, 2));
}

/** Only the configured origin is reachable: a hostile catalogue cannot redirect the fetch to another host. */
export const isAllowed = (url: string, base: string): boolean => {
  try { return new URL(url).origin === new URL(base).origin; } catch { return false; }
};

/** A catalogue md_url is an absolute production URL: fetch its path from the configured base instead. */
export const resolveMd = (mdUrl: string, base: string): string => new URL(new URL(mdUrl, base).pathname, base).href;

async function getText(path: string): Promise<string> {
  const url = /^https?:/i.test(path) ? path : new URL(path, BASE_URL).href;
  if (!isAllowed(url, BASE_URL)) throw new Error(`refusing ${url}: outside ${BASE_URL}`);
  const res = await fetch(url).catch((e: Error) => { throw new Error(`cannot reach ${url}: ${e.message}`); });
  if (!res.ok) throw new Error(`cannot reach ${url}: HTTP ${res.status}`);
  return res.text();
}

/** Read a published JSON file from the cache when it is fresh, else from the network. A stale cache beats no data. */
async function loadCached<T>(name: string, force: boolean, isNewer: (remote: T, cached: T) => boolean): Promise<T> {
  const cached = readCache<T>(name);
  if (cached && !force && isFresh(cacheAge(name), Date.now())) return cached;
  let remote: T;
  try { remote = JSON.parse(await getText(name)) as T; } catch (e) {
    // A stale cache beats no practice; the skill reports staleness from catalog_generated.
    if (cached) return cached;
    throw e;
  }
  if (!force && cached && !isNewer(remote, cached)) return cached;
  writeCache(name, remote);
  return remote;
}

/** Fetch catalog.json when the cached copy is older than the TTL or the network copy is newer. */
export const loadCatalog = (force = false) =>
  loadCached<Catalog>('catalog.json', force, (remote, cached) => isGeneratedNewer(remote.generated, cached.generated));

/** Fetch taxonomy.json, the domain tree and facet values that every flag value is checked against. */
export const loadTaxonomy = (force = false) =>
  loadCached<TaxonomyJson>('taxonomy.json', force, (remote, cached) => remote.version !== cached.version);

async function getPracticeMd(p: Record_): Promise<string> {
  const name = `${p.id}@${p.version}.md`;
  try { return readFileSync(cachePath(name), 'utf8'); } catch { /* cache miss */ }
  const md = await getText(resolveMd(p.md_url, BASE_URL));
  mkdirSync(CACHE, { recursive: true });
  writeAtomic(cachePath(name), md);
  return md;
}

const FLAGS = ['domain', 'role', 'stage', 'type', 'status', 'limit'] as const;
const FLAG_LIST = FLAGS.map((n) => `--${n}`).join(' ');

/** Parse and validate the list flags. Throws on an unknown flag or a value outside the taxonomy. */
export function parseFlags(argv: string[], vocab: Vocabulary): Filters {
  const f: Filters = {};
  for (let i = 0; i < argv.length; i += 2) {
    const token = argv[i];
    const name = token.startsWith('--') ? token.slice(2) : '';
    if (!(FLAGS as readonly string[]).includes(name)) {
      throw new Error(`agentpractices: unknown flag ${token}. Flags: ${FLAG_LIST}`);
    }
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) throw new Error(`agentpractices: ${token} needs a value`);

    if (name === 'limit') {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1) throw new Error(`agentpractices: --limit needs a positive integer, got ${v}`);
      f.limit = n;
      continue;
    }
    if (name === 'domain') {
      const ids = v.split(',').map((d) => d.trim()).filter(Boolean);
      for (const id of ids) {
        if (!vocab.domains.includes(id)) {
          throw new Error(`agentpractices: unknown domain ${id}. Nearest: ${nearestDomains(vocab.domains, id).join(', ')}`);
        }
      }
      // Repeated flags add up, the same as the comma form.
      f.domain = f.domain ? `${f.domain},${ids.join(',')}` : ids.join(',');
      continue;
    }
    const allowed = vocab.facets[name] ?? [];
    if (!allowed.includes(v)) throw new Error(`agentpractices: unknown ${token} ${v}. Valid: ${allowed.join(', ')}`);
    (f as Record<string, unknown>)[name] = v;
  }
  return f;
}

/** Parsed flags, or a one-line usage error on stderr and exit 1. */
function flagsOrDie(argv: string[], vocab: Vocabulary): Filters {
  try { return parseFlags(argv, vocab); } catch (e) { die((e as Error).message); }
}

function domainTree(nodes: DomainNode[]): unknown[] {
  return nodes.map((n) => ({ id: n.id, label: n.label, children: domainTree(n.children) }));
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const out = (v: unknown) => console.log(JSON.stringify(v, null, 2));

  if (cmd === 'list') {
    const vocab = vocabulary(await loadTaxonomy());
    const f = flagsOrDie(rest, vocab);
    const cat = await loadCatalog();
    const hits = filterPractices(cat.practices, f).map((p) => ({ ...p, review_overdue: isOverdue(p.review_by) }));
    return out({ catalog_generated: cat.generated, count: hits.length, applied_filters: f, practices: hits });
  }

  if (cmd === 'get') {
    const id = rest[0];
    if (!/^BP-\d{4}$/.test(id ?? '')) die('agentpractices: get needs a practice id in the form BP-NNNN');
    const cat = await loadCatalog();
    const p = cat.practices.find((x) => x.id === id);
    if (!p) {
      die(`agentpractices: no practice ${id}. Nearest: ${nearestIds(cat.practices, id).join(', ')}`);
    }
    const md = await getPracticeMd(p);
    const rules = rulesSection(md);
    if (!rules) die(`agentpractices: ${p.id} has no Rules section at ${p.md_url}`);
    return out({
      ...p, catalog_generated: cat.generated, rules,
      citation: `${p.id}@${p.version}`,
      review_overdue: isOverdue(p.review_by),
      deprecated_notice: p.status === 'deprecated' ? `Deprecated. Follow ${p.superseded_by} instead.` : null,
    });
  }

  if (cmd === 'check') {
    if (!rest.length) die('agentpractices: check needs one or more BP-NNNN@x.y.z citations');
    const cat = await loadCatalog();
    const results = rest.map((s) => {
      const c = parseCitation(s);
      if (!c) return { citation: s, error: 'expected BP-NNNN@x.y.z' };
      const p = cat.practices.find((x) => x.id === c.id);
      if (!p) return { citation: s, error: `no practice ${c.id}` };
      return {
        citation: s, current_version: p.version, change: versionChange(c.version, p.version),
        version_matches: p.version === c.version,
        status: p.status, superseded_by: p.superseded_by, review_overdue: isOverdue(p.review_by), md_url: p.md_url,
      };
    });
    return out({ catalog_generated: cat.generated, results });
  }

  if (cmd === 'domains') {
    const tax = await loadTaxonomy();
    return out({ version: tax.version, domains: domainTree(tax.domains) });
  }

  if (cmd === 'sync') {
    const cat = await loadCatalog(true);
    const tax = await loadTaxonomy(true);
    // Practice bodies are keyed id@version, so a corrupt one would be served forever without this.
    if (existsSync(CACHE)) for (const f of readdirSync(CACHE)) if (f.endsWith('.md')) rmSync(join(CACHE, f));
    return out({ cached_at: CACHE, catalog_generated: cat.generated, taxonomy_version: tax.version, count: cat.count });
  }

  die('agentpractices: usage: practices.ts <list|get|check|domains|sync> [args]');
}

if (import.meta.main) {
  main().catch((e: Error) => die(`agentpractices: ${e.message}. Continue without a practice.`));
}
