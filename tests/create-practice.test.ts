// author: Stephen Eaton
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadTaxonomy, dirOf as repoDirOf } from '../scripts/lib/taxonomy';
import {
  addMonths, changelogWith, dirOf, fileSlug, flatten, issueBody, overlap, parseArgs, practiceMarkdown, prefillUrl,
  rankSimilar, validateDraft, vocabFromYaml, type Draft,
} from '../plugins/create-practice/skills/create-practice/scripts/practice';

const ROOT = join(import.meta.dir, '..');
const PLUGIN = join(ROOT, 'plugins/create-practice');
const SKILL_DIR = join(PLUGIN, 'skills/create-practice');
const SCRIPT = join(SKILL_DIR, 'scripts/practice.ts');
const vocab = vocabFromYaml(readFileSync(join(ROOT, 'taxonomy/domains.yaml'), 'utf8'), readFileSync(join(ROOT, 'taxonomy/facets.yaml'), 'utf8'));
const repoTax = loadTaxonomy(join(ROOT, 'taxonomy'));

const draft = (over: Partial<Draft> = {}): Draft => ({
  title: 'Pin MCP server versions', problem: 'Upstream releases change tools without review.', domain: 'D.AGT.TOOL',
  type: 'guideline', roles: ['implementer'], stage: ['build'], rules: '1. **MUST** pin every server.\n2. **SHOULD NOT** float tags.',
  related: ['BP-0062'], sources: [{ title: 'MCP spec', url: 'https://modelcontextprotocol.io/' }], ...over,
});

describe('taxonomy from YAML', () => {
  test('folders match the repo checker for every concept', () => {
    for (const c of repoTax.concepts) expect(dirOf(vocab, c.id)).toBe(repoDirOf(repoTax, c.id));
  });
  test('every concept appears once in the tree', () => {
    expect(flatten(vocab.domains).map((x) => x.d.id).sort()).toEqual(repoTax.concepts.map((c) => c.id).sort());
  });
  test('an unknown domain has no folder', () => expect(dirOf(vocab, 'D.NOPE')).toBeNull());
});

describe('draft validation', () => {
  test('a good draft passes', () => expect(validateDraft(draft(), vocab)).toEqual([]));
  test('a self-assigned ID in the title is refused', () => {
    expect(validateDraft(draft({ title: 'BP-0099 Pin things' }), vocab).join()).toContain('owner assigns');
  });
  test('unknown domain, type, role and stage are named', () => {
    const e = validateDraft(draft({ domain: 'D.AGT.TLS', type: 'essay', roles: ['wizard'], stage: ['ship'] }), vocab).join('\n');
    for (const bad of ['D.AGT.TLS', 'type must be', 'wizard', 'ship']) expect(e).toContain(bad);
  });
  test('a rule without a bold keyword is refused', () => {
    expect(validateDraft(draft({ rules: '1. **MUST** ok\n2. Always be careful' }), vocab).join()).toContain('Always be careful');
  });
  test('no numbered rules is refused', () => expect(validateDraft(draft({ rules: 'be good' }), vocab).join()).toContain('numbered'));
  test('domain none needs a taxonomy note', () => {
    expect(validateDraft(draft({ domain: 'none' }), vocab).join()).toContain('taxonomy_note');
    expect(validateDraft(draft({ domain: 'none', taxonomy_note: 'D.OPS.X Incident Response' }), vocab)).toEqual([]);
  });
  test('bad related IDs and source URLs are refused', () => {
    const e = validateDraft(draft({ related: ['BP-62'], sources: [{ title: 'x', url: 'javascript:alert(1)' }] }), vocab).join();
    expect(e).toContain('BP-62');
    expect(e).toContain('bad URL');
  });
});

