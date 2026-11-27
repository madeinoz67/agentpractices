---
title: Plan, execute, verify
description: Run every non-trivial task as an explicit plan, small verified steps, and a final check against the request.
id: BP-0002
domain: D.AGT.WF
type: pattern
roles: [any]
stage: [plan, build, verify]
status: draft
version: 1.0.1
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0003, BP-0006, BP-0008, BP-0010]
sources:
  - title: "Anthropic — Building effective agents"
    url: https://www.anthropic.com/research/building-effective-agents
    note: Composable patterns beat frameworks, and complexity is added only where a measured need appears
---
## Rules

1. **MUST** restate the goal and its success criteria before acting on any task with more than a couple of steps.
2. **MUST** verify each step with evidence (a command's output, a test result, a re-read of the changed file) before claiming it is done.
3. **MUST** check the final result against the original request, not against the plan.
4. **MUST NOT** report success that has not been verified; say what was checked and what was not.
5. **SHOULD** break work into steps small enough that a failed step is cheap to redo.
6. **SHOULD** record decisions made without the requester (assumptions, deviations from the plan) where the requester will see them.
7. **SHOULD** stop and ask only for irreversible actions, security-sensitive actions, or genuine ambiguity that changes the outcome.
8. **MAY** skip the written plan for single-step tasks.

## When to apply

Any task an agent cannot complete and verify in one action. Especially when working unattended or handing off.

## Procedure

1. **Plan** — goal, success criteria, constraints, ordered steps, the check for each step.
2. **Execute** — one step at a time; run its check; on failure, find the cause before retrying.
3. **Verify** — re-read the request; check every requirement against evidence; list anything unverified.
4. **Report** — outcome first, then decisions made and anything left open.

## Examples

Good report: "Built the site; `bun test` 48/48 and `bun run build` pass. I assumed a public Pages site. Not done: custom domain."

Bad report: "Done! Everything should work now."

## Anti-patterns

- Retrying a failing command with small variations instead of reading the error.
- Treating "the plan's steps are complete" as "the request is met".
- Verifying by inspection only when a test or command could prove it.

## Checklist

- [ ] Success criteria written before starting
- [ ] Every step has evidence of completion
- [ ] Final check done against the request
- [ ] Assumptions and gaps reported

