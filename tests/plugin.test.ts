// author: Stephen Eaton
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Every path here is anchored to the repo root, so the suite runs from any working directory.
const ROOT = join(import.meta.dir, '..');
import { loadTaxonomy } from '../scripts/lib/taxonomy';
import {
  contentIdentity, filterPractices, flattenDomains, isAllowed, isCacheName, isFresh, isOverdue, isRollback, matchesDomain,
  matchesRole, nearestCommand, nearestDomains, nearestIds, parseCitation, parseFlags, parseGlobals, resolveMd, rulesSection,
  versionChange, vocabulary,
  type Catalog, type Record_, type TaxonomyJson,
} from '../skills/agentpractices/scripts/practices';

const p = (over: Partial<Record_> = {}): Record_ => ({
  id: 'BP-0001', title: 't', description: 'd', domain: 'D.SWE.CLI', domain_path: ['Software Engineering'],
  type: 'guideline', roles: ['any'], stage: ['build'], status: 'draft', version: '1.0.0',
  updated: '2026-11-24', superseded_by: null, url: 'u', md_url: 'm', report_url: 'r', ...over,
});

describe('domain filter', () => {
  test('exact id matches', () => expect(matchesDomain('D.SWE', 'D.SWE')).toBe(true));
  test('child matches parent', () => expect(matchesDomain('D.SWE.CLI', 'D.SWE')).toBe(true));
  test('prefix without a dot boundary does not match', () => expect(matchesDomain('D.SWEX', 'D.SWE')).toBe(false));
  test('sibling does not match', () => expect(matchesDomain('D.SEC', 'D.SWE')).toBe(false));
});

describe('role filter', () => {
  test('explicit role matches', () => expect(matchesRole(['reviewer'], 'reviewer')).toBe(true));
  test('any matches every role', () => expect(matchesRole(['any'], 'reviewer')).toBe(true));
  test('other roles do not match', () => expect(matchesRole(['planner'], 'reviewer')).toBe(false));
});

describe('filterPractices', () => {
  const set = [
    p({ id: 'BP-0001', domain: 'D.SWE.CLI' }),
    p({ id: 'BP-0002', domain: 'D.SWE', roles: ['implementer'], stage: ['verify'] }),
    p({ id: 'BP-0003', domain: 'D.SEC', type: 'checklist' }),
  ];
  test('no filters returns everything', () => expect(filterPractices(set, {})).toHaveLength(3));
  test('comma-separated domains', () => expect(filterPractices(set, { domain: 'D.SWE,D.SEC' }).map((x) => x.id))
    .toEqual(['BP-0001', 'BP-0002', 'BP-0003']));
  test('domain prefix includes children', () => expect(filterPractices(set, { domain: 'D.SWE' }).map((x) => x.id))
    .toEqual(['BP-0001', 'BP-0002']));
  test('role includes any', () => expect(filterPractices(set, { role: 'reviewer' }).map((x) => x.id))
    .toEqual(['BP-0001', 'BP-0003']));
  test('stage, type and status combine', () => {
    expect(filterPractices(set, { stage: 'verify' })).toHaveLength(1);
    expect(filterPractices(set, { type: 'checklist' })).toHaveLength(1);
    expect(filterPractices(set, { status: 'adopted' })).toHaveLength(0);
  });
  test('limit truncates', () => expect(filterPractices(set, { limit: 2 })).toHaveLength(2));
});

describe('citations', () => {
  test('parses id and version', () => expect(parseCitation(' BP-0074@1.0.0 ')).toEqual({ id: 'BP-0074', version: '1.0.0' }));
  test('rejects a missing version', () => expect(parseCitation('BP-0074')).toBeNull());
  test('rejects a bad id', () => expect(parseCitation('BP-74@1.0.0')).toBeNull());
  test('nearest ids are numeric neighbours', () => {
    expect(nearestIds([{ id: 'BP-0001' }, { id: 'BP-0074' }, { id: 'BP-0076' }], 'BP-0075')).toEqual(['BP-0074', 'BP-0076', 'BP-0001']);
  });
});

