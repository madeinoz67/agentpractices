---
title: Trace agent runs end to end
description: Record every agent run as one trace — a span per model call, tool call and sub-agent, linked by a run ID across agents — with model, tokens, cost, latency, decisions and errors, using the OpenTelemetry GenAI conventions and redacting content by default.
id: BP-0039
domain: D.OPS.OBS
type: guideline
roles: [implementer, orchestrator]
stage: [build, operate]
status: draft
version: 1.0.0
updated: 2026-11-24
reviewed: 2026-11-24
review_by: 2027-05-24
related: [BP-0040, BP-0041, BP-0006, BP-0033]
sources:
  - { title: OpenTelemetry GenAI semantic conventions, url: https://github.com/open-telemetry/semantic-conventions-genai }
---

## Rules

1. **MUST** give every agent run a run ID and record it as one trace, with child spans for each model call, tool call, retrieval and sub-agent.
2. **MUST** pass the run ID (trace context) to sub-agents, MCP servers and workflow stores, so a multi-agent run can be followed across processes.
3. **MUST** record on each model-call span: provider, model and version, input and output token counts (including cached tokens), latency, stop reason, and errors.
4. **MUST** record on each tool-call span: tool and server name, outcome (success, error, blocked, needs approval), duration, and whether it had side effects.
5. **MUST NOT** record prompts, tool arguments or outputs in full by default. Capture content only where it is needed, opted in, redacted for secrets and personal data ([BP-0033](/security-safety/least-privilege-secrets/keep-secrets-out-of-agent-context/)), and kept for a defined retention period.
6. **SHOULD** use the OpenTelemetry GenAI semantic conventions (`gen_ai.*` attributes) so traces work across tools and vendors; check the current conventions repository, as they are still evolving.
7. **SHOULD** record run-level outcomes: task, final status (done, failed, stopped, needs human), number of turns, total tokens and cost, and the practices or skills used (`BP-ID@version`).
8. **SHOULD** alert on runaway or failing runs: turn or cost above budget, repeated identical tool calls, error-rate spikes, and blocked actions.
9. **SHOULD** sample routine successful runs if volume is high, but keep every failed, blocked or high-cost run.

## When to apply

Any agent that runs unattended, in production, or in multi-agent workflows; and when debugging why an agent did what it did.

## Examples

```text
trace run=wf-ci-triage-20261124 (orchestrator)            12m04s  $3.10  status=done
├─ gen_ai.chat  model=… in=18.2k (cached 15.9k) out=1.1k   6.2s
├─ tool  issues.list_failed_jobs   ok                        0.8s
├─ agent worker-1 (job/8812)                                3m10s  status=completed
│  ├─ gen_ai.chat …
│  └─ tool bash "bun test"  error exit=1                    41s
└─ tool memory.compare_and_set job/8812 active→completed  ok 0.1s
```

## Anti-patterns

- Logs per process with no shared run ID, so a multi-agent failure cannot be reconstructed.
- Full prompts, including secrets and personal data, stored in a log platform forever.
- Only recording errors, so cost and latency trends are invisible.

## Checklist

- [ ] One trace per run; spans for model, tool, retrieval and sub-agent calls
- [ ] Run ID propagated across agents and servers
- [ ] Model, tokens, cost, latency, outcome recorded
- [ ] Content capture opt-in, redacted, retained by policy
- [ ] Alerts on runaway, failing and blocked runs

## References

- [OpenTelemetry GenAI semantic conventions](https://github.com/open-telemetry/semantic-conventions-genai)
