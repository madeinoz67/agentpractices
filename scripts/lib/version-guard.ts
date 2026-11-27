// author: Stephen Eaton
// Detect practices whose content changed without a version bump, by comparing against the published catalog.
import { createHash } from 'node:crypto';
import type { Practice } from './practices';
import type { Issue } from './taxonomy';

/** Fields that define what a practice says. Version and dates are excluded: they describe the content, not change it. */
export function contentHash(p: Practice): string {
  const norm = (s: string) => s.replace(/\r\n?/g, '\n').split('\n').map((l) => l.trimEnd()).join('\n').trim();
  const payload = {
    title: p.title, description: norm(p.description), domain: p.domain, type: p.type,
    roles: p.roles, stage: p.stage, status: p.status, related: p.related, superseded_by: p.superseded_by,
    sources: p.sources.map((s) => ({ title: s.title, url: s.url, note: s.note })), body: norm(p.body),
  };
  return 'sha256:' + createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

export interface PublishedEntry { id: string; version: string; content_hash?: string }

/** Compare local practices with the published catalog entries. */
export function guardVersions(local: Practice[], published: PublishedEntry[]): Issue[] {
  const issues: Issue[] = [];
  const byId = new Map(local.map((p) => [p.id, p]));
  for (const pub of published) {
    const p = byId.get(pub.id);
    const err = (code: string, msg: string) => issues.push({ level: 'error', code, msg: `${pub.id}: ${msg}` });
    if (!p) { err('E_PRACTICE_REMOVED', `published at ${pub.version} but missing locally; deprecate with superseded_by instead of deleting`); continue; }
    const cmp = compareSemver(p.version, pub.version);
    if (cmp < 0) { err('E_VERSION_BACKWARD', `version ${p.version} is lower than published ${pub.version}`); continue; }
    if (pub.content_hash && cmp === 0 && contentHash(p) !== pub.content_hash)
      err('E_VERSION_NOT_BUMPED', `content changed since published ${pub.version}; bump version (patch: wording, links, sources; minor: added or relaxed rules; major: changed or removed rules)`);
  }
  return issues;
}
