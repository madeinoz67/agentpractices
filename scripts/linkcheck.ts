// author: Stephen Eaton
// Check that every internal href/src in the built site resolves to a file in dist/. Usage: bun scripts/linkcheck.ts [dist]
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

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

if (import.meta.main) {
  const broken = checkLinks(process.argv[2] ?? 'dist', '/best-practices/');
  for (const b of broken) console.error(`BROKEN ${b.from} → ${b.href}`);
  console.log(`linkcheck: ${broken.length} broken link(s)`);
  process.exit(broken.length ? 1 : 0);
}
