// author: Stephen Eaton
// The catalogue's `generated` value describes the content, never the build (#27).
import { execFileSync } from 'node:child_process';

/**
 * The source commit's committer time, in UTC, for catalog.json's `generated` field.
 *
 * An agent compares this value with its cached copy to decide whether to refetch. A late build of
 * an old commit must therefore carry an old value: a scheduled build that publishes old content
 * then loses that comparison instead of overwriting a newer cache. There is deliberately no
 * fallback to the clock, because that fallback is the defect.
 */
export function sourceCommitTime(run: (args: string[]) => string = (args) => execFileSync('git', args, { encoding: 'utf8' })): string {
  const raw = run(['log', '-1', '--format=%cI']).trim();
  const ms = Date.parse(raw);
  if (!raw || Number.isNaN(ms))
    throw new Error(`cannot read the source commit time from git (got ${JSON.stringify(raw)}); catalog.json's generated value must come from the commit, not the build`);
  return new Date(ms).toISOString();
}