describe('rulesSection', () => {
  const md = '# Title\n\nintro\n\n## Rules\n\n1. **MUST** do a thing.\n2. **MUST** do another.\n\n## When to apply\n\nSomewhere.\n';
  test('returns the section verbatim up to the next heading', () => {
    expect(rulesSection(md)).toBe('## Rules\n\n1. **MUST** do a thing.\n2. **MUST** do another.');
  });
  test('returns null without a Rules section', () => expect(rulesSection('## Examples\n\nx')).toBeNull());
  test('handles Rules as the last section', () => expect(rulesSection('## Rules\n\n1. **MUST** x.')).toBe('## Rules\n\n1. **MUST** x.'));
});

describe('cache identity', () => {
  const at = (generated: string, ...over: Partial<Record_>[]): Catalog => ({
    version: 1, taxonomy_version: '0.0.0', generated, count: over.length,
    practices: over.map((o, i) => p({ id: `BP-000${i + 1}`, ...o })),
  });

  // BP-0007 rule 12: cache on content identity, never on the build clock (issue #27).
  test('the same practices have the same identity whatever the generated time', () => {
    const a = at('2026-11-24T00:00:00Z', { version: '1.0.0', content_hash: 'h1' });
    const b = at('2026-11-25T00:00:00Z', { version: '1.0.0', content_hash: 'h1' });
    expect(contentIdentity(a)).toBe(contentIdentity(b));
  });
  test('a version or content hash change changes the identity', () => {
    const a = at('x', { version: '1.0.0', content_hash: 'h1' });
    expect(contentIdentity(at('x', { version: '1.0.1', content_hash: 'h1' }))).not.toBe(contentIdentity(a));
    expect(contentIdentity(at('x', { version: '1.0.0', content_hash: 'h2' }))).not.toBe(contentIdentity(a));
  });
  // Issue #27: a scheduled build can publish old content with a new timestamp. The older version must lose.
  test('an older practice in the remote copy is a rollback', () => {
    const cached = at('2026-11-25T00:00:00Z', { version: '1.1.0', content_hash: 'h2' });
    const old = at('2026-11-26T00:00:00Z', { version: '1.0.0', content_hash: 'h1' });
    expect(isRollback(old, cached)).toBe(true);
    expect(isRollback(cached, old)).toBe(false);
    expect(isRollback(cached, cached)).toBe(false);
  });
  test('a stale cache refetches, a fresh one does not', () => {
    const now = 1_000_000;
    expect(isFresh(now - 16 * 60 * 1000, now)).toBe(false);
    expect(isFresh(now - 60 * 1000, now)).toBe(true);
  });
});

