---
title: Validate agent work with proof, not claims
description: Give every task a check that returns pass or fail; before any "done", run it fresh and read the output; match the evidence to the claim; prove the one fact a risky change depends on by running real code; drive the real app for user-facing work; keep only review findings a run reproduces; and enforce the check in the harness where it must never be skipped.
id: BP-0059
domain: D.AGT.WF
type: guideline
roles: [any]
stage: [build, verify]
status: draft
version: 1.0.1
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0002, BP-0006, BP-0038, BP-0036, BP-0021, BP-0052, BP-0053, BP-0048]
sources:
  - title: "Claude Code docs — Best practices (Give Claude a check to run)"
    url: https://code.claude.com/docs/en/best-practices
    note: Tells you to give the agent a check it can run, so completion is a command not a judgement
  - title: "obra/superpowers — verification-before-completion skill"
    url: https://github.com/obra/superpowers/tree/main/skills/verification-before-completion
    note: A skill that refuses completion claims without a fresh verification command and its confirmed output
  - title: "pstack (Cursor plugins) — prove-it-works, blast-radius, interrogate, create-verification-skill, show-me-your-work"
    url: https://github.com/cursor/plugins/tree/main/pstack/skills
    note: A skill built on showing the thing works by running it, not on asserting it does
---
An agent stops when the work *looks* done. Without something it can run that says whether the work *is* done, the person becomes the test suite. Claude Code's guidance puts it the same way, and skill packs such as superpowers and pstack build their workflows around one rule: evidence before claims.

## Rules

### Have a check

1. **MUST** give every task a check that returns pass or fail and that the agent can run and read: a test, a build exit code, a linter, a script that diffs output against a fixture, a screenshot next to the approved mockup. Put the command in AGENTS.md / CLAUDE.md.
2. **SHOULD** for user-facing work, keep a project verification harness (often a skill) that launches the real app, drives it the way a user does, captures evidence (screenshots, transcripts, response bodies, side effects) and cleans up without deleting the evidence. Prove the harness works end to end once before relying on it.

### Run it before claiming

3. **MUST NOT** claim done, fixed or passing without fresh evidence from this turn: identify the command that proves the claim, run all of it, read the full output and exit code, and only then state the result, with the evidence.
4. **MUST** match the evidence to the claim:

   | Claim | Proof | Not proof |
   | --- | --- | --- |
   | Tests pass | Test run output, 0 failures | An earlier run; "should pass" |
   | Builds | Build command, exit 0 | Linter clean; "compiles in my head" |
   | Bug fixed | The original symptom no longer reproduces | Code changed |
   | Regression test works | Watched it fail, then pass | Passes once |
   | Feature works | The real app driven through the user path, result captured | Unit tests of internals |
   | Sub-agent finished | The diff, files or artefacts it claims | Its success report |
   | Requirements met | Each acceptance criterion checked ([BP-0058](/documentation-writing/specs-design-docs/write-prds-agents-can-build-from/)) | Tests green |

5. **MUST** check the real thing, not a proxy: run the feature, read the actual value, inspect the diff. File timestamps, cached output, self-reports and "it compiles" do not count. When a check fails oddly, suspect the observation before the system.
6. **MUST** report partial or failed checks as they are: what ran, what passed, what failed, what was not checked ([BP-0002](/agent-engineering/workflow/plan-execute-verify/)). Never weaken a check to get a pass ([BP-0038](/software-engineering/testing/keep-tests-honest/)).

### Prove what risky changes depend on

7. **SHOULD** for a change whose safety rests on an argument, find the one or two facts it depends on and push each as far down this ladder as is cheap, saying where it stopped:

   | Level | Evidence |
   | --- | --- |
   | 1 | Stated — worthless on its own |
   | 2 | Pointed at: real `file:line` or library source |
   | 3 | Reasoned: the failure path walked and shown not to reach |
   | 4 | Run: a script or test calls the real code and fails loudly if wrong |
   | 5 | Reproduced in the running app |

8. **SHOULD** in adversarial review, keep only findings that a run reproduces (a failing test, a repro script, command output) and drop the rest; ask the reviewer to report gaps that affect correctness and skip style, or it will always find *something* ([BP-0036](/software-engineering/version-control-review/review-agent-written-changes/)).

### Enforce where it matters

9. **SHOULD** choose how strongly the check is enforced, from weakest to strongest: asked for in the prompt; set as a goal the harness re-checks each turn; a Stop hook that refuses to end the turn until the check passes; a review by an agent that did not write the code ([BP-0021](/agent-engineering/tool-use/use-hooks-for-deterministic-control/)).
10. **SHOULD** for long or unattended runs, keep a decision log (one row per decision: what, why, evidence pointer, result) and check at the end that every row's evidence resolves and shows what the row claims ([BP-0048](/multi-agent-systems/coordination-handoff/orchestrate-agent-workflows/)).

## When to apply

Every task an agent reports as complete; strictest for unattended runs, sub-agent results, and changes that ship.

## Examples

Stop hook that blocks the end of a turn until the type check passes (Claude Code `.claude/settings.json`, from Claude Code's docs):

```json
{
  "hooks": {
    "Stop": [
      { "hooks": [ { "type": "command", "command": "pnpm tsc --noEmit 1>&2 || exit 2" } ] }
    ]
  }
}
```

Report shape:

```text
Done: rate limiter (R-004, R-005)
- bun test tests/ratelimit → 18 pass, 0 fail
- bun run build → exit 0
- Drove /api/login 12× in 10s via verify-app skill → 11th returned 429 (evidence: .verify/ratelimit.txt)
- Not checked: behaviour behind the CDN (no staging access)
```

Decision log row:

```text
2026-11-24T14:05Z	widget	rejected helper's result	its screenshots were blank; checked the files, not its summary	worktree reset	reverted
```

## Anti-patterns

- "All tests pass" with no command or output.
- Trusting a sub-agent's "success" without looking at its diff.
- "Fixed" because the code changed, without reproducing the original symptom.
- Unit tests green, feature never run.
- Review findings nobody reproduced, all "fixed" anyway.
- A check written in AGENTS.md that nothing enforces, for a rule that must never be skipped.

## Checklist

- [ ] A pass/fail check exists and its command is in the agent instructions
- [ ] Fresh run, full output read, before every completion claim
- [ ] Evidence matches the claim; real artefact checked, not a proxy
- [ ] Partial results reported honestly; checks never weakened
- [ ] Safety facts of risky changes proven by running code
- [ ] Review findings kept only when reproduced
- [ ] Enforcement level chosen (prompt, goal, Stop hook, independent review)

