---
title: Budget and control agent cost and latency
description: Set a budget per task with hard caps on turns, tokens and spend; measure cost per completed task; cache stable prompt prefixes; route each step to the smallest model that meets the bar; batch non-urgent work; and stop runaway loops.
id: BP-0041
domain: D.OPS.CST
type: guideline
roles: [orchestrator, implementer]
stage: [plan, build, operate]
status: draft
version: 1.0.1
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0039, BP-0011, BP-0028, BP-0008, BP-0006]
sources:
  - title: "Claude Platform docs — Prompt caching"
    url: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
    note: Cache write and cache read breakpoints, the mechanism behind the stable-prefix rule, and the usage figures that confirm hits
  - title: "Claude Platform docs — Batch processing"
    url: https://platform.claude.com/docs/en/build-with-claude/batch-processing
    note: A discounted asynchronous path for bulk, non-urgent work, which rule 8 weighs against the wait
---
## Rules

### Budgets

1. **MUST** set a budget for every unattended run: maximum turns, tokens, spend and wall-clock time, enforced by the harness, with the run stopping and reporting when a cap is hit.
2. **MUST** stop loops: cap retries per step, detect repeated identical tool calls or errors, and escalate to a person instead of trying again.
3. **SHOULD** measure cost and time per **completed task** (not per call), and track them over time alongside quality ([BP-0006](/operations/evaluation/evaluate-agent-output/)) so savings that lower quality are visible.

### Context and caching

4. **MUST** keep context lean: load by reference and retrieve passages, not whole files or documents ([BP-0011](/agent-engineering/context-memory/manage-short-term-memory/), [BP-0028](/agent-engineering/context-memory/retrieve-context-well/)).
5. **SHOULD** order prompts so stable content comes first (tool definitions, system instructions, shared documents) and per-request content last, and enable prompt caching on the stable prefix. Do not put timestamps or per-request values before the cache point, or every request pays to write the cache and none reads it.
6. **SHOULD** check cache effectiveness from the usage figures (cache-read versus cache-write versus uncached input tokens) rather than assuming it works.

### Model choice and scheduling

7. **SHOULD** route each step to the smallest model that meets its quality bar (for example a small model for classification and extraction, a larger one for planning and review), and verify the bar with evaluations before switching.
8. **SHOULD** use batch processing for work that does not need an immediate answer (bulk classification, nightly summaries), where the provider offers it at lower cost.
9. **SHOULD** run independent sub-tasks in parallel to cut wall-clock time, but count the extra tokens each sub-agent spends re-reading context, and prefer one agent for small tasks.
10. **SHOULD** cap output length per step, and ask for structured output where free text is not needed.

## When to apply

Any agent workload that runs repeatedly, unattended, at scale, or on a budget.

## Examples

| Lever | Before | After |
| --- | --- | --- |
| Caching | 18k-token system prompt + tools sent uncached every turn | Stable prefix cached; most input billed at cache-read rate after the first call |
| Routing | Largest model for every step | Small model tags 500 receipts; large model reviews the 20 it flagged |
| Context | Whole repository files read each turn | Code index queries; only the needed spans |
| Loops | Agent retries a failing build 40 times | Two retries, then stop and report |
| Scheduling | Nightly report runs interactively | Submitted as a batch job |

## Anti-patterns

- No budget on an unattended agent.
- A timestamp at the top of the system prompt, defeating the cache.
- Switching to a cheaper model without re-running evaluations.
- Ten parallel sub-agents for a task one agent finishes in five minutes.

## Checklist

- [ ] Turn, token, spend and time caps enforced; loops detected
- [ ] Cost and time per completed task tracked with quality
- [ ] Stable prefix first and cached; cache hits checked
- [ ] Smallest adequate model per step, verified by evals
- [ ] Batch for non-urgent work; parallelism justified; output capped

