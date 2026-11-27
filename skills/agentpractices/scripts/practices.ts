// author: Stephen Eaton
// Fetch, filter and cite agentpractices.dev practices. Deterministic: the skill runs this, it does not re-derive the logic.
// Usage: bun <skill base directory>/scripts/practices.ts <list|get|check|domains|sync> [flags]
//   list  [--domain D.SWE] [--domain D.AGT.SKL] [--role implementer] [--stage plan] [--type guideline] [--status draft] [--limit N]
//   get   BP-NNNN
//   check BP-NNNN@x.y.z [more...]
//   domains  the domain tree from taxonomy.json
//   sync  force a refetch of catalog.json and taxonomy.json
// Global flags: --help, --json, --plain, --quiet, --offline, --timeout MS, --dry-run. See HELP below.
// Output: JSON on stdout. Diagnostics and the network message go to stderr. Exit codes: 0 success, 1 failure, 2 usage error.
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const BASE_URL = process.env.AGENTPRACTICES_URL ?? 'https://agentpractices.dev/';
// XDG: XDG_CACHE_HOME wins, then ~/.cache. AGENTPRACTICES_CACHE overrides both for a test or a sandbox.
const CACHE = process.env.AGENTPRACTICES_CACHE
  ?? join(process.env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'agentpractices');
const TTL_MS = 15 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 15_000;
const REPORT_URL = new URL('contributing/report-a-problem/', BASE_URL).href;

/** Runtime options set once from the global flags: they reach getText and loadCached without a long argument trail. */
let quiet = false, offline = false, timeoutMs = DEFAULT_TIMEOUT_MS;

/** A usage error: exit 2 (BP-0001 rule 5). */
export class UsageError extends Error {}
/** A network or origin failure: expected, so one line and no version or report path. */
export class NetworkError extends Error {}

/** The skill version, read from SKILL.md beside scripts/. A bug report needs a version a person can name. */
export function clientVersion(): string {
  try {
    const m = /^\s+version:\s*(\S+)$/m.exec(readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8'));
    return m ? m[1] : 'unknown';
  } catch { return 'unknown'; }
}

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

export const isFresh = (fetchedAtMs: number, nowMs: number, ttlMs = TTL_MS) => nowMs - fetchedAtMs < ttlMs;

/** Content identity: the version and content hash of every practice, sorted. Build time is not part of it (BP-0007 rule 12). */
export const contentIdentity = (cat: Catalog): string =>
  cat.practices.map((p) => `${p.id}@${p.version}@${p.content_hash ?? ''}`).sort().join('\n');

const versionParts = (v: string) => v.split('.').map((x) => Number.parseInt(x, 10) || 0);

/** A remote catalogue is a rollback when any practice it carries is older than the cached copy (issue #27). */
export function isRollback(remote: Catalog, cached: Catalog): boolean {
  const current = new Map(cached.practices.map((p) => [p.id, p.version]));
  return remote.practices.some((p) => {
    const c = current.get(p.id);
    if (!c) return false;
    const a = versionParts(p.version), b = versionParts(c);
    for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i];
    return false;
  });
}

/** Usage errors exit 2, every other failure exits 1 (BP-0001 rule 5). */
const die = (msg: string, code = 2): never => { console.error(msg); process.exit(code); };

/** A cache file name must stay inside the cache directory: `version` arrives from the catalogue unvalidated. */
export const isCacheName = (name: string) => /^[A-Za-z0-9._@-]+$/.test(name);

function cachePath(name: string) {
  if (!isCacheName(name)) throw new Error(`refusing cache file name ${name}`);
  return join(CACHE, name);
}

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

/** Best effort: a read-only cache directory must not lose a value already fetched. */
function writeCache(name: string, value: unknown) {
  try {
    mkdirSync(CACHE, { recursive: true });
    writeAtomic(cachePath(name), JSON.stringify(value, null, 2));
  } catch { /* read-only cache: the fetched value is still returned */ }
}

/** Only the configured origin is reachable: a hostile catalogue cannot redirect the fetch to another host. */
export const isAllowed = (url: string, base: string): boolean => {
  try { return new URL(url).origin === new URL(base).origin; } catch { return false; }
};

/** A catalogue md_url is an absolute production URL: fetch its path from the configured base instead. */
export const resolveMd = (mdUrl: string, base: string): string => new URL(new URL(mdUrl, base).pathname, base).href;

