// author: Stephen Eaton
import { describe, expect, test } from 'bun:test';
import { formatStars, fetchStars } from '../scripts/lib/stars';

describe('formatStars', () => {
  test('small numbers as-is', () => expect(formatStars(42)).toBe('42'));
  test('thousands with one decimal', () => expect(formatStars(1234)).toBe('1.2k'));
  test('round thousands drop .0', () => expect(formatStars(2000)).toBe('2k'));
  test('null → empty string', () => expect(formatStars(null)).toBe(''));
});

describe('fetchStars', () => {
  const ok = (n: number) => (async () => new Response(JSON.stringify({ stargazers_count: n }), { status: 200 })) as typeof fetch;
  test('returns stargazers_count', async () => expect(await fetchStars('o/r', { fetchImpl: ok(7) })).toBe(7));
  test('sends token when given', async () => {
    let auth = '';
    const f = (async (_u: any, init: any) => { auth = init.headers.Authorization; return new Response('{"stargazers_count":1}'); }) as typeof fetch;
    await fetchStars('o/r', { fetchImpl: f, token: 'abc' });
    expect(auth).toBe('Bearer abc');
  });
  test('HTTP error → null (build must not fail)', async () =>
    expect(await fetchStars('o/r', { fetchImpl: (async () => new Response('x', { status: 403 })) as typeof fetch })).toBeNull());
  test('network error → null', async () =>
    expect(await fetchStars('o/r', { fetchImpl: (async () => { throw new Error('offline'); }) as typeof fetch })).toBeNull());
  test('non-numeric count → null', async () =>
    expect(await fetchStars('o/r', { fetchImpl: (async () => new Response('{"stargazers_count":"lots"}')) as typeof fetch })).toBeNull());
});
