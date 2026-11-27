---
title: Design repeatable agent work as a production line with station checks
description: Model repeatable agent work as stations with exit checks, work-in-progress caps and pull, so flow is measured and capacity goes to the bottleneck.
id: BP-0096
domain: D.MAS.TOP
type: pattern
roles: [orchestrator, reviewer]
stage: [plan, build, operate]
status: draft
version: 1.0.1
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0042, BP-0048, BP-0095, BP-0003]
superseded_by: null
sources:
  - title: "Atlassian — Work in progress (WIP) limits"
    url: https://www.atlassian.com/agile/kanban/wip-limits
    note: The case for capping work in progress at a station and pulling only when below the cap, behind rule 3
  - title: "Theory of constraints — the bottleneck sets throughput"
    url: https://en.wikipedia.org/wiki/Theory_of_constraints
    note: The claim that one bottleneck sets the whole line’s throughput, behind the add-capacity-here-first order in rule 5
  - title: "Anthropic — How we built our multi-agent research system"
    url: https://www.anthropic.com/engineering/multi-agent-research-system
    note: The orchestrator-worker split this line design wraps in stations, with the handoff each exit check polices
  - title: "Google SRE Book — Handling Overload"
    url: https://sre.google/sre-book/handling-overload/
    note: Admission control as the alternative to queueing everything a client sends, behind the cap in rule 3
---
An agent factory runs the same kind of work many times: tickets, content items, test batches, pull requests. Most teams model each item as its own workflow, with its own brief, its own retries and its own idea of done. Nothing then links the items into a line, so work is pushed downstream before it is ready, queues grow where nobody measures them, and capacity is added where it is cheap to add rather than where it is blocking.

This practice models the repeating work as stations with exit checks and a work-in-progress cap per station, so that flow can be measured and capacity goes to the station with the longest wait. It complements the topology choice in [BP-0042](/multi-agent-systems/team-topologies-roles/choose-the-simplest-agent-topology/), which decides the shape of the team, and the phase and ledger machinery in [BP-0048](/multi-agent-systems/coordination-handoff/orchestrate-agent-workflows/), which governs one item's journey.

## Rules

### Shape the line

1. **MUST** define the line as an ordered list of stations, each naming the role that owns it, the artefact it consumes, the artefact it produces, and an exit check that returns pass or fail.
2. **MUST NOT** pass a unit to the next station until its exit check passes and the evidence is written on the unit's record.

### Cap and pull

3. **MUST** cap work in progress at each station, have the station pull the next unit only when it is below the cap, and queue the rest in arrival order.
4. **MUST** set each cap from what its owner can read and verify in one cycle, and from provider rate limits, not from the number of items that are ready.

### Find the bottleneck

5. **MUST** measure queue length and wait time at every station, and add capacity at the station with the longest wait before adding it anywhere else.

### Keep it checkable and resumable

6. **MUST NOT** accept a station whose only exit check is its own agent reporting success; the exit check is an artefact, a test run, or a review by an agent that did not do the work ([BP-0095](/multi-agent-systems/coordination-handoff/run-concurrent-agents-on-disjoint-work-and-settle-conflicts/)).
7. **SHOULD** keep each hand-off as a versioned artefact on a shared record (branch, ticket, ledger), not in chat, so the line can resume after a restart ([BP-0003](/multi-agent-systems/coordination-handoff/handoff-contracts/)).
8. **SHOULD** keep station definitions and caps in version control with the line, so a change is reviewed like a code change.
9. **MAY** collapse adjacent stations when volume is low and one agent can run both without losing either exit check.

## When to apply

Apply this practice when the same sequence of steps processes a steady stream of similar work items, and the team already repeats that sequence more than a handful of times. A one-off task is a workflow, not a line: use [BP-0002](/agent-engineering/workflow/plan-execute-verify/) and [BP-0048](/multi-agent-systems/coordination-handoff/orchestrate-agent-workflows/) for it.

## Procedure

1. List the stations in the order work moves through them. For each, write the owner, the input artefact, the output artefact and the exit check.
2. Draw the line. Mark each station where a person decides or approves, and the station that produces the artefact the requester accepts.
3. Set each station's work-in-progress cap to one. Raise a cap only after the station's queue is measurably drained, and record the change.
4. Instrument queue length, wait time, work time and cycle time per station, on one shared record keyed by item ID.
5. Run the line for a week before changing capacity. Identify the station with the longest average wait.
6. Add capacity at that station first: another worker, a shorter brief, or a deterministic check that removes work. Re-measure before changing anything else.
7. Review the station list and the caps on a regular cadence, and record every change with its before and after numbers.

## Examples

Software line: triage (owner: orchestrator; exit check: the item has an acceptance criterion and a linked issue) → implement (owner: implementer; exit check: the item's tests pass in the worktree) → review (owner: an agent that did not write the code; exit check: findings recorded, no critical or important finding open) → merge (owner: a human or policy; exit check: CI green and the pull request references the issue). Each station holds at most two items; the rest wait in arrival order.

Content line: brief (owner: planner; exit check: the brief names audience, length and sources) → draft (owner: writer; exit check: the draft meets the brief's checklist) → edit (owner: a second agent; exit check: the edit log is closed) → publish (owner: a human; exit check: approval recorded). The edit station is usually the bottleneck; adding writers does not raise throughput there.

## Anti-patterns

- Pushing every ready item into the next station, then blaming the reviewer for the queue.
- A station whose exit check is the agent's own success message.
- Adding workers across the line when one station is the constraint.
- Hand-offs in chat, so the line cannot resume after a restart or hand-over.
- Designing every item as a fresh workflow with no shared record, then wondering why throughput is unmeasurable.
- Treating the list of stations as fixed, so a station that no longer earns its exit check is kept forever.

## Checklist

- [ ] Every station names its owner, input, output and a pass/fail exit check
- [ ] No unit passes a station without its exit check passing and the evidence recorded
- [ ] Work in progress is capped per station, with pull and an arrival-order queue
- [ ] Caps are sized from verifiable capacity and rate limits, not ready items
- [ ] Queue length and wait time are measured, and capacity goes to the longest wait
- [ ] No station approves its own work