/** Follow redirects by hand, so every hop is checked against the configured origin.
 *  Each call names its host on stderr first (BP-0092 rule 3) and carries a timeout (BP-0086 rule 5). */
async function getText(path: string): Promise<string> {
  let url = /^https?:/i.test(path) ? path : new URL(path, BASE_URL).href;
  for (let hop = 0; hop < 4; hop++) {
    if (!isAllowed(url, BASE_URL)) throw new NetworkError(`refusing ${url}: outside ${BASE_URL}`);
    const target = new URL(url);
    if (!quiet) console.error(`agentpractices: fetching ${target.host}${target.pathname}`);
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) })
      .catch((e: Error) => { throw new NetworkError(`cannot reach ${url}: ${e.message}`); });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) throw new NetworkError(`cannot reach ${url}: HTTP ${res.status} without a Location header`);
      url = new URL(location, url).href;
      continue;
    }
    if (!res.ok) throw new NetworkError(`cannot reach ${url}: HTTP ${res.status}`);
    return res.text();
  }
  throw new NetworkError(`cannot reach ${path}: too many redirects`);
}

/** Read a published JSON file from the cache when the TTL has not passed, else from the network. A stale cache beats no data.
 *  The TTL is a network rate limit, not an identity decision: whether the remote copy replaces the cached one is decided by
 *  content identity (BP-0007 rule 12), so a build timestamp never drives the cache. */
async function loadCached<T>(name: string, force: boolean, isNewer: (remote: T, cached: T) => boolean): Promise<T> {
  const cached = readCache<T>(name);
  if (cached && !force && isFresh(cacheAge(name), Date.now())) return cached;
  if (offline) {
    if (cached) return cached;
    throw new NetworkError(`offline and no cached ${name}`);
  }
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

/** Fetch catalog.json. The remote copy replaces the cached one when its content identity differs and it is not a rollback. */
export const loadCatalog = (force = false) =>
  loadCached<Catalog>('catalog.json', force, (remote, cached) =>
    contentIdentity(remote) !== contentIdentity(cached) && !isRollback(remote, cached));

/** Fetch taxonomy.json, the domain tree and facet values that every flag value is checked against. */
export const loadTaxonomy = (force = false) =>
  loadCached<TaxonomyJson>('taxonomy.json', force, (remote, cached) => remote.version !== cached.version);

async function getPracticeMd(p: Record_): Promise<string> {
  const name = `${p.id}@${p.version}.md`;
  try { return readFileSync(cachePath(name), 'utf8'); } catch { /* cache miss */ }
  const md = await getText(resolveMd(p.md_url, BASE_URL));
  try {
    mkdirSync(CACHE, { recursive: true });
    writeAtomic(cachePath(name), md);
  } catch { /* read-only cache: the fetched body is still returned */ }
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

/** Parsed flags, or a one-line usage error on stderr and exit 2. */
function flagsOrDie(argv: string[], vocab: Vocabulary): Filters {
  try { return parseFlags(argv, vocab); } catch (e) { die((e as Error).message); }
}

const COMMANDS = ['list', 'get', 'check', 'domains', 'sync'] as const;

export interface Globals {
  help: boolean; json: boolean; plain: boolean; quiet: boolean; offline: boolean; dryRun: boolean; timeoutMs: number;
}

/** Pull the global flags out of argv, wherever they sit. The rest goes to the subcommand (BP-0094 rule 8). */
export function parseGlobals(argv: string[]): { globals: Globals; rest: string[] } {
  const g: Globals = {
    help: false, json: false, plain: false, quiet: false, offline: false, dryRun: false, timeoutMs: DEFAULT_TIMEOUT_MS,
  };
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help' || a === 'help') { g.help = true; continue; }
    if (a === '--json') { g.json = true; continue; }        // output is always JSON; accepted so a caller may pass it
    if (a === '--plain') { g.plain = true; continue; }
    if (a === '-q' || a === '--quiet') { g.quiet = true; continue; }
    if (a === '--offline') { g.offline = true; continue; }
    if (a === '--dry-run') { g.dryRun = true; continue; }
    if (a === '--timeout') {
      const v = argv[++i];
      const n = Number(v);
      if (!v || !Number.isInteger(n) || n < 1) throw new UsageError('agentpractices: --timeout needs a positive integer in milliseconds');
      g.timeoutMs = n;
      continue;
    }
    rest.push(a);
  }
  return { globals: g, rest };
}

const editDistance = (a: string, b: string): number => {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = keep;
    }
  }
  return row[b.length];
};

