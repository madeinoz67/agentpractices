// author: Stephen Eaton
// Post-build: emit agent-facing outputs into dist/. Run after `astro build`.
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { loadTaxonomy } from './lib/taxonomy';
import { loadPractices } from './lib/practices';
import { buildCatalog, buildLlmsTxt, buildSkos, buildTaxonomyJson } from './lib/emit';
import { BASE_URL, DESCRIPTION, TITLE } from './lib/site';

const DOCS = 'src/content/docs';
const OUT = process.argv[2] ?? 'dist';
const write = (p: string, s: string) => { mkdirSync(dirname(join(OUT, p)), { recursive: true }); writeFileSync(join(OUT, p), s); };
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : /\.mdx?$/.test(n) ? [join(d, n)] : []));

const t = loadTaxonomy('taxonomy');
const ps = loadPractices(DOCS);
write('catalog.json', JSON.stringify(buildCatalog(ps, t, { baseUrl: BASE_URL, generated: new Date().toISOString() }), null, 2));
write('taxonomy.jsonld', JSON.stringify(buildSkos(t, { baseUrl: BASE_URL }), null, 2));
write('taxonomy.json', JSON.stringify(buildTaxonomyJson(t), null, 2));
write('llms.txt', buildLlmsTxt(ps, t, { baseUrl: BASE_URL, title: TITLE, description: DESCRIPTION }));
let n = 0;
for (const f of walk(DOCS)) {
  const slug = relative(DOCS, f).replace(/\\/g, '/').replace(/\.mdx?$/, '');
  write(`${slug}.md`, readFileSync(f, 'utf8'));
  n++;
}
console.log(`postbuild: ${ps.length} practices, ${t.concepts.length} concepts, ${n} raw .md files → ${OUT}/`);
