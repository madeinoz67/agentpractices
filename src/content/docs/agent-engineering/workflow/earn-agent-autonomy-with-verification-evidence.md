---
title: Earn agent autonomy with verification evidence
description: "Grant each agent only the autonomy its verification evidence supports: named levels, one scope change at a time, a written demotion trigger, a sampled human observer at every level, and no promotion where the work cannot be verified."
id: BP-0102
domain: D.AGT.WF
type: guideline
roles: [orchestrator, reviewer]
stage: [build, verify, operate]
status: draft
version: 1.0.0
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0032, BP-0036, BP-0038, BP-0059, BP-0069, BP-0042]
superseded_by: null
sources:
  - title: "Ai insider — Lauren Tan reveals how 30+ AI agents ship PRs while you sleep"
    url: https://www.youtube.com/watch?v=6hxp0SpGxz8
    note: The trust ladder, verification named as the single most important skill and the lever that allowed wider autonomy, and the warning that not all domains are verifiable; behind rules 2, 7, 8 and 12.
  - title: "Anthropic — Building effective agents"
    url: https://www.anthropic.com/engineering/building-effective-agents
    note: Agents trade latency and cost for autonomy, and human checkpoints and guardrails remain necessary; behind rules 6 and 11.
  - title: "Google SRE Workbook — Canarying Releases"
    url: https://sre.google/workbook/canarying-releases/
    note: Gradual exposure to a small share, comparison against a control, and abort and rollback criteria; behind rule 9.
---

An agent is usually switched between two states: every action needs a person, or the agent runs unsupervised. The switch is flipped by configuration, by a good demo, or by fatigue, not by evidence. When a defect escapes, the reaction is to turn everything off, which discards the evidence that justified the earlier levels and leaves nobody knowing where the real boundary was.

This practice makes autonomy a ladder with evidence at each rung. Verification is the lever: as checks catch real defects, a level can be earned; when a check is skipped or a defect escapes, the level is lost. The levels, scopes, evidence, demotion triggers and the human observer are written down, so promotion and demotion are decisions instead of moods. The trust-ladder framing and the warning that not every domain can be verified come from Lauren Tan's talk (first source); the level recording, demotion and sampling rules are additions grounded in the sources below.

## Rules

1. **MUST** define the autonomy levels in use and the exact scope each covers (files, repositories, environments, external messages, money). Name the levels; do not describe them ad hoc.
2. **MUST** give every level an entry criterion made of evidence: the checks that must pass, the sample they must pass over, and the clean period with no escaped defect.
3. **MUST** record each agent's current level, scope, the evidence that justified it and the date, in one place a reviewer can read.
4. **MUST** widen one level or one scope at a time, never both together, so a failure can be attributed to the change that caused it.
5. **MUST** write the demotion trigger before the promotion: a severity-1 escaped defect, a skipped check, or a check that cannot run returns the agent to the previous level immediately (see [BP-0038](/software-engineering/testing/keep-tests-honest/) for what a skipped or weakened check looks like).
6. **MUST** keep a human approval point for irreversible, externally visible or financial actions at every level ([BP-0069](/agent-engineering/workflow/design-human-approvals-people-read/)).
7. **MUST** count only evidence from a check the agent did not write and cannot edit ([BP-0036](/software-engineering/version-control-review/review-agent-written-changes/), [BP-0038](/software-engineering/testing/keep-tests-honest/)); a self-reported pass is not evidence.
8. **MUST** keep reviewing a sample of output at every level, including the highest, so promotion does not remove the last observer.
9. **SHOULD** stage exposure the way a canary does: a small share of the work first, with an abort criterion and a rollback path.
10. **MUST** review each level and its evidence on a fixed cadence, and demote when the evidence is stale or the sample has not run.
11. **SHOULD** compare the cost of the constraint (human wait time) with the cost of an escaped defect, so the decision is economic and recorded.
12. **MUST NOT** promote a domain that cannot be verified (a migration, a payment path, an irreversible action) past act-and-report.

## When to apply

Use it wherever an agent acts on something a person cares about: code changes, tickets, replies to customers, deployments, purchases. It matters most when several agents run at once, because a single agent's autonomy is easy to watch and a fleet's is not.

A one-off task does not need a ladder; it needs a reviewer. A domain with no working verification (an untested migration, a payment path, anything without a rollback) stays at act-and-report no matter how good the agent looks. And do not build the ladder before there is a check to climb it with: a level earned with no verification is just unsupervised operation with extra paperwork.

## Procedure

1. List the levels and the scope each one unlocks. A workable set is propose, act with approval, act and report, merge, deploy; add or remove levels for the domain.
2. For each level, write the entry evidence: which checks, over what sample, with what clean period, and who confirms it.
3. Record every agent's current level, scope and the evidence behind it, with the date.
4. Name the check that is independent of the agent, and prove it can fail: run it against a known-bad case ([BP-0038](/software-engineering/testing/keep-tests-honest/)).
5. Write the demotion trigger for each level before anyone is promoted.
6. Set the sample plan for human review at the top level: how many outputs, chosen how, reviewed by whom ([BP-0069](/agent-engineering/workflow/design-human-approvals-people-read/)).
7. Promote one axis: one level, or one scope. Record the change and what it is expected to prove.
8. Review the evidence on the cadence. Demote on a trigger without a debate, then investigate.
9. Keep the level record beside the agent's own configuration, so a change to permissions is a change to the record.

## Examples

A coding agent climbs four rungs. At propose it writes patches a person applies. At act-with-approval it opens pull requests. At act-and-report it merges when the checks pass. At deploy it ships behind a flag. Entry to act-and-report is 200 merged changes, a random sample of 40 reviewed with no severity-1 or severity-2 finding, and 30 days without a revert caused by the agent. One escaped severity-1 defect, or one skipped check, returns it to act-with-approval until the cause is fixed and the sample is repeated.

A support agent drafts replies. The levels are draft-only, send after a person approves, and send and report. Entry to send-and-report is 95 percent agreement with the reviewer on 100 sampled drafts over two weeks. Refunds and account closures stay at approval at every level. When the sample agreement drops below 90 percent, the agent returns to draft-only.

A migration agent never passes act-and-report. The work has no cheap rollback and no complete verification, so every change keeps a human approval, however reliable the agent has been.

## Anti-patterns

- Switching an agent to autopilot after one good demo, with no sample and no clean period.
- Promoting because the agent is fast, or because the reviewer is tired, rather than because the evidence says so.
- Counting the agent's own test run as proof that the agent works.
- Widening the level and the scope in one step, then arguing about which change caused the failure.
- A ladder with no demotion path, so every level is permanent once reached.
- Sampling at the low levels and stopping at the high ones, which removes the observer exactly when the stakes are highest.
- Treating "no incidents yet" as evidence when the sample never ran.
- Promoting a domain that cannot be verified because "the model is good now".

## Checklist

- [ ] The levels and the scope each covers are named and written down
- [ ] Every level has an entry criterion made of checks, a sample and a clean period
- [ ] Each agent's current level, scope, evidence and date are recorded
- [ ] Promotion changes one level or one scope, never both
- [ ] Every level has a demotion trigger written before promotion
- [ ] Human approval remains for irreversible, external or financial actions
- [ ] Evidence comes from a check the agent did not write and cannot edit
- [ ] A human sample is reviewed at every level, including the highest
- [ ] Levels and evidence are reviewed on a cadence, and stale evidence demotes
- [ ] No unverifiable domain is promoted past act-and-report