describe('issue rendering', () => {
  const form = readFileSync(join(ROOT, '.github/ISSUE_TEMPLATE/propose-practice.yml'), 'utf8');
  test('every heading is a label of the Propose a practice form', () => {
    const headings = [...issueBody(draft(), vocab).matchAll(/^### (.+)$/gm)].map((m) => m[1]);
    for (const h of headings) expect(form).toContain(`label: ${h}`);
  });
  test('the domain line is a dropdown option of the form', () => {
    expect(form).toContain(`- ${issueBody(draft(), vocab).split('### Domain\n\n')[1].split('\n')[0]}`);
    expect(form).toContain(`- ${issueBody(draft({ domain: 'none', taxonomy_note: 'n' }), vocab).split('### Domain\n\n')[1].split('\n')[0]}`);
  });
  test('the prefill URL uses the form template and its field ids', () => {
    const u = new URL(prefillUrl(draft(), vocab));
    expect(u.searchParams.get('template')).toBe('propose-practice.yml');
    for (const k of ['practice_title', 'problem', 'domain', 'type', 'roles', 'stage', 'rules']) {
      expect(u.searchParams.has(k)).toBe(true);
      expect(form).toContain(`id: ${k}`);
    }
  });
});

describe('duplicate ranking', () => {
  const recs = [
    { id: 'BP-0001', title: 'Pin dependency versions', description: 'Lock versions', domain: 'D.SEC.SUP', version: '1.0.0', status: 'draft', url: 'u' },
    { id: 'BP-0002', title: 'Write good CLIs', description: 'Flags and output', domain: 'D.SWE.CLI', version: '1.0.0', status: 'draft', url: 'u' },
  ];
  test('word overlap ignores stop words and plurals', () => expect(overlap('Pin the versions', 'version pinning pin')).toBe(1));
  test('the closer practice ranks first, unrelated ones drop out', () => {
    expect(rankSimilar(recs, 'Pin MCP server versions').map((r) => r.id)).toEqual(['BP-0001']);
  });
});

describe('scaffold pieces', () => {
  test('review_by clamps to the end of a short month', () => {
    expect(addMonths('2026-08-31', 6)).toBe('2027-02-28');
    expect(addMonths('2026-11-27', 3)).toBe('2027-02-27');
  });
  test('file slugs are short and cut at a word', () => {
    const s = fileSlug('Build self-improving agents that cannot grade their own homework under any circumstances');
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.endsWith('-')).toBe(false);
    expect(/^[a-z0-9-]+$/.test(s)).toBe(true);
  });
  test('the page starts the body with the intro, then ## Rules, as draft 1.0.0', () => {
    const md = practiceMarkdown({ id: 'BP-0999', domain: 'D.AGT.TOOL', title: 'Pin: versions', description: 'd', type: 'guideline',
      roles: ['any'], stage: ['build'], today: '2026-11-27' });
    expect(md).toContain('title: "Pin: versions"');
    expect(md).toContain('status: draft\nversion: 1.0.0');
    expect(md).toContain('review_by: 2027-05-27');
    const order = ['## Rules', '## When to apply', '## Procedure', '## Examples', '## Anti-patterns', '## Checklist', '## References'];
    expect(order.map((h) => md.indexOf(h))).toEqual([...order.map((h) => md.indexOf(h))].sort((a, b) => a - b));
  });
  test('the changelog line lands first under Unreleased', () => {
    expect(changelogWith('# Changelog\n\n## Unreleased\n\n- old\n', '- new')).toBe('# Changelog\n\n## Unreleased\n\n- new\n- old\n');
    expect(() => changelogWith('# Changelog\n', '- x')).toThrow(/Unreleased/);
  });
  test('flags parse and a missing value is a usage error', () => {
    expect(parseArgs(['--id', 'BP-0001', '--fast'])).toEqual({ id: 'BP-0001', fast: true });
    expect(() => parseArgs(['--id'])).toThrow(/needs a value/);
    expect(() => parseArgs(['stray'])).toThrow(/unexpected/);
  });
});

describe('scaffold end to end on a copy of the repo', () => {
  let repo: string;
  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'create-practice-'));
    for (const p of ['taxonomy', 'AGENTS.md', 'CHANGELOG.md']) cpSync(join(ROOT, p), join(repo, p), { recursive: true });
    mkdirSync(join(repo, 'src/content/docs/agent-engineering/tool-use'), { recursive: true });
    writeFileSync(join(repo, 'src/content/docs/agent-engineering/tool-use/existing.md'), '---\ntitle: x\nid: BP-0062\n---\n');
  });
  afterEach(() => rmSync(repo, { recursive: true, force: true }));
  const run = (...args: string[]) => Bun.spawnSync(['bun', SCRIPT, 'scaffold', '--repo', repo, ...args], { stdout: 'pipe', stderr: 'pipe' });
  const base = ['--domain', 'D.AGT.TOOL', '--title', 'Pin MCP server versions', '--description', 'd', '--type', 'guideline', '--roles', 'implementer', '--stage', 'build'];

  test('writes the page in its domain folder and a changelog line', () => {
    const r = run('--id', 'BP-0999', '--issue', '47', ...base);
    expect(r.stderr.toString()).toBe('');
    const out = JSON.parse(r.stdout.toString());
    expect(out.file).toBe('src/content/docs/agent-engineering/tool-use/pin-mcp-server-versions.md');
    expect(existsSync(join(repo, out.file))).toBe(true);
    expect(readFileSync(join(repo, 'CHANGELOG.md'), 'utf8')).toContain('- BP-0999 Pin MCP server versions (D.AGT.TOOL, draft) (#47).');
  });
  test('refuses an ID already in use', () => {
    const r = run('--id', 'BP-0062', ...base);
    expect(r.exitCode).toBe(1);
    expect(r.stderr.toString()).toContain('already used');
  });
  test('refuses to overwrite an existing page and leaves it untouched', () => {
    expect(run('--id', 'BP-0999', ...base).exitCode).toBe(0);
    const file = join(repo, 'src/content/docs/agent-engineering/tool-use/pin-mcp-server-versions.md');
    writeFileSync(file, 'mine');
    const r = run('--id', 'BP-0998', ...base);
    expect(r.exitCode).toBe(1);
    expect(r.stderr.toString()).toContain('already exists');
    expect(readFileSync(file, 'utf8')).toBe('mine');
  });
  test('refuses an unknown domain and a non-repo directory', () => {
    expect(run('--id', 'BP-0999', ...base.map((x) => (x === 'D.AGT.TOOL' ? 'D.AGT.TLS' : x))).stderr.toString()).toContain('unknown domain');
    const r = Bun.spawnSync(['bun', SCRIPT, 'scaffold', '--repo', tmpdir(), '--id', 'BP-0999', ...base], { stderr: 'pipe' });
    expect(r.exitCode).toBe(1);
    expect(r.stderr.toString().trim().split('\n')).toHaveLength(1);
  });
});

