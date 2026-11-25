---
title: Orchestrate agent workflows as gated phases with a durable ledger
description: Run multi-step agent work as named phases (clarify, plan, execute, verify, integrate) with exit gates; keep the plan and progress in a ledger file, not the orchestrator's context; dispatch self-contained briefs; cap retries and escalate; end with an independent review.
id: BP-0048
domain: D.MAS.HND
type: pattern
roles: [orchestrator, planner]
stage: [plan, build, verify]
status: draft
version: 1.0.0
updated: 2026-11-24
reviewed: 2026-11-24
review_by: 2027-05-24
related: [BP-0049, BP-0042, BP-0003, BP-0002, BP-0008, BP-0013, BP-0036, BP-0041]
sources:
  - { title: Anthropic — Building effective agents, url: https://www.anthropic.com/research/building-effective-agents }
  - { title: Anthropic — How we built our multi-agent research system, url: https://www.anthropic.com/engineering/multi-agent-research-system }
  - { title: Claude Code docs — Subagents, url: https://code.claude.com/docs/en/sub-agents }
---

## Rules

### Shape the workflow

1. **MUST** run non-trivial work as named phases, each with an exit gate the orchestrator checks before moving on:

   | Phase | Produces | Exit gate |
   | --- | --- | --- |
   | **Clarify** | Goal, why, constraints, done-criteria | Human (or principal) agrees the intent; open questions answered or recorded as assumptions |
   | **Plan** | Units of work with interfaces and tests ([BP-0008](/agent-engineering/workflow/decompose-tasks/)) | Every requirement maps to a unit; every unit has a check |
   | **Execute** | Artefacts, one unit at a time or in parallel | Each unit's own check passes ([BP-0002](/agent-engineering/workflow/plan-execute-verify/)) |
   | **Verify** | Independent review of the whole result | Critical and important findings fixed, each with a test |
   | **Integrate** | Merge, release or hand-over | Human approves irreversible steps |

2. **MUST** choose the topology before the phases ([BP-0042](/multi-agent-systems/team-topologies-roles/choose-the-simplest-agent-topology/)); a workflow does not need many agents. One agent running these phases is often enough.
3. **SHOULD** scale the ceremony to the stakes: a one-file fix may collapse Clarify and Plan into one line; a multi-day change gets a written spec and plan.

### Keep state outside the context

4. **MUST** keep the plan and a progress ledger in files (or workflow memory, [BP-0013](/agent-engineering/context-memory/use-temporary-workflow-memory/)), with one line per completed unit: what was done, the commit or artefact, the check that passed. Context is compacted or lost; the ledger and version control are the record.
5. **MUST** make the workflow resumable: on restart, the orchestrator reads the ledger and `git log`, and continues at the first unit without a completion line. It never redoes completed units from memory.
6. **MUST** record every deviation from the plan as a ruling in the ledger: what was decided, why, and the cost if wrong.

### Dispatch and collect

7. **MUST** dispatch each unit with a self-contained brief and require a structured result ([BP-0003](/multi-agent-systems/coordination-handoff/handoff-contracts/)). Set the model and effort for each role ([BP-0049](/agent-engineering/workflow/match-model-and-effort-to-the-role/)).
8. **MUST** run units in parallel only when they are independent and touch disjoint files; isolate parallel writers ([BP-0035](/software-engineering/version-control-review/isolate-parallel-agents-with-worktrees/)).
9. **SHOULD** have workers return conclusions, artefact locations and evidence, not transcripts, so the orchestrator's context stays small.

### Fail, escalate, stop

10. **MUST** cap retries per unit (for example two) and then escalate, in this order: more context in the brief → a higher effort level → a more capable model → a human. Do not loop on the same failing brief.
11. **MUST** define stop conditions before starting: budget, wall-clock time, and the actions that always need a human (irreversible, destructive, security-sensitive, external side effects) ([BP-0041](/operations/cost-performance/budget-and-control-agent-cost/)).
12. **MUST** end with a review by a fresh context that did not produce the work, on the most capable model available, against the spec ([BP-0036](/software-engineering/version-control-review/review-agent-written-changes/)). Fix what it finds with tests; do not re-review indefinitely.

## When to apply

Any task with more than a few steps, more than one artefact, or work that may outlast one context window or one session.

## Examples

Ledger (`.work/feature-x/progress.md`):

```markdown
# ledger — plan: docs/plans/2026-11-24-feature-x.md
Unit 1: complete (a1b2c3d..d4e5f6a, tests: bun test → 41 pass)
Unit 2: Ruling: plan used `fetchAll()`; spec requires paging → used `fetchPage()` — cost if wrong: one extra refactor
Unit 2: complete (d4e5f6a..0a1b2c3, tests: bun test → 44 pass)
Final review: 1 important fixed (test: rejects-empty-page RED→GREEN), 2 minors deferred
```

Software change, single orchestrator: Clarify with the user → write spec → plan into five units → implement each test-first in the main session → one independent reviewer subagent on the full diff → human merges.

Research: orchestrator plans angles → parallel researcher workers (small model, low effort) each return findings with citations → orchestrator synthesises → fresh reviewer checks claims against sources.

## Anti-patterns

- The plan lives only in the orchestrator's context and is gone after compaction.
- Redoing finished units because the orchestrator "doesn't remember" them.
- Retrying the same brief on the same model until it passes.
- The author reviewing its own work as the only verification.
- Checking in with the human after every unit when nothing needs a decision.

## Checklist

- [ ] Phases and exit gates named
- [ ] Plan and ledger in files; workflow resumable
- [ ] Briefs self-contained; model and effort set per role
- [ ] Parallel units independent and isolated
- [ ] Retry cap, escalation path and stop conditions defined
- [ ] Independent final review; findings fixed with tests

## References

- [Anthropic — Building effective agents](https://www.anthropic.com/research/building-effective-agents)
- [Anthropic — How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