/** The closest command to an unknown input, for the suggestion (BP-0094 rule 9). The caller must not run it. */
export function nearestCommand(input: string, commands: readonly string[] = COMMANDS): string | null {
  let best: { cmd: string; d: number } | null = null;
  for (const cmd of commands) {
    const d = editDistance(input, cmd);
    if (!best || d < best.d) best = { cmd, d };
  }
  return best && best.d <= 2 ? best.cmd : null;
}

const helpText = () => `agentpractices — apply the published practices at agentpractices.dev

Usage:
  practices.ts list [flags]
  practices.ts get BP-NNNN
  practices.ts check BP-NNNN@x.y.z [...]
  practices.ts domains
  practices.ts sync [--dry-run]

List flags:
  --domain D.SWE[,...]   filter by domain; a parent domain includes its children
  --role ROLE            filter by role; a practice with role "any" matches every role
  --stage STAGE          filter by stage
  --type TYPE            filter by type
  --status STATUS        filter by status
  --limit N              return at most N practices

Global flags:
  -h, --help             show this help and exit
  --json                 accepted; the output is always JSON
  --plain                one-line JSON with no indentation
  -q, --quiet            suppress the network message on stderr
  --offline              use the cache only; no network call
  --timeout MS           network timeout in milliseconds (default ${DEFAULT_TIMEOUT_MS})
  --dry-run              report what a state-changing command would do

Exit codes:
  0  success
  1  failure (network, cache or data)
  2  usage error

External service: ${BASE_URL} only. Cache: $XDG_CACHE_HOME/agentpractices or ~/.cache/agentpractices.

Examples:
  practices.ts list --domain D.SWE.CLI --role implementer --stage build
  practices.ts get BP-0001
  practices.ts check BP-0001@1.1.0

Version ${clientVersion()}. Report a problem: ${REPORT_URL}`;

function domainTree(nodes: DomainNode[]): unknown[] {
  return nodes.map((n) => ({ id: n.id, label: n.label, children: domainTree(n.children) }));
}

async function main() {
  const { globals, rest: argv } = parseGlobals(process.argv.slice(2));
  quiet = globals.quiet;
  offline = globals.offline;
  timeoutMs = globals.timeoutMs;
  const out = (v: unknown) => console.log(globals.plain ? JSON.stringify(v) : JSON.stringify(v, null, 2));

  if (globals.help) { console.log(helpText()); return; }
  const [cmd, ...rest] = argv;
  if (!cmd) { console.error(helpText()); process.exit(2); }
  if (!(COMMANDS as readonly string[]).includes(cmd)) {
    const near = nearestCommand(cmd);
    die(`agentpractices: unknown command ${cmd}.${near ? ` Did you mean ${near}?` : ''} Run with --help for the commands.`);
  }
  if (cmd !== 'list') {
    const stray = rest.find((a) => a.startsWith('-'));
    if (stray) die(`agentpractices: unknown flag ${stray}. Run with --help for the flags.`);
  }

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
    if (!rules) die(`agentpractices: ${p.id} has no Rules section at ${p.md_url}. Run sync to refetch.`, 1);
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
    // Practice bodies are keyed id@version, so a corrupt one would be served forever without the delete.
    const bodies = existsSync(CACHE) ? readdirSync(CACHE).filter((f) => f.endsWith('.md')) : [];
    if (globals.dryRun) {
      return out({ dry_run: true, cache: CACHE, would_delete_bodies: bodies.length, would_refetch: ['catalog.json', 'taxonomy.json'] });
    }
    const cat = await loadCatalog(true);
    const tax = await loadTaxonomy(true);
    for (const f of bodies) rmSync(join(CACHE, f));
    return out({ cached_at: CACHE, catalog_generated: cat.generated, taxonomy_version: tax.version, count: cat.count });
  }

  die('agentpractices: usage: practices.ts <list|get|check|domains|sync> [args]. Run with --help.');
}

if (import.meta.main) {
  main().catch((e: Error) => {
    if (e instanceof UsageError) die(`agentpractices: ${e.message}`);
    if (e instanceof NetworkError) die(`agentpractices: ${e.message}. Continue without a practice.`, 1);
    // An unexpected error: BP-0087 rule 7 wants the version and a report path.
    console.error(`agentpractices: ${e.message}`);
    console.error(`version ${clientVersion()}, report: ${REPORT_URL}`);
    process.exit(1);
  });
}