describe('flag parsing', () => {
  const tax = {
    version: '0.0.1',
    domains: [
      { id: 'D.AGT', label: 'Agent Engineering', children: [
        { id: 'D.AGT.SKL', label: 'Skills', children: [] },
        { id: 'D.AGT.TOOL', label: 'Tool Use', children: [] },
      ] },
      { id: 'D.SWE', label: 'Software Engineering', children: [] },
    ],
    facets: { role: [{ id: 'any' }, { id: 'implementer' }], stage: [{ id: 'build' }], type: [{ id: 'guideline' }], status: [{ id: 'draft' }] },
  } as TaxonomyJson;
  const v = vocabulary(tax);

  test('repeated --domain adds up like the comma form', () => {
    expect(parseFlags(['--domain', 'D.AGT.SKL', '--domain', 'D.AGT.TOOL'], v).domain).toBe('D.AGT.SKL,D.AGT.TOOL');
    const set = [p({ id: 'BP-0001', domain: 'D.AGT.SKL' }), p({ id: 'BP-0002', domain: 'D.AGT.TOOL' }), p({ id: 'BP-0003', domain: 'D.SWE' })];
    expect(filterPractices(set, parseFlags(['--domain', 'D.AGT.SKL', '--domain', 'D.AGT.TOOL'], v)).map((x) => x.id))
      .toEqual(filterPractices(set, { domain: 'D.AGT.SKL,D.AGT.TOOL' }).map((x) => x.id));
  });
  test('an unknown domain names the closest valid IDs', () => {
    expect(() => parseFlags(['--domain', 'D.AGT.TLS'], v)).toThrow(/D\.AGT\.TOOL/);
  });
  test('an unknown flag is a usage error that names it', () => {
    expect(() => parseFlags(['--foo', 'bar'], v)).toThrow(/unknown flag --foo/);
  });
  test('a flag without a value is a usage error', () => {
    expect(() => parseFlags(['--domain'], v)).toThrow(/needs a value/);
  });
  test('--limit needs a positive integer', () => {
    expect(() => parseFlags(['--limit', '0'], v)).toThrow(/positive integer/);
    expect(() => parseFlags(['--limit', 'x'], v)).toThrow(/positive integer/);
    expect(parseFlags(['--limit', '2'], v).limit).toBe(2);
  });
  test('facet values are validated against the taxonomy', () => {
    expect(() => parseFlags(['--role', 'wizard'], v)).toThrow(/wizard/);
    expect(() => parseFlags(['--stage', 'ship'], v)).toThrow(/ship/);
    expect(() => parseFlags(['--type', 'essay'], v)).toThrow(/essay/);
    expect(() => parseFlags(['--status', 'blessed'], v)).toThrow(/blessed/);
  });
  test('valid flags parse into filters', () => {
    expect(parseFlags(['--role', 'implementer', '--stage', 'build', '--type', 'guideline', '--status', 'draft', '--limit', '2'], v))
      .toEqual({ role: 'implementer', stage: 'build', type: 'guideline', status: 'draft', limit: 2 });
  });
});

describe('domain tree', () => {
  const tax = {
    version: '0.0.1',
    domains: [{ id: 'D.AGT', label: 'Agent Engineering', children: [{ id: 'D.AGT.SKL', label: 'Skills', children: [] }] }],
    facets: { role: [{ id: 'any' }] },
  } as TaxonomyJson;
  test('flattenDomains walks parents before children', () => {
    expect(flattenDomains(tax.domains).map((d) => d.id)).toEqual(['D.AGT', 'D.AGT.SKL']);
  });
  test('vocabulary holds the domain IDs and the facet values', () => {
    expect(vocabulary(tax)).toEqual({ domains: ['D.AGT', 'D.AGT.SKL'], facets: { role: ['any'] } });
  });
  test('nearestDomains prefers a shared prefix', () => {
    expect(nearestDomains(['D.AGT', 'D.AGT.SKL', 'D.AGT.TOOL', 'D.SWE'], 'D.AGT.TWO')).toContain('D.AGT.TOOL');
  });
});

describe('version change', () => {
  test('the same version has not changed', () => expect(versionChange('1.0.0', '1.0.0')).toBe('none'));
  test('patch, minor and major are named', () => {
    expect(versionChange('1.0.0', '1.0.1')).toBe('patch');
    expect(versionChange('1.0.0', '1.1.0')).toBe('minor');
    expect(versionChange('1.0.0', '2.0.0')).toBe('major');
  });
  test('a cited version ahead of the catalogue is older', () => {
    expect(versionChange('1.2.0', '1.1.9')).toBe('older');
    expect(versionChange('2.0.0', '1.9.9')).toBe('older');
  });
  test('comparison is numeric, not lexical', () => {
    expect(versionChange('1.9.0', '1.10.0')).toBe('minor');
    expect(versionChange('1.10.0', '1.9.0')).toBe('older');
  });
});

describe('review dates', () => {
  test('a date before today is overdue', () => expect(isOverdue('2026-01-01', '2026-11-25')).toBe(true));
  test('today and future dates are not overdue', () => {
    expect(isOverdue('2026-11-25', '2026-11-25')).toBe(false);
    expect(isOverdue('2027-01-01', '2026-11-25')).toBe(false);
  });
  test('a record without a review date is not overdue', () => expect(isOverdue(undefined, '2026-11-25')).toBe(false));
});

