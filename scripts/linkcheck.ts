// author: Stephen Eaton
// Check that every internal href/src in the built site resolves to a file in dist/. Usage: bun scripts/linkcheck.ts [dist]
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { BASE_URL } from './lib/site.ts';

const walk = (d: string): string[] => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));

export function checkLinks(dist: string, base: string): { from: string; href: string }[] {
  const broken: { from: string; href: string }[] = [];
  for (const file of walk(dist).filter((f) => f.endsWith('.html'))) {
    for (const m of readFileSync(file, 'utf8').matchAll(/(?:href|src)="([^"]+)"/g)) {
      const href = m[1];
      if (!href.startsWith(base)) continue;
      const path = decodeURI(href.slice(base.length).split(/[?#]/)[0]);
      const target = path === '' || path.endsWith('/') ? join(dist, path, 'index.html') : /\.[a-z0-9]+$/i.test(path) ? join(dist, path) : join(dist, path, 'index.html');
      if (!existsSync(target)) broken.push({ from: relative(dist, file), href });
    }
  }
  return broken;
}

/** Every catalog url / md_url must resolve to a built file (the agent entry points are not HTML, so checkLinks misses them). */
export function checkCatalog(dist: string, catalog: { practices: { id: string; url: string; md_url: string }[] }, baseUrl: string) {
  const prefix = new URL(baseUrl).pathname;
  return catalog.practices.flatMap((p) => [p.url, p.md_url])
    .filter((u) => {
      const path = decodeURI(new URL(u).pathname).slice(prefix.length);
      return !existsSync(path === '' || path.endsWith('/') ? join(dist, path, 'index.html') : join(dist, path));
    })
    .map((href) => ({ from: 'catalog.json', href }));
}

if (import.meta.main) {
  const dist = process.argv[2] ?? 'dist';
  const catalog = JSON.parse(readFileSync(join(dist, 'catalog.json'), 'utf8'));
  const broken = [...checkLinks(dist, new URL(BASE_URL).pathname), ...checkCatalog(dist, catalog, catalog.base_url)];
  for (const b of broken) console.error(`BROKEN ${b.from} → ${b.href}`);
  console.log(`linkcheck: ${broken.length} broken link(s)`);
  process.exit(broken.length ? 1 : 0);
}
