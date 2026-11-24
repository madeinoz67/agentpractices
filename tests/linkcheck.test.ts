// author: Stephen Eaton
import { expect, test } from 'bun:test';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkLinks } from '../scripts/linkcheck';

test('reports internal links that do not resolve, ignores external and anchors', () => {
  const d = mkdtempSync(join(tmpdir(), 'lc-'));
  mkdirSync(join(d, 'a'), { recursive: true });
  writeFileSync(join(d, 'a/index.html'), '');
  writeFileSync(join(d, 'x.md'), '');
  writeFileSync(join(d, 'index.html'),
    '<a href="/best-practices/a/">ok</a><a href="/best-practices/a/#r">ok</a><a href="/best-practices/x.md">ok</a>' +
    '<a href="/best-practices/missing/">bad</a><a href="https://example.org/">ext</a><a href="#top">anchor</a>');
  expect(checkLinks(d, '/best-practices/')).toEqual([{ from: 'index.html', href: '/best-practices/missing/' }]);
});

import { checkCatalog } from '../scripts/linkcheck';
test('every catalog url and md_url must exist in dist', () => {
  const d = mkdtempSync(join(tmpdir(), 'lc-'));
  mkdirSync(join(d, 'a/b'), { recursive: true });
  writeFileSync(join(d, 'a/b/index.html'), '');
  writeFileSync(join(d, 'a/b.md'), '');
  const B = 'https://madeinoz67.github.io/best-practices/';
  const cat = { practices: [{ id: 'BP-0001', url: `${B}a/b/`, md_url: `${B}a/b.md` }, { id: 'BP-0002', url: `${B}A B/`, md_url: `${B}A B.md` }] };
  expect(checkCatalog(d, cat, B).map((x) => x.href)).toEqual([`${B}A B/`, `${B}A B.md`]);
});
