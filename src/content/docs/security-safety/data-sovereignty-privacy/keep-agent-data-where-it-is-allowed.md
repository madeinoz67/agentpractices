---
title: Keep agent data where it is allowed to be, and personal data to a minimum
description: Map every place agent data goes (prompts, tool results, memory, indexes, logs, traces, backups, channels) and which jurisdiction holds it; decide per data class which providers and regions are allowed and enforce it in the gateway; send models only what they need, pseudonymised where possible; make deletion and access requests reach derived stores; disclose automated decisions; and plan for a provider becoming unavailable.
id: BP-0067
domain: D.SEC.DAT
type: guideline
roles: [orchestrator, planner, implementer]
stage: [plan, build, operate]
status: draft
version: 1.0.0
updated: 2026-11-24
reviewed: 2026-11-24
review_by: 2027-05-24
related: [BP-0046, BP-0033, BP-0012, BP-0031, BP-0039, BP-0040, BP-0060, BP-0061, BP-0064, BP-0049]
sources:
  - { title: OAIC — APP 8 Cross-border disclosure of personal information, url: https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-8-app-8-cross-border-disclosure-of-personal-information }
  - { title: OAIC — APP 1 (automated decision transparency from 10 December 2026), url: https://www.oaic.gov.au/privacy/australian-privacy-principles-guidelines/chapter-1-app-1-open-and-transparent-management-of-personal-information/ }
  - { title: GDPR — Chapter V (transfers to third countries), url: https://gdpr-info.eu/chapter-5/ }
  - { title: Claude Platform docs — Data residency, url: https://platform.claude.com/docs/en/manage-claude/data-residency }
  - { title: Anthropic — Fable and Mythos access (June 2026), url: https://www.anthropic.com/news/fable-mythos-access }
---

Agents move data further and faster than people do. A single run can send a customer record to a model provider in one country, write a summary to a memory store in another, push traces to an observability SaaS, index a document into a vector database, post a result into a chat channel, and copy all of it into backups. Sovereignty (which jurisdiction's law reaches the data) and privacy (what you may do with personal information) have to be designed in, not checked at the end.

This page is practice guidance, not legal advice; confirm obligations for your jurisdiction and sector.

## Rules

### Map it

1. **MUST** classify the data agents handle (for example public, internal, confidential, personal, sensitive personal, regulated, critical-infrastructure/OT) and map every place it goes: prompts and context, tool results, long-term memory and knowledge graphs, vector indexes, logs and traces, evaluation sets, chat channels, backups, and each provider and sub-processor behind them (model, gateway, observability, MCP servers).
2. **MUST** record for each store and provider: the processing and storage locations, the provider's legal jurisdiction, retention, and whether data is used for training.

### Decide and enforce

3. **MUST** decide per data class which providers, regions and deployment modes are allowed, and enforce it where traffic passes, not in instructions: gateway model allow-lists per data class, provider region controls, regional endpoints ([BP-0046](/operations/model-gateways-routing/route-model-traffic-through-a-gateway/)).
4. **SHOULD** use the provider's residency controls and check what they cover. Anthropic's API, for example, lets requests set `inference_geo` and lets workspaces restrict allowed geographies; on Amazon Bedrock and Google Cloud the inference region is set by the endpoint or inference profile instead. Check which models and regions are actually available before promising residency.
5. **SHOULD** self-host open-weight models, or use a provider region inside the required jurisdiction, for data that must not leave it ([BP-0049](/agent-engineering/workflow/match-model-and-effort-to-the-role/)).
6. **MUST** treat sending personal information to an overseas provider as a cross-border disclosure unless you can show otherwise, and meet the local rule for it. Under Australia's APP 8, giving personal information to an overseas contractor, including a cloud provider, is generally a disclosure, and the Australian entity is generally accountable for the recipient's handling of it (s 16C). The GDPR's Chapter V sets the equivalent conditions for transfers out of the EU.

### Minimise

7. **MUST** send models only the fields the task needs; pseudonymise or tokenise identifiers before the model call and re-identify in code afterwards where the model does not need the real values.
8. **MUST** keep personal data out of logs, traces, evaluation sets and prompts-as-examples unless needed, redacted by default ([BP-0039](/operations/observability/trace-agent-runs/)), and out of schema names, enum values and other configuration that may be cached or logged separately.
9. **MUST** set retention for every store, prefer zero- or short-retention arrangements with providers where available, and gate what enters long-term memory and knowledge graphs ([BP-0012](/agent-engineering/context-memory/manage-long-term-memory/), [BP-0031](/knowledge-modelling/knowledge-graphs/build-agent-knowledge-graphs/)).
10. **MUST NOT** post personal or restricted data to chat channels or third-party tools not approved for it ([BP-0061](/multi-agent-systems/communication-protocols/choose-agent-communication-channels/)).

### Honour rights and be transparent

11. **MUST** make access, correction and deletion requests reach every derived store: memory, knowledge graphs, vector indexes, caches, logs and backups (by expiry, if not immediately) ([BP-0060](/operations/backup-recovery/back-up-and-recover-agent-systems/)).
12. **MUST** disclose automated decisions where the law requires it. In Australia, from 10 December 2026, APP entities must include information in their privacy policy where a computer program uses personal information to make, or substantially assist, decisions that could significantly affect individuals. Keep the decision records that let you explain them ([BP-0064](/agent-engineering/workflow/use-decision-models-for-bounded-decisions/)).
13. **SHOULD** run a privacy impact assessment before deploying an agent that handles personal information, and repeat it when the model, provider, region or data flow changes.
14. **MUST** include agent leaks in incident response: an agent sending personal data to the wrong place is a potential data breach to assess under your notification scheme.

### Plan for sovereignty risk

15. **SHOULD** plan for a provider or model becoming unavailable for legal or policy reasons, not only outages: keep an evaluated fallback model and provider for each critical role. In June 2026, a US export-control directive led Anthropic to suspend access to two of its models for all customers until access was restored.

## When to apply

Any agent that touches personal, confidential or regulated data, or that runs across providers, regions or organisations.

## Examples

Data-class routing policy at the gateway:

```yaml
# author: Stephen Eaton
data_classes:
  public:        { providers: [any-approved], regions: [any] }
  internal:      { providers: [approved-list], regions: [approved-list], retention: provider-default }
  personal:      { providers: [approved-for-personal], regions: [inside-required-jurisdiction], retention: zero, pseudonymise: [name, email, phone] }
  sensitive:     { providers: [self-hosted], regions: [au-onprem] }   # never leaves the environment
  ot_critical:   { providers: [self-hosted], regions: [site], network: isolated }
deny_by_default: true
```

Pseudonymise before the model, re-identify after (Bun, TypeScript):

```ts
// author: Stephen Eaton
export function pseudonymise(text: string, fields: Record<string, string>) {
  const map = new Map<string, string>();
  let out = text, i = 0;
  for (const value of Object.values(fields)) {
    if (!value) continue;
    const token = `[[P${++i}]]`;
    map.set(token, value);
    out = out.split(value).join(token);
  }
  return { text: out, restore: (s: string) => [...map].reduce((acc, [t, v]) => acc.split(t).join(v), s) };
}
```

## Anti-patterns

- "We only use a US model" while traces go to a SaaS in a third country and backups to a fourth.
- Residency set on the model call but not on memory, indexes or logs.
- Full customer records sent for a task that needs one field.
- Deletion requests honoured in the database but not in the vector index or agent memory.
- An agent that materially informs significant decisions about people, with nothing in the privacy policy.
- A single provider for a critical role, with no tested fallback.

## Checklist

- [ ] Data classes defined; every store, provider and jurisdiction mapped
- [ ] Allowed providers and regions per class, enforced at the gateway
- [ ] Cross-border rules met (APP 8 / GDPR Chapter V or local equivalent)
- [ ] Fields minimised; identifiers pseudonymised; logs and traces redacted; retention set
- [ ] Rights requests reach memory, indexes, logs and backups
- [ ] Automated decisions disclosed where required; PIA done; breaches covered
- [ ] Fallback provider evaluated for critical roles

## References

- [OAIC — APP 8 guidelines](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-8-app-8-cross-border-disclosure-of-personal-information)
- [OAIC — APP 1 guidelines (automated decisions)](https://www.oaic.gov.au/privacy/australian-privacy-principles-guidelines/chapter-1-app-1-open-and-transparent-management-of-personal-information/)
- [GDPR Chapter V](https://gdpr-info.eu/chapter-5/)
- [Claude Platform — Data residency](https://platform.claude.com/docs/en/manage-claude/data-residency)
- [Anthropic — Fable and Mythos access](https://www.anthropic.com/news/fable-mythos-access)
