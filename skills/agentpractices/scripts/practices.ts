// author: Stephen Eaton
// Fetch, filter and cite agentpractices.dev practices. Deterministic: the skill runs this, it does not re-derive the logic.
// Usage: bun skills/agentpractices/scripts/practices.ts <list|get|check|sync> [flags]
//   list  [--domain D.SWE] [--role implementer] [--stage plan] [--type guideline] [--status draft] [--limit N]
//   get   BP-NNNN
//   check BP-NNNN@x.y.z [more...]
//   sync  force a refetch of catalog.json
// Output: JSON on stdout. Network failure: one line on stderr, exit 1.
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const BASE_URL = process.env.AGENTPRACTICES_URL ?? 'https://agentpractices.dev/';
const CACHE = process.env.AGENTPRACTICES_CACHE ?? join(homedir(), '.cache', 'agentpractices');
const TTL_MS = 15 * 60 * 1000;

export interface Record_ {
  id: string; title: string; description: string; domain: string; domain_path: string[];
  type: string; roles: string[]; stage: string[]; status: string; version: string;
  updated: string; superseded_by: string | null; url: string; md_url: string; report_url: string;
}
export interface Catalog { version: number; taxonomy_version: string; generated: string; count: number; practices: Record_[] }
export interface Filters { domain?: string; role?: string; stage?: string; type?: string; status?: string; limit?: number }

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

function writeCache(name: string, value: unknown) {
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(cachePath(name), JSON.stringify(value, null, 2));
}

/** Only the configured origin is reachable: a hostile catalogue cannot redirect the fetch to another host. */
export const isAllowed = (url: string, base: string): boolean => {
  try { return new URL(url).origin === new URL(base).origin; } catch { return false; }
};

async function getText(path: string): Promise<string> {
  const url = /^https?:/i.test(path) ? path : new URL(path, BASE_URL).href;
  if (!isAllowed(url, BASE_URL)) throw new Error(`refusing ${url}: outside ${BASE_URL}`);
  const res = await fetch(url).catch((e: Error) => { throw new Error(`cannot reach ${url}: ${e.message}`); });
  if (!res.ok) throw new Error(`cannot reach ${url}: HTTP ${res.status}`);
  return res.text();
}

/** Fetch catalog.json when the cached copy is older than the TTL or the network copy is newer. */
export async function loadCatalog(force = false): Promise<Catalog> {
  const cached = readCache<Catalog>('catalog.json');
  if (cached && !force && isFresh(cacheAge('catalog.json'), Date.now())) return cached;
  let remote: Catalog;
  try { remote = JSON.parse(await getText('catalog.json')) as Catalog; } catch (e) {
    // A stale cache beats no practice; the skill reports staleness from catalog_generated.
    if (cached) return cached;
    throw e;
  }
  if (!force && cached && !isGeneratedNewer(remote.generated, cached.generated)) return cached;
  writeCache('catalog.json', remote);
  return remote;
}

async function getPracticeMd(p: Record_): Promise<string> {
  const name = `${p.id}@${p.version}.md`;
  try { return readFileSync(cachePath(name), 'utf8'); } catch { /* cache miss */ }
  const md = await getText(p.md_url);
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(cachePath(name), md);
  return md;
}

function flags(argv: string[]): Filters {
  const f: Filters = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '') as keyof Filters;
    const v = argv[i + 1];
    if (v === undefined) die(`agentpractices: ${argv[i]} needs a value`);
    if (key === 'limit') {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1) die(`agentpractices: --limit needs a positive integer, got ${v}`);
      f.limit = n;
    } else f[key] = v;
  }
  return f;
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const out = (v: unknown) => console.log(JSON.stringify(v, null, 2));

  if (cmd === 'list') {
    const cat = await loadCatalog();
    const f = flags(rest);
    const hits = filterPractices(cat.practices, f);
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
        citation: s, current_version: p.version, version_matches: p.version === c.version,
        status: p.status, superseded_by: p.superseded_by, md_url: p.md_url,
      };
    });
    return out({ catalog_generated: cat.generated, results });
  }

  if (cmd === 'sync') {
    const cat = await loadCatalog(true);
    return out({ cached_at: CACHE, catalog_generated: cat.generated, count: cat.count });
  }

  die('agentpractices: usage: practices.ts <list|get|check|sync> [args]');
}

if (import.meta.main) {
  main().catch((e: Error) => die(`agentpractices: ${e.message}. Continue without a practice.`));
}
