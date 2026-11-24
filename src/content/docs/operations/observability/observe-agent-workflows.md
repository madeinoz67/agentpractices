---
title: Observe agent workflows, not just single runs
description: Trace a workflow as one root span with phases and units beneath it; record role, model, effort, attempt and gate outcome per unit; measure lead time, retries, escalations, human waits and cost per completed unit; detect stuck and looping work; and review the numbers to tune the workflow.
id: BP-0051
domain: D.OPS.OBS
type: guideline
roles: [orchestrator, implementer]
stage: [build, operate]
status: draft
version: 1.0.0
updated: 2026-11-24
related: [BP-0039, BP-0048, BP-0050, BP-0049, BP-0041, BP-0040]
sources:
  - { title: OpenTelemetry GenAI semantic conventions, url: https://github.com/open-telemetry/semantic-conventions-genai }
---

Run-level tracing ([BP-0039](/operations/observability/trace-agent-runs/)) shows what one agent did. A workflow ([BP-0048](/multi-agent-systems/coordination-handoff/orchestrate-agent-workflows/)) spans many runs, agents, retries and human waits. Observe it as one thing.

## Rules

### Structure the telemetry like the workflow

1. **MUST** trace each workflow as one root span (OpenTelemetry GenAI defines an `invoke_workflow` operation, still in development status), with a child span per phase, a child span per unit, and `invoke_agent` / model / tool spans beneath.
2. **MUST** give every workflow and unit a stable ID, carry it into dispatched agents and tools, and write it on the matching ledger line, so the ledger and the traces can be joined.
3. **MUST** record on each unit span: role, model, effort (`gen_ai.request.reasoning.level`), attempt number, escalation step, outcome (done, failed, blocked, needs human), gate result, and rulings made.
4. **MUST NOT** record prompts or outputs in full by default; the redaction and retention rules of [BP-0039](/operations/observability/trace-agent-runs/) apply.

### Measure the workflow

5. **MUST** measure, per workflow type:

   | Metric | Why |
   | --- | --- |
   | Lead time, total and per phase | Where time goes |
   | Units done / failed / blocked | Throughput and failure points |
   | Retries and escalations per unit | Weak briefs, wrong model or effort |
   | Human wait time and interventions | Where people are the bottleneck or the safety net |
   | Review findings by severity; rework (units reopened) | Quality escaping the execute phase |
   | Tokens and cost per completed unit and per workflow, by role, model and effort | Whether the role table pays off ([BP-0049](/agent-engineering/workflow/match-model-and-effort-to-the-role/)) |

6. **SHOULD** count cost per *completed* unit, so failed attempts and retries are included rather than hidden ([BP-0041](/operations/cost-performance/budget-and-control-agent-cost/)).

### Catch trouble early

7. **MUST** emit a heartbeat from long-running units and alert on: no progress for a set time, the same tool call repeated, attempts above the retry cap, budget or time above the stop condition, and workers left running after the workflow ends.
8. **MUST** make alerts actionable: route them to the workflow owner with the workflow ID, failing unit and a trace link.
9. **SHOULD** show drift signals beside workflow metrics: served model, effort and golden-set results ([BP-0050](/operations/evaluation/detect-model-drift/)), so a quality drop can be traced to a model change rather than guessed at.

### Close the loop

10. **SHOULD** review the numbers on a regular cadence (for example weekly): most-failing phases, most expensive roles, escalation hotspots. Change briefs, model or effort, or the workflow shape, and record the change.
11. **SHOULD** keep the audit trail separate from telemetry: traces may be sampled; actions with side effects are always recorded ([BP-0040](/operations/observability/keep-an-audit-trail/)).

## When to apply

Any multi-step or multi-agent workflow that runs repeatedly, unattended, or across sessions.

## Examples

```text
invoke_workflow wf=feature-x-20261124                     2h41m  $18.40  status=done
├─ phase clarify                                          9m     human_wait=7m
├─ phase plan        model=opus-5.5 effort=high           6m     $1.20
├─ phase execute                                          1h58m
│  ├─ unit 1  role=implementer model=sonnet-5.5 effort=medium attempt=1 gate=pass  $1.90
│  ├─ unit 2  role=implementer model=sonnet-5.5 effort=medium attempt=2 gate=fail
│  │          escalate→effort=high attempt=3 gate=pass  rulings=1                  $4.70
│  └─ unit 3  role=explorer    model=haiku-5.5  effort=low    attempt=1 gate=pass  $0.20
├─ phase verify     role=final-reviewer model=opus-5.5 effort=high findings=I1,M2 $3.10
└─ phase integrate  human_approval=merge                  12m
```

Alert rules (pseudo):

```yaml
# author: Stephen Eaton
- alert: unit_stalled
  when: unit.heartbeat_age > 15m and unit.status == running
- alert: retry_cap_exceeded
  when: unit.attempt > 2
- alert: served_model_mismatch
  when: gen_ai.response.model != gen_ai.request.model
- alert: workflow_over_budget
  when: workflow.cost_usd > workflow.budget_usd
```

## Anti-patterns

- Traces per agent run with no workflow ID, so nobody can see the whole job.
- Measuring cost per call instead of per completed unit.
- Retries and escalations that leave no record.
- Dashboards nobody reviews, and alerts nobody owns.

## Checklist

- [ ] Workflow root span with phase and unit spans; IDs joined to the ledger
- [ ] Role, model, effort, attempt, outcome and gate recorded per unit
- [ ] Workflow metrics measured, cost per completed unit included
- [ ] Heartbeats and stall, loop, retry and budget alerts with owners
- [ ] Drift signals shown alongside; regular review changes the workflow

## References

- [OpenTelemetry GenAI semantic conventions](https://github.com/open-telemetry/semantic-conventions-genai)
