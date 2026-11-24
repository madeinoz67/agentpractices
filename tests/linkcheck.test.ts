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