describe('create-practice packaging', () => {
  const market = JSON.parse(readFileSync(join(ROOT, '.claude-plugin/marketplace.json'), 'utf8'));
  const plugin = JSON.parse(readFileSync(join(PLUGIN, '.claude-plugin/plugin.json'), 'utf8'));
  const skill = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8');
  const script = readFileSync(SCRIPT, 'utf8');
  const fm = /^---\n([\s\S]*?)\n---/.exec(skill)![1];

  test('the marketplace lists the plugin at its own directory', () => {
    const entry = market.plugins.find((x: { name: string }) => x.name === 'create-practice');
    expect(entry.source).toBe('./plugins/create-practice');
    expect(plugin.name).toBe('create-practice');
  });
  test('plugin and skill versions agree', () => expect(plugin.version).toBe(/^\s+version:\s*(\S+)$/m.exec(fm)![1]));
  test('skill frontmatter is valid', () => {
    expect(/^name:\s*create-practice$/m.test(fm)).toBe(true);
    const desc = /^description:\s*(.+)$/m.exec(fm)![1];
    expect(desc.length).toBeLessThanOrEqual(1024);
    expect(desc).toContain('USE WHEN');
    expect(/^compatibility:.*\bBun\b/m.test(fm)).toBe(true);
  });
  test('every command runs the script from the skill base directory', () => {
    const cmds = skill.split('\n').filter((l) => /^\s*bun\s.*practice\.ts/.test(l));
    expect(cmds.length).toBeGreaterThan(0);
    for (const l of cmds) expect(l).toContain('<skill base directory>/scripts/practice.ts');
  });
  test('every domain ID in SKILL.md exists', () => {
    for (const m of skill.matchAll(/\bD\.[A-Z]{3}(?:\.[A-Z]+)?\b/g)) expect(repoTax.byId.has(m[0])).toBe(true);
  });
  test('the script talks to agentpractices.dev and links GitHub only', () => {
    const hosts = new Set([...script.matchAll(/https?:\/\/[^\s'"`)]+/g)].map((m) => new URL(m[0]).host));
    // github.com is only printed as the issue link and example.org is the template placeholder; neither is fetched.
    for (const h of hosts) expect(['agentpractices.dev', 'github.com', 'example.org']).toContain(h);
    expect(script.match(/\bfetch\(/g)).toHaveLength(1);
    expect(/analytics|telemetry|sentry|posthog|mixpanel/i.test(script)).toBe(false);
  });
});
