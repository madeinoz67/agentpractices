---
title: Route agent model traffic through a governed gateway
description: Put a model gateway (team-wide, like LiteLLM; or local per developer, like Claude Code Router) between agents and providers to centralise keys, budgets, routing, fallbacks and logs — and treat the gateway itself as a high-value, pinned, access-controlled component.
id: BP-0046
domain: D.OPS.GW
type: guideline
roles: [orchestrator, implementer]
stage: [plan, build, operate]
status: draft
version: 1.0.0
updated: 2026-11-24
related: [BP-0041, BP-0032, BP-0033, BP-0039, BP-0044]
sources:
  - { title: LiteLLM AI Gateway docs, url: https://docs.litellm.ai/docs/simple_proxy/ }
  - { title: Claude Code Router, url: https://github.com/musistudio/claude-code-router }
---

## Rules

### Choosing

1. **SHOULD** use a central gateway when more than one person, agent or application calls models, or when you need per-key budgets, spend tracking, logs in one place or guardrails.
2. **SHOULD** choose the gateway by scope:

   | Need | Gateway type | Example |
   | --- | --- | --- |
   | Team or organisation: shared keys, budgets, routing, guardrails, MCP access | Central gateway (self-hosted or managed) | LiteLLM proxy |
   | One developer: send a coding agent's requests to other providers or models per task type | Local router on the developer's machine | Claude Code Router |

### Keys and access

3. **MUST** keep real provider keys only in the gateway, and give each agent, team or app its own gateway-issued key (virtual key) with allowed models, rate limits and a hard budget, so a runaway job or leaked key stops at its cap.
4. **MUST** protect the gateway's admin interface and master key (SSO, network restriction, no default keys), and store its credentials in a secret manager ([BP-0033](/security-safety/least-privilege-secrets/keep-secrets-out-of-agent-context/)).
5. **MUST** treat the gateway as a high-value component: it sees every prompt and response. Run it on trusted infrastructure, pin its version, review its configuration and plugins, and patch it promptly ([BP-0044](/security-safety/supply-chain/vet-and-pin-agent-dependencies/)).

### Routing

6. **MUST** route data only to providers and regions approved for it. Classify which agents and data may use which providers, and enforce it in the gateway's model allow-lists, not by convention.
7. **MUST** evaluate a model before routing real work to it, especially when substituting a different provider behind an agent built for another model; check tool-calling, long-context and output quality on your tasks ([BP-0006](/operations/evaluation/evaluate-agent-output/)).
8. **SHOULD** configure fallbacks and retries in the gateway for provider outages, with fallbacks to models that passed the same evaluation.
9. **SHOULD** respect provider and tool terms when routing (for example whether a client may be used with other providers).

### Observability

10. **SHOULD** log usage per key (tokens, cost, latency, errors) at the gateway and send traces to your tracing system with the agent's run ID ([BP-0039](/operations/observability/trace-agent-runs/)).
11. **MUST NOT** log full prompts and responses by default; redact secrets and personal data where content logging is needed.

## When to apply

Teams running several agents or applications against models; developers routing a coding agent to multiple providers.

## Examples

Central: agents call `https://llm-gw.internal/v1` with their own virtual key; the gateway holds provider keys, enforces `worker-*` keys to small models with a monthly budget, falls back from a primary to a secondary provider on errors, and masks personal data before it leaves.

Local: Claude Code runs with `ANTHROPIC_BASE_URL` pointing at a local Claude Code Router, which sends background tasks to a cheaper model and long-context tasks to a long-context model, using keys read from the developer's environment.

## Anti-patterns

- Provider master keys copied into every agent's environment.
- A gateway on the default master key, open on the network.
- Silently swapping an agent to an unevaluated model "because it is cheaper".
- Routing confidential data to a provider not approved for it.

## Checklist

- [ ] Gateway type fits scope (central vs local)
- [ ] Provider keys only in the gateway; virtual keys per agent with budgets
- [ ] Admin access protected; gateway pinned, reviewed, patched
- [ ] Data-to-provider rules enforced; substitute models evaluated
- [ ] Fallbacks evaluated; usage and traces logged; content redacted

## References

- [LiteLLM AI Gateway](https://docs.litellm.ai/docs/simple_proxy/)
- [Claude Code Router](https://github.com/musistudio/claude-code-router)
