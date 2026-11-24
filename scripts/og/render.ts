// author: Stephen Eaton
// Render scripts/og/card.svg to public/og.png (1280×640) with IBM Plex fonts.
// Usage: bun scripts/og/render.ts <dir-with-IBM-Plex-ttf-files>
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const fontDir = process.argv[2];
if (!fontDir) { console.error('usage: bun scripts/og/render.ts <font-dir>'); process.exit(2); }
const fontFiles = readdirSync(fontDir).filter((f) => f.endsWith('.ttf')).map((f) => join(fontDir, f));
const png = new Resvg(readFileSync('scripts/og/card.svg', 'utf8'), {
  fitTo: { mode: 'width', value: 1280 },
  font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'IBM Plex Sans' },
}).render().asPng();
writeFileSync('public/og.png', png);
console.log(`public/og.png ${png.length} bytes`);
