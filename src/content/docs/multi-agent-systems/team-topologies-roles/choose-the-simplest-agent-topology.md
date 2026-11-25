---
title: Choose the simplest agent team topology that works
description: Start with one agent; add agents only for parallel, independent or specialised work; pick a known topology (orchestrator-workers, pipeline, evaluator-optimiser, router) with defined roles and one owner per decision.
id: BP-0042
domain: D.MAS.TOP
type: guideline
roles: [orchestrator, planner]
stage: [plan]
status: draft
version: 1.0.0
updated: 2026-11-24
reviewed: 2026-11-24
review_by: 2027-05-24
related: [BP-0043, BP-0003, BP-0008, BP-0035, BP-0041]
sources:
  - { title: Anthropic — Building effective agents, url: https://www.anthropic.com/research/building-effective-agents }
  - { title: Anthropic — How we built our multi-agent research system, url: https://www.anthropic.com/engineering/multi-agent-research-system }
---

## Rules

1. **MUST** start with a single agent (or a fixed workflow) and add agents only when a single agent demonstrably fails on context size, parallelism or specialisation. More agents add cost, latency and coordination failures.
2. **MUST** choose a known topology and draw it before building:

   | Topology | Use when | Watch for |
   | --- | --- | --- |
   | **Single agent + tools** | Most tasks | Context growth ([BP-0011](/agent-engineering/context-memory/manage-short-term-memory/)) |
   | **Pipeline** (fixed sequence) | Steps are known and ordered | Errors passing down the chain; add gates |
   | **Router** | Inputs fall into distinct types handled differently | Misrouting; measure it |
   | **Orchestrator–workers** | Work splits into independent sub-tasks decided at run time | Duplicate or conflicting work; token cost |
   | **Evaluator–optimiser** | Output quality can be judged against criteria | Loops that never converge; cap iterations |

3. **MUST** define each role: its goal, inputs, outputs, tools and permissions, and what it must not do. Give workers only the tools their role needs ([BP-0032](/security-safety/least-privilege-secrets/give-agents-least-privilege/)).
4. **MUST** give every decision and every piece of shared state one owner (usually the orchestrator); workers propose, the owner decides ([BP-0003](/multi-agent-systems/coordination-handoff/handoff-contracts/)).
5. **MUST** keep a human-in-the-loop step for irreversible or high-impact actions, whatever the topology.
6. **SHOULD** size parallelism to the work: independent, file-disjoint sub-tasks only ([BP-0008](/agent-engineering/workflow/decompose-tasks/)); scale the number of workers to task complexity rather than a fixed number.
7. **SHOULD** have workers return conclusions and references, not full traces, so the orchestrator's context stays small.
8. **SHOULD** use a separate reviewer role (with no stake in the output) for high-stakes work ([BP-0036](/software-engineering/version-control-review/review-agent-written-changes/)).
9. **SHOULD** measure the topology: task success, cost and time per task versus the single-agent baseline ([BP-0041](/operations/cost-performance/budget-and-control-agent-cost/)).

## When to apply

Designing any system with more than one agent, or deciding whether to split one.

## Examples

Software team: orchestrator (plans, assigns, owns `main`) → implementer workers (one worktree each, [BP-0035](/software-engineering/version-control-review/isolate-parallel-agents-with-worktrees/)) → reviewer (independent) → human approves merge.

Research: orchestrator decomposes the question → parallel researcher workers each search one angle → orchestrator synthesises with citations.

## Anti-patterns

- A "team" of ten agents for a task one agent finishes.
- Peer agents with no owner, negotiating forever.
- Every worker holding every tool and credential.
- Workers pasting their whole transcript back to the orchestrator.

## Checklist

- [ ] Single-agent baseline tried first
- [ ] Known topology chosen and drawn
- [ ] Roles defined with tools, permissions and limits
- [ ] One owner per decision and state; human gate for irreversible actions
- [ ] Topology measured against the baseline

## References

- [Anthropic — Building effective agents](https://www.anthropic.com/research/building-effective-agents)
- [Anthropic — Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
