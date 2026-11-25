// author: Stephen Eaton
// Fail when a practice's content changed since the published catalog without a version bump.
// usage: bun scripts/version-guard.ts [--baseline <catalog.json path or URL>]
// Default baseline: the live catalog. Unreachable baseline fails in CI (CI=true) and warns locally.
import { loadPractices } from './lib/practices';
import { BASE_URL } from './lib/site';
import { guardVersions, type PublishedEntry } from './lib/version-guard';

const i = Bun.argv.indexOf('--baseline');
const src = (i > 0 && Bun.argv[i + 1]) || process.env.AGENTPRACTICES_BASELINE || `${BASE_URL}catalog.json`;
const inCI = Boolean(process.env.CI);

async function loadBaseline(): Promise<PublishedEntry[] | null> {
  try {
    const json = /^https?:\/\//.test(src)
      ? await (await fetch(src, { signal: AbortSignal.timeout(15_000) }).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r; })).json()
      : await Bun.file(src).json();
    return (json as { practices: PublishedEntry[] }).practices;
  } catch (e) {
    console[inCI ? 'error' : 'warn'](`${inCI ? 'ERROR' : 'WARN'} version-guard: cannot read baseline ${src}: ${(e as Error).message}`);
    return null;
  }
}

const published = await loadBaseline();
if (!published) process.exit(inCI ? 1 : 0);
const hashed = published.filter((p) => p.content_hash).length;
if (!hashed) console.warn(`WARN version-guard: baseline ${src} has no content hashes yet; the first deploy with hashes sets the baseline`);
const issues = guardVersions(loadPractices('src/content/docs'), published);
for (const x of issues) console.error(`ERROR ${x.code} ${x.msg}`);
console.log(`version-guard: compared with ${published.length} published practice(s) (${hashed} hashed) from ${src}: ${issues.length} error(s)`);
process.exit(issues.length ? 1 : 0);
