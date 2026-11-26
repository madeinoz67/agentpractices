---
title: Detect drift between a PRD and the work actually done
description: Record what was verified against which PRD version, check on every pull request, every PRD change and on a schedule that each requirement has passing tests and each change cites a requirement, have an independent reviewer judge meaning, and resolve every divergence by an owner decision that fixes either the code or the PRD, never by quietly syncing one to the other.
id: BP-0085
domain: D.DOC.SPC
type: guideline
roles: [reviewer, orchestrator]
stage: [verify, operate]
status: draft
version: 1.0.0
updated: 2026-11-26
reviewed: 2026-11-26
review_by: 2027-05-26
related: [BP-0058, BP-0057, BP-0059, BP-0036, BP-0037, BP-0038, BP-0083, BP-0084, BP-0048, BP-0021]
superseded_by: null
sources:
  - { title: Spec-driven development as prescribed and as practiced (2026), url: https://arxiv.org/abs/2608.25202 }
  - { title: NASA Software Engineering Handbook — SWE-052 Bidirectional traceability, url: https://swehb.nasa.gov/x/x4AIAw }
  - { title: GitHub Spec Kit — spec-driven development (analyze step), url: https://github.com/github/spec-kit }
  - { title: Microsoft DevSquad Copilot — spec amendment during implementation, url: https://microsoft.github.io/devsquad-copilot/concepts/spec-amendment/ }
---

A PRD ([BP-0058](/documentation-writing/specs-design-docs/write-prds-agents-can-build-from/)) is accurate on the day it is approved. After that, agents change code faster than anyone re-reads the PRD, a requirement is clarified in a chat and never written down, a test is weakened, or a task is marked done that was only half built. The PRD and the system stop describing the same thing, and the next agent builds on whichever one it happens to read. Drift is found only by checking, repeatedly, in both directions: every requirement to the work that proves it, and every piece of work back to a requirement.

Plan-against-PRD alignment before work starts is covered by BP-0058 rule 7. This practice covers the gap that opens during and after delivery.

## Rules

### Know what "verified" means

1. **MUST** record, for each requirement, the PRD version and requirement text (or its hash) it was last verified against, the commit, and the evidence (tests and results, reviewer). Without this record you cannot tell a requirement that changed after it was built from one that was never built.
2. **MUST** classify drift in five kinds, because each has a different fix:

   | Kind | Signal | Usual fix |
   |---|---|---|
   | Missing | Requirement with no passing test or no implementing change | Build it, or move it to non-goals |
   | Failing | A test that proves the requirement fails | Fix the code |
   | Stale | Requirement text changed since it was verified | Re-verify; change code if needed |
   | Unrequested | Code, test or behaviour that cites no live requirement | Add a requirement, or remove the work |
   | Divergent | Both exist, but the behaviour does not match the criterion | Owner decides which is right |

3. **MUST** treat "done" in a plan, task list or PR as a claim, not evidence. A requirement is met only when its acceptance criteria are shown to pass ([BP-0059](/agent-engineering/workflow/validate-with-proof-not-claims/)).

### Check structure deterministically

4. **MUST** run a structural drift check that needs no model: every live requirement ID maps to at least one non-skipped, passing test; every test and every behaviour-changing PR cites a live requirement ID; no work cites a removed requirement; no verified requirement has changed text. Fail the build on any finding.
5. **MUST** gate pull requests: a change to source code cites the requirement IDs it serves, or states `No-Requirement-Change:` with a reason (refactor, dependency bump). A change to the PRD carries a change note naming who approved it ([BP-0034](/software-engineering/version-control-review/make-agent-commits-reviewable/)).
6. **SHOULD** enforce rules 4 and 5 with CI or a hook, not with an instruction to the agent ([BP-0021](/agent-engineering/tool-use/use-hooks-for-deterministic-control/)).

### Check meaning independently

7. **MUST** have an agent or person who did not write the code compare each changed or stale requirement's criteria with the behaviour, from the PRD and the running system or tests, not from the implementer's summary ([BP-0036](/software-engineering/version-control-review/review-agent-written-changes/), [BP-0083](/agent-engineering/workflow/build-self-improving-agents-safely/)). Give the reviewer a fresh context.
8. **MUST** write acceptance tests from the criteria, not from the code ([BP-0037](/software-engineering/testing/test-first-with-agents/)). A test that asserts what the code currently does passes by construction and hides divergence.
9. **SHOULD** sample requirements already marked verified on a schedule and re-check them, so a slow change (a weakened test, a renamed field, a default that moved) is found before a user finds it.

### When to check

10. **MUST** run the structural check on every pull request and every PRD change, and the full check (structure plus independent review of the requirements in scope) before each release or milestone sign-off.
11. **SHOULD** run the full check on a schedule for long-running work, so drift is found while it is small.

### Resolve, do not sync

12. **MUST** resolve each finding by an owner decision recorded with the finding: the PRD is right, so fix the code; or the code is right, so amend the PRD through review, with a version bump and change note. Keep open findings in a divergence register until closed (BP-0058 rule 11).
13. **MUST NOT** let an agent edit the PRD to match the code, or edit a test to match the code, to make a drift check pass. That hides the drift; treat it like weakening a test ([BP-0038](/software-engineering/testing/keep-tests-honest/)).
14. **SHOULD** report drift per PRD as counts by kind over time, alongside other delivery metrics, so a growing gap is visible ([BP-0084](/operations/evaluation/detect-agents-drifting-from-practice/) does the same for practices).

## When to apply

On any work driven by a PRD or spec: during implementation, at every pull request, before release, and on long-running products after release. Most important when several agents implement against the same PRD, or when the same agent writes the code and the tests.

## Procedure

1. Give every requirement a stable ID (BP-0058 rule 3). Tag tests with the IDs they prove (`[R-007]` in the test title), and PRs with the IDs they serve.
2. Add the structural check and the PR gate to CI; make both blocking.
3. After a requirement is independently verified, write its text hash, commit and evidence to the verified record.
4. On each run, publish a drift report: one row per requirement with its kind, evidence links and the owner of any open finding.
5. For each finding, get the owner's decision, fix code or PRD, re-verify, and update the record.

## Examples

Structural drift check and PR gate (Bun, TypeScript):

```ts
// author: Stephen Eaton
// prd-drift.ts — find where a PRD and the delivered work have drifted apart.
// Inputs: the PRD (Markdown, one "### R-NNN Title" heading per requirement), the test results
// (each test title tagged with the requirement IDs it proves, e.g. "[R-007]"), and the record of
// what was last verified (requirement text hash and commit). The script reports structure only;
// whether code meets a criterion's meaning is for tests and an independent reviewer.
import { createHash } from 'node:crypto';

export type Requirement = { id: string; title: string; text: string; removed: boolean };
export type TestResult = { name: string; status: 'pass' | 'fail' | 'skip' };
export type Verified = Record<string, { hash: string; commit: string }>;
export type Status = 'ok' | 'missing' | 'failing' | 'stale' | 'unverified';
export type Finding = { id: string; status: Status; tests: string[]; note?: string };

const ID = /R-\d{3,}/g;
const sha = (s: string) => createHash('sha256').update(s.trim()).digest('hex').slice(0, 12);

export function parsePrd(md: string): Requirement[] {
  return md.split(/^### /m).slice(1).flatMap((block) => {
    const [head, ...body] = block.split('\n');
    const id = head.match(/^R-\d{3,}/)?.[0];
    if (!id) return [];
    const text = body.join('\n').split(/^## /m)[0];
    return [{ id, title: head.slice(id.length).trim(), text, removed: /^Status:\s*removed/im.test(text) }];
  });
}

export function driftReport(reqs: Requirement[], tests: TestResult[], verified: Verified) {
  const live = reqs.filter((r) => !r.removed);
  const known = new Set(live.map((r) => r.id));
  const findings: Finding[] = live.map((r) => {
    const mine = tests.filter((t) => (t.name.match(ID) ?? []).includes(r.id));
    const names = mine.map((t) => t.name);
    const v = verified[r.id];
    if (!mine.some((t) => t.status !== 'skip')) return { id: r.id, status: 'missing', tests: names, note: 'no test proves it' };
    if (mine.some((t) => t.status === 'fail')) return { id: r.id, status: 'failing', tests: names };
    if (!v) return { id: r.id, status: 'unverified', tests: names, note: 'never verified by review' };
    if (v.hash !== sha(r.text)) return { id: r.id, status: 'stale', tests: names, note: `text changed since verified at ${v.commit}` };
    return { id: r.id, status: 'ok', tests: names };
  });
  // Tests that cite no requirement, or one the PRD no longer has: work the PRD does not ask for.
  const orphans = tests.filter((t) => { const ids = t.name.match(ID) ?? []; return !ids.length || ids.some((id) => !known.has(id)); }).map((t) => t.name);
  return { findings, orphans, drifted: findings.some((f) => f.status !== 'ok') || orphans.length > 0 };
}

// Pull-request gate: behaviour changes must name the requirements they serve, or say they change none.
export function prCheck(changed: string[], body: string, prdPath = 'docs/prd.md', src = /^src\//) {
  const code = changed.filter((f) => src.test(f));
  const cites = [...new Set(body.match(ID) ?? [])];
  const declaredNone = /^No-Requirement-Change:\s*\S+/m.test(body);
  const problems: string[] = [];
  if (code.length && !cites.length && !declaredNone) problems.push('code changed with no requirement cited and no No-Requirement-Change reason');
  if (changed.includes(prdPath) && !/^PRD-Change:\s*\S+/m.test(body)) problems.push('PRD changed without a PRD-Change note naming who approved it');
  return { cites, problems, pass: problems.length === 0 };
}

export const hashOf = (r: Requirement) => sha(r.text);
```

Tested with Bun 1.4 and five unit tests:
- Requirements are parsed from `### R-NNN` headings, and a `Status: removed` requirement is marked removed.
- A requirement with no test is reported missing; a test citing a removed requirement is reported as unrequested work.
- A requirement whose text changed after verification is reported stale; an unchanged one is ok.
- A failing test makes its requirement failing; a requirement with only skipped tests is missing.
- The PR gate fails code changes with no requirement cited, passes a reasoned `No-Requirement-Change:`, and fails a PRD edit with no `PRD-Change:` note.

The tag formats (`[R-007]`, `No-Requirement-Change:`, `PRD-Change:`) are example conventions; pick one set and use it everywhere.

Drift report row:

```text
R-007  Report a problem on a practice page   STALE      text changed since verified at 4f2c1ab
       tests: [R-007] opens issue form (pass), [R-007] prefills page URL (pass)
       owner decision: pending (Stephen Eaton)   register: DRIFT-012
```

## Anti-patterns

- Checking the PRD once at sign-off and never again.
- Treating ticked boxes in a plan or "all tasks done" as proof the PRD is met.
- Tests generated from the finished code, then cited as proof of the requirement.
- An agent "fixing" drift by rewriting the PRD to describe what it built.
- The implementing agent grading its own work against the PRD.
- A semantic LLM review doing work a structural check could do deterministically, or a structural check passing and being taken as proof the behaviour is right.
- Requirements clarified in chat, comments or tickets and never written back to the PRD.

## Checklist

- [ ] Stable requirement IDs; tests and PRs tagged with them
- [ ] Verified record per requirement: text hash, PRD version, commit, evidence
- [ ] Blocking structural check: missing, failing, stale and unrequested work found automatically
- [ ] PR gate: requirement cited or reasoned exemption; PRD edits carry an approved change note
- [ ] Independent reviewer, fresh context, judges meaning for changed and stale requirements
- [ ] Full check before release and on a schedule; sampled re-checks of verified requirements
- [ ] Every finding resolved by an owner decision; divergence register; no silent sync

## References

- [BP-0058 Write PRDs that agents can build and test against](/documentation-writing/specs-design-docs/write-prds-agents-can-build-from/)
- [BP-0059 Validate agent work with proof, not claims](/agent-engineering/workflow/validate-with-proof-not-claims/)
- [BP-0084 Detect agents drifting from the practices they follow](/operations/evaluation/detect-agents-drifting-from-practice/)
