// author: Stephen Eaton
import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import {
  filterPractices, isAllowed, isFresh, isGeneratedNewer, matchesDomain, matchesRole, nearestIds,
  parseCitation, rulesSection, type Catalog, type Record_,
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

describe('cache freshness', () => {
  test('a newer generated timestamp wins', () => {
    expect(isGeneratedNewer('2026-11-25T03:00:00Z', '2026-11-24T03:00:00Z')).toBe(true);
    expect(isGeneratedNewer('2026-11-24T03:00:00Z', '2026-11-25T03:00:00Z')).toBe(false);
    expect(isGeneratedNewer('2026-11-25T03:00:00Z', '2026-11-25T03:00:00Z')).toBe(false);
  });
  // AC6: a changed `generated` timestamp causes a refetch. A stale cache must not suppress the network copy.
  test('a stale cache refetches, a fresh one does not', () => {
    const now = 1_000_000;
    const stale = isFresh(now - 16 * 60 * 1000, now);
    const fresh = isFresh(now - 60 * 1000, now);
    expect(stale).toBe(false);
    expect(fresh).toBe(true);
    // Stale gate open, remote newer => the fetcher replaces the cache.
    expect(!stale && isGeneratedNewer('2026-11-25T04:00:00Z', '2026-11-25T03:00:00Z')).toBe(true);
  });
});

describe('plugin packaging', () => {
  const plugin = JSON.parse(readFileSync('.claude-plugin/plugin.json', 'utf8'));
  const market = JSON.parse(readFileSync('.claude-plugin/marketplace.json', 'utf8'));
  const skill = readFileSync('skills/agentpractices/SKILL.md', 'utf8');
  const script = readFileSync('skills/agentpractices/scripts/practices.ts', 'utf8');

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
  test('SKILL.md points at the script that exists', () => {
    expect(skill).toContain('skills/agentpractices/scripts/practices.ts');
    expect(existsSync('skills/agentpractices/scripts/practices.ts')).toBe(true);
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
