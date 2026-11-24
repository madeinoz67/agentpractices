// author: Stephen Eaton
import { expect, test } from 'bun:test';
import rehypeRfc2119 from '../src/plugins/rehype-rfc2119.mjs';

const strong = (text: string) => ({ type: 'element', tagName: 'strong', properties: {}, children: [{ type: 'text', value: text }] });
const run = (node: any) => { rehypeRfc2119()({ type: 'root', children: [{ type: 'element', tagName: 'p', properties: {}, children: [node] }] }); return node; };

test('MUST gets must class', () => expect(run(strong('MUST')).properties.className).toEqual(['rfc2119', 'rfc2119-must']));
test('MUST NOT maps to must', () => expect(run(strong('MUST NOT')).properties.className).toEqual(['rfc2119', 'rfc2119-must']));
test('SHOULD NOT maps to should', () => expect(run(strong('SHOULD NOT')).properties.className).toEqual(['rfc2119', 'rfc2119-should']));
test('MAY gets may class', () => expect(run(strong('MAY')).properties.className).toEqual(['rfc2119', 'rfc2119-may']));
test('ordinary bold untouched', () => expect(run(strong('Must read')).properties.className).toBeUndefined());