describe('md_url resolution', () => {
  // Bug 3: a production md_url must be fetched from the configured base, not from production.
  test('an absolute production md_url resolves onto the configured base', () => {
    expect(resolveMd('https://agentpractices.dev/a/b.md', 'http://localhost:4330/')).toBe('http://localhost:4330/a/b.md');
    expect(isAllowed(resolveMd('https://agentpractices.dev/a/b.md', 'http://localhost:4330/'), 'http://localhost:4330/')).toBe(true);
  });
  // A catalogue is remote data: its md_url must not be able to move the fetch off the base origin.
  test('a hostile md_url cannot leave the base origin', () => {
    expect(resolveMd('https://evil.test/a.md', 'https://agentpractices.dev/')).toBe('https://agentpractices.dev/a.md');
    expect(isAllowed(resolveMd('https://evil.test/a.md', 'https://agentpractices.dev/'), 'https://agentpractices.dev/')).toBe(true);
  });
});

describe('cache file names', () => {
  // A catalogue supplies `version` unvalidated, so it must not be able to name a file outside the cache.
  test('a practice id and version are accepted', () => expect(isCacheName('BP-0001@1.0.0.md')).toBe(true));
  test('a version that would escape the cache directory is refused', () => {
    expect(isCacheName('BP-0001@../../../../tmp/evil.md')).toBe(false);
    expect(isCacheName('/etc/passwd')).toBe(false);
    expect(isCacheName('a\\b.md')).toBe(false);
  });
});

