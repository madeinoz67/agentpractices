// author: Stephen Eaton
// GitHub star count, fetched once at build time. Never throws: on any failure the header shows the button without a count.

export interface FetchStarsOpts { fetchImpl?: typeof fetch; token?: string; timeoutMs?: number }

export async function fetchStars(repo: string, o: FetchStarsOpts = {}): Promise<number | null> {
  const f = o.fetchImpl ?? fetch;
  try {
    const res = await f(`https://api.github.com/repos/${repo}`, {
      headers: { Accept: 'application/vnd.github+json', ...(o.token ? { Authorization: `Bearer ${o.token}` } : {}) },
      signal: AbortSignal.timeout(o.timeoutMs ?? 5000),
    });
    if (!res.ok) return null;
    const n = (await res.json())?.stargazers_count;
    return typeof n === 'number' && Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function formatStars(n: number | null): string {
  if (n == null) return '';
  if (n < 1000) return String(n);
  return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
}

let cached: Promise<number | null> | undefined;
/** One fetch per build, shared by every page. */
export const starsOnce = (repo: string) => (cached ??= fetchStars(repo, { token: process.env.GITHUB_TOKEN }));
