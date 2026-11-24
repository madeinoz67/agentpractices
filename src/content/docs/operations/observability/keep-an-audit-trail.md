---
title: Keep an audit trail of agent actions
description: Record every side-effecting agent action in an append-only, tamper-evident log — which agent, on whose behalf, what it did, to what, who approved it, and the result — separate from debug logs and kept for as long as the records it changes.
id: BP-0040
domain: D.OPS.OBS
type: guideline
roles: [orchestrator, implementer, reviewer]
stage: [build, operate]
status: draft
version: 1.0.0
updated: 2026-11-24
related: [BP-0039, BP-0032, BP-0021, BP-0023, BP-0013]
sources:
  - { title: OWASP LLM06:2025 Excessive Agency, url: https://genai.owasp.org/llmrisk/llm062025-excessive-agency/ }
  - { title: W3C PROV-O, url: https://www.w3.org/TR/prov-o/ }
---

## Rules

1. **MUST** write an audit record for every side-effecting action an agent takes or attempts: writes, deletes, sends, deploys, permission changes, payments, and blocked or denied attempts.
2. **MUST** include in each record: time, agent identity and version, the user or principal it acted for, the action and target, the input that matters (redacted), the approval (who, when) where one was required, the outcome, and the run ID ([BP-0039](/operations/observability/trace-agent-runs/)).
3. **MUST** make the audit log append-only and tamper-evident (write-once storage, hash-chained records, or a separate system the agent cannot write to except by appending).
4. **MUST NOT** let the agent being audited read, alter or delete its own audit records.
5. **MUST** keep audit records separate from debug logs and traces, with their own access control and a retention period that matches the records or systems the actions changed.
6. **SHOULD** emit audit records from the enforcement point (the harness, hook, MCP server or downstream system), not from the agent's own narration of what it did.
7. **SHOULD** review audit records regularly for unexpected actions, denied attempts and approvals granted without review.
8. **MAY** represent records with a provenance vocabulary (PROV-O: agent, activity, entity, `wasAssociatedWith`, `used`) for interchange.

## When to apply

Any agent that changes systems or data, especially on behalf of users, in regulated or OT environments, or with elevated permissions.

## Examples

```json
{
  "time": "2026-11-24T22:14:03+08:00",
  "run": "wf-ci-triage-20261124",
  "agent": "worker-2@1.4.0",
  "on_behalf_of": "seaton",
  "action": "issues.close",
  "target": "github:madeinoz67/agentpractices#43",
  "approval": { "required": true, "by": "seaton", "at": "2026-11-24T22:13:50+08:00" },
  "outcome": "success",
  "prev_hash": "9f1c…", "hash": "b27e…"
}
```

## Anti-patterns

- Relying on the agent's chat transcript as the audit trail.
- Audit records in the same writable log file as debug output.
- Recording successes but not denied or blocked attempts.

## Checklist

- [ ] Every side-effecting action and attempt recorded
- [ ] Agent, principal, action, target, approval, outcome, run ID
- [ ] Append-only and tamper-evident; agent cannot alter its own records
- [ ] Separate from debug logs; retention matches the records changed
- [ ] Emitted at the enforcement point; reviewed regularly

## References

- [OWASP LLM06:2025 Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)
- [W3C PROV-O](https://www.w3.org/TR/prov-o/)