describe('plugin packaging', () => {
  const plugin = JSON.parse(readFileSync(join(ROOT, '.claude-plugin/plugin.json'), 'utf8'));
  const market = JSON.parse(readFileSync(join(ROOT, '.claude-plugin/marketplace.json'), 'utf8'));
  const skill = readFileSync(join(ROOT, 'skills/agentpractices/SKILL.md'), 'utf8');
  const script = readFileSync(join(ROOT, 'skills/agentpractices/scripts/practices.ts'), 'utf8');
  const taxonomy = loadTaxonomy(join(ROOT, 'taxonomy'));

  test('the plugin and the skill carry the same version', () => {
    const fmVersion = /^\s+version:\s*(\S+)$/m.exec(skill)![1];
    expect(plugin.version).toBe(fmVersion);
  });

  test('plugin and marketplace names agree', () => {
    expect(plugin.name).toBe('agentpractices');
    expect(market.plugins.map((x: { name: string }) => x.name)).toContain(plugin.name);
  });
  test('skill frontmatter name matches its directory', () => {
    const fm = /^---\n([\s\S]*?)\n---/.exec(skill);
    expect(fm).not.toBeNull();
    expect(/^name:\s*agentpractices$/m.test(fm![1])).toBe(true);
    const desc = /^description:\s*(.+)$/m.exec(fm![1])![1];
    expect(desc.length).toBeLessThanOrEqual(1024);
    expect(desc).toContain('USE WHEN');
  });
  // Bug 1: installed as a plugin the skill runs in the user's project, so no command may be repo-relative.
  test('every SKILL.md command runs the script from the skill base directory', () => {
    const commands = skill.split('\n').filter((l) => /^\s*bun\s/.test(l));
    expect(commands.length).toBeGreaterThan(0);
    for (const line of commands) expect(line).toContain('<skill base directory>/scripts/practices.ts');
    expect(skill).not.toContain('bun skills/agentpractices/scripts/practices.ts');
    expect(existsSync(SCRIPT)).toBe(true);
  });
  // Bug 2c: a domain ID in SKILL.md that does not exist sends the agent to an empty result.
  test('every domain ID in SKILL.md exists in the taxonomy', () => {
    const ids = [...skill.matchAll(/\bD\.[A-Z]{3}(?:\.[A-Z]+)?/g)].map((m) => m[0]);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(taxonomy.byId.has(id)).toBe(true);
  });
  test('the skill declares it needs Bun', () => {
    expect(/^compatibility:.*\bBun\b/m.test(skill)).toBe(true);
  });
  // AC8: no telemetry and no network endpoint other than agentpractices.dev.
  test('the script has one network host', () => {
    const hosts = [...script.matchAll(/https?:\/\/[^\s'"`)]+/g)].map((m) => new URL(m[0]).host);
    expect([...new Set(hosts)]).toEqual(['agentpractices.dev']);
    expect(/analytics|telemetry|sentry|posthog|mixpanel/i.test(script)).toBe(false);
  });
  // A catalogue is remote data, so its md_url must not be able to move the fetch to another host.
  test('only the configured origin is fetched', () => {
    expect(isAllowed('https://agentpractices.dev/a.md', 'https://agentpractices.dev/')).toBe(true);
    expect(isAllowed('https://agentpractices.dev.evil.test/a.md', 'https://agentpractices.dev')).toBe(false);
    expect(isAllowed('https://evil.test/a.md', 'https://agentpractices.dev/')).toBe(false);
    expect(isAllowed('file:///etc/passwd', 'https://agentpractices.dev/')).toBe(false);
  });
  test('a cached catalogue still satisfies the type', () => {
    const cat: Catalog = { version: 1, taxonomy_version: '0.0.0', generated: '', count: 0, practices: [] };
    expect(filterPractices(cat.practices, {})).toEqual([]);
  });
});

// End to end: the script as a subprocess against a local build of the site.
const SCRIPT = join(ROOT, 'skills/agentpractices/scripts/practices.ts');
const DIST = join(ROOT, 'dist');

/** dist/ is usable when the catalogue carries the fields this suite reads. */
const distIsCurrent = () => {
  try {
    const cat = JSON.parse(readFileSync(join(DIST, 'catalog.json'), 'utf8'));
    return !!cat.practices?.[0]?.review_by && existsSync(join(DIST, 'taxonomy.json'));
  } catch { return false; }
};

// Build once, here, rather than per test. shortcut: a build inside `bun test` can race another
// suite reading dist/; upgrade to a temp output dir if that ever bites.
const built = distIsCurrent() || Bun.spawnSync(['bun', 'run', 'build'], { cwd: ROOT, stdout: 'ignore', stderr: 'ignore' }).exitCode === 0;
if (!built) console.warn('plugin e2e: SKIPPED — `bun run build` failed, so dist/ could not be served. Not a pass.');

(built ? describe : describe.skip)('script against a local build', () => {
  const catalog = JSON.parse(readFileSync(join(DIST, 'catalog.json'), 'utf8')) as Catalog;
  let server: ReturnType<typeof Bun.serve>;
  let cache: string;
  let base: string;

  beforeAll(() => {
    cache = mkdtempSync(join(tmpdir(), 'agentpractices-e2e-'));
    server = Bun.serve({
      port: 0,
      fetch(req) {
        const path = decodeURIComponent(new URL(req.url).pathname);
        const file = join(DIST, path.endsWith('/') ? `${path}index.html` : path);
        return existsSync(file) ? new Response(Bun.file(file)) : new Response('not found', { status: 404 });
      },
    });
    base = `http://localhost:${server.port}/`;
  });
  afterAll(() => {
    server.stop(true);
    rmSync(cache, { recursive: true, force: true });
  });

  // Async on purpose: the local server runs in this process, so a blocking spawn would deadlock.
  const spawnAt = async (url: string, cacheDir: string, ...args: string[]) => {
    const p = Bun.spawn(['bun', SCRIPT, ...args], {
      env: { ...process.env, AGENTPRACTICES_URL: url, AGENTPRACTICES_CACHE: cacheDir },
      stdout: 'pipe', stderr: 'pipe',
    });
    const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
    return { code, out, err };
  };
  const run = (...args: string[]) => spawnAt(base, cache, ...args);

  // BP-0092 rule 3: a network call names its host on stderr. Every other stderr line is a failure.
  const networkLines = (err: string) => err.split('\n').filter((l) => l.startsWith('agentpractices: fetching '));
  const otherErr = (err: string) => err.split('\n').filter((l) => l && !l.startsWith('agentpractices: fetching '));

  test('list with a repeated --domain returns both domains', async () => {
    const r = await run('list', '--domain', 'D.AGT.SKL', '--domain', 'D.AGT.TOOL');
    expect(otherErr(r.err)).toEqual([]);
    expect(r.code).toBe(0);
    const j = JSON.parse(r.out);
    expect(j.applied_filters.domain).toBe('D.AGT.SKL,D.AGT.TOOL');
    expect(j.count).toBeGreaterThan(0);
    expect(new Set(j.practices.map((x: Record_ & { review_overdue: boolean }) => x.domain))).toEqual(new Set(['D.AGT.SKL', 'D.AGT.TOOL']));
    expect(j.practices.every((x: { review_overdue: boolean }) => typeof x.review_overdue === 'boolean')).toBe(true);
  });

  test('an unknown domain exits 2 with one line naming the closest IDs', async () => {
    const r = await run('list', '--domain', 'D.AGT.TLS');
    expect(r.code).toBe(2);
    expect(r.out).toBe('');
    expect(otherErr(r.err)).toHaveLength(1);
    expect(r.err).toContain('D.AGT.TOOL');
  });

  test('an unknown flag exits 2 with one usage line', async () => {
    const r = await run('list', '--foo', 'bar');
    expect(r.code).toBe(2);
    expect(r.out).toBe('');
    expect(otherErr(r.err)).toHaveLength(1);
    expect(r.err).toContain('--foo');
    expect(r.err).toContain('--domain');
  });

  // BP-0001 rule 15: -h and --help give help and exit 0, with no arguments the usage goes to stderr and exits 2.
  test('-h and --help print help and exit 0', async () => {
    for (const flag of ['-h', '--help']) {
      const r = await run(flag);
      expect(r.code).toBe(0);
      expect(r.out).toContain('Usage:');
      expect(r.out).toContain('Exit codes:');
      expect(r.out).toContain('agentpractices.dev');
      expect(otherErr(r.err)).toEqual([]);
    }
  });
  test('no arguments prints help on stderr and exits 2', async () => {
    const r = await run();
    expect(r.code).toBe(2);
    expect(r.out).toBe('');
    expect(r.err).toContain('Usage:');
  });

  // BP-0094 rule 9: suggest the near miss and never run it.
  test('an unknown command suggests the near miss and does not run it', async () => {
    const r = await run('lis');
    expect(r.code).toBe(2);
    expect(r.out).toBe('');
    expect(r.err).toContain('Did you mean list?');
  });

  // BP-0086 rule 5: a timeout flag, with a usage error on a bad value.
  test('--timeout is accepted and validated', async () => {
    expect((await run('domains', '--timeout', '5000')).code).toBe(0);
    const bad = await run('domains', '--timeout', 'soon');
    expect(bad.code).toBe(2);
    expect(bad.err).toContain('--timeout');
  });

  // BP-0092 rule 4: --offline uses the cache and makes no request.
  test('--offline uses the cache, and fails clearly with no cache', async () => {
    const warm = await run('domains');
    expect(warm.code).toBe(0);
    const cached = await run('domains', '--offline');
    expect(cached.code).toBe(0);
    expect(networkLines(cached.err)).toEqual([]);
    const empty = mkdtempSync(join(tmpdir(), 'agentpractices-nocache-'));
    try {
      const cold = await spawnAt(base, empty, 'domains', '--offline');
      expect(cold.code).toBe(1);
      expect(cold.err).toContain('offline');
      expect(networkLines(cold.err)).toEqual([]);
    } finally { rmSync(empty, { recursive: true, force: true }); }
  });

  // BP-0001 rule 6: --dry-run on the one command that changes state.
  test('sync --dry-run reports the plan and changes nothing', async () => {
    const r = await run('sync', '--dry-run');
    expect(r.code).toBe(0);
    const j = JSON.parse(r.out);
    expect(j.dry_run).toBe(true);
    expect(typeof j.would_delete_bodies).toBe('number');
  });

  test('get BP-0074 returns the rules and a citation', async () => {
    const r = await run('get', 'BP-0074');
    expect(otherErr(r.err)).toEqual([]);
    expect(r.code).toBe(0);
    const j = JSON.parse(r.out);
    expect(j.id).toBe('BP-0074');
    expect(j.citation).toBe(`BP-0074@${j.version}`);
    expect(j.rules.startsWith('## Rules')).toBe(true);
    expect(j.rules).toContain('MUST');
    expect(typeof j.review_overdue).toBe('boolean');
  });

  // A practice body is cached under id@version, so a corrupt one would be served forever. sync must heal it.
  test('sync clears a corrupt practice body so the next get succeeds', async () => {
    const first = await run('get', 'BP-0074');
    expect(first.code).toBe(0);
    const j = JSON.parse(first.out);
    writeFileSync(join(cache, `${j.id}@${j.version}.md`), '## Truncated');
    expect((await run('get', 'BP-0074')).code).toBe(1);
    expect((await run('sync')).code).toBe(0);
    const healed = await run('get', 'BP-0074');
    expect(healed.code).toBe(0);
    expect(JSON.parse(healed.out).rules.startsWith('## Rules')).toBe(true);
  });

  // fetch follows redirects unless told not to, so a 302 would carry the catalogue off the configured origin.
  test('a redirect off the base origin is refused', async () => {
    const elsewhere = Bun.serve({ port: 0, fetch: () => new Response('{"practices":[]}') });
    const redirector = Bun.serve({
      port: 0,
      fetch: () => new Response(null, { status: 302, headers: { location: `http://localhost:${elsewhere.port}/catalog.json` } }),
    });
    const fresh = mkdtempSync(join(tmpdir(), 'agentpractices-redirect-'));
    try {
      const r = await spawnAt(`http://localhost:${redirector.port}/`, fresh, 'list');
      expect(r.code).toBe(1);
      expect(r.out).toBe('');
      // The redirector is announced, then the off-origin hop is refused: one error line, no result.
      expect(networkLines(r.err)).toHaveLength(1);
      expect(otherErr(r.err)).toHaveLength(1);
      expect(r.err).toContain('outside');
    } finally {
      redirector.stop(true);
      elsewhere.stop(true);
      rmSync(fresh, { recursive: true, force: true });
    }
  });

  // An agent sandbox often has a read-only cache: a failed write must not discard a value already fetched.
  test('a read-only cache directory still returns the fetched catalogue', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'agentpractices-ro-'));
    chmodSync(dir, 0o555);
    try {
      const r = await spawnAt(base, join(dir, 'cache'), 'list', '--limit', '1');
      expect(otherErr(r.err)).toEqual([]);
      expect(r.code).toBe(0);
      expect(JSON.parse(r.out).count).toBe(1);
    } finally {
      chmodSync(dir, 0o755);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('check names the change, and the version comparison is numeric', async () => {
    const patched = catalog.practices.find((x) => Number(x.version.split('.')[2]) > 0);
    expect(patched).toBeDefined();
    const [major, minor, patch] = patched!.version.split('.').map(Number);
    const r = await run('check', `${patched!.id}@${major}.${minor}.${patch - 1}`);
    expect(r.code).toBe(0);
    const j = JSON.parse(r.out);
    expect(j.results[0].change).toBe('patch');
    expect(j.results[0].version_matches).toBe(false);
    const same = await run('check', `${patched!.id}@${patched!.version}`);
    expect(JSON.parse(same.out).results[0].change).toBe('none');
  });

  test('domains prints the domain tree', async () => {
    const r = await run('domains');
    expect(otherErr(r.err)).toEqual([]);
    expect(r.code).toBe(0);
    const j = JSON.parse(r.out);
    const agent = j.domains.find((d: { id: string }) => d.id === 'D.AGT');
    expect(agent.label).toBe('Agent Engineering');
    expect(agent.children.map((c: { id: string }) => c.id)).toContain('D.AGT.SKL');
    expect(agent.children.find((c: { id: string }) => c.id === 'D.AGT.SKL').label).toBe('Skills & Reusable Procedures');
  });
});
