---
title: Apply AI and agents across the six NIST CSF functions
description: Use AI and agents in each NIST CSF 2.0 function — Govern, Identify, Protect, Detect, Respond, Recover — with autonomy set by the consequence and reversibility of each action, not by the function; prove each use against a human baseline before widening it, record evidence for every verdict, treat all telemetry as hostile input, and keep a person on anything disruptive, irreversible or in OT.
id: BP-0080
domain: D.SEC.CYD
type: guideline
roles: [planner, orchestrator, reviewer]
stage: [plan, build, operate]
status: draft
version: 1.0.1
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-02-27
related: [BP-0077, BP-0069, BP-0064, BP-0005, BP-0062, BP-0063, BP-0040, BP-0070, BP-0060, BP-0052, BP-0050, BP-0078]
sources:
  - title: "NIST — CSF 2.0 released (six functions)"
    url: https://www.nist.gov/news-events/news/2024/02/nist-releases-version-20-landmark-cybersecurity-framework
    note: Establishes the six-function CSF 2.0 structure, including the new Govern function that frames this practice's per-function table
  - title: "NIST SP 1299 — CSF 2.0 Resource and Overview Guide"
    url: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.1299.pdf
    note: Supplies the category-level identifiers such as DE.AE and RS.AN that the inventory rule requires for each AI use
  - title: "NIST IR 8596 (preliminary draft) — Cyber AI Profile"
    url: https://csrc.nist.gov/pubs/ir/8596/iprd
    note: Defines the three Cyber AI Profile focus areas, and this practice addresses the second, using AI for cyber defence
  - title: "NIST — Preliminary draft Cyber AI Profile (focus areas Secure, Defend, Thwart)"
    url: https://www.nist.gov/node/1901136
    note: Lists the draft profile's three focus areas and confirms preliminary status, so this practice covers only the defence focus area
  - title: "Vectra — Agentic SOC autonomy levels and adoption survey"
    url: https://www.vectra.ai/topics/agentic-soc
    note: Source of the survey finding that 57 percent still require human review of every verdict
---
NIST CSF 2.0 organises security work into six functions: Govern, Identify, Protect, Detect, Respond and Recover. NIST's draft Cyber AI Profile adds three focus areas on top: securing AI systems, using AI for cyber defence, and thwarting AI-enabled attacks. This practice covers the second, using AI and agents to do the work in each function. Securing the agents themselves is [BP-0077](/security-safety/ai-security-frameworks-threat-modelling/map-agent-risks-to-ai-security-frameworks/) and the other security practices.

## Rules

### Plan and govern the use

1. **MUST** keep an inventory of AI uses in security work: the CSF function and category each one supports (for example DE.AE, RS.AN), the data it reads, the model and version, its autonomy level, and an owner. A use that is not in the inventory is not approved.
2. **MUST** set autonomy per action by consequence and reversibility, not per function. Reading, enriching, summarising and drafting can run unattended; reversible actions with a small blast radius can run with an audit record; disruptive or irreversible actions (isolating a host, disabling an account, blocking an address range, changing a firewall rule, deleting data) need a person's approval ([BP-0069](/agent-engineering/workflow/design-human-approvals-people-read/)); anything touching OT is people-only ([BP-0070](/security-safety/ot-industrial-systems/keep-agents-out-of-the-control-path/)).
3. **MUST** enforce that policy in code the agent cannot change: a versioned action gate with rule IDs, a confidence floor, and fail-closed handling of unknown actions and errors ([BP-0064](/agent-engineering/workflow/use-decision-models-for-bounded-decisions/)). The agent proposes; the gate decides.

### Prove it before widening it

4. **MUST** measure each use against a human baseline on your own labelled history before raising its autonomy: agreement with analysts, and above all the miss rate on real incidents, which matters more than the false-positive rate. Re-measure after any model, prompt or tool change ([BP-0065](/operations/evaluation/benchmark-models-on-your-own-tasks/), [BP-0050](/operations/evaluation/detect-model-drift/)).
5. **MUST** sample what the agent closes or suppresses, not only what it escalates. Auto-closed alerts are where misses hide; a person reviews a fixed share of them, and the share rises when the miss rate does.
6. **MUST** record evidence for every verdict and action in the case record: inputs or references, the queries and tool calls made, model version, the gate rule that applied and who approved ([BP-0040](/operations/observability/keep-an-audit-trail/)). A verdict without evidence is treated as no verdict.

### Assume the input is hostile

7. **MUST** treat everything a security agent reads as attacker-controlled: email bodies, log lines, file names, user agents, ticket text and threat reports can carry instructions ([BP-0005](/security-safety/prompt-injection-untrusted-input/treat-observed-content-as-data/)). Scope each agent's tools to its task ([BP-0062](/agent-engineering/tool-use/scope-sub-agent-tools-and-mcp/)) and broker its credentials through a vault with short-lived, narrow tokens ([BP-0063](/security-safety/least-privilege-secrets/broker-agent-credentials-through-a-vault/)).
8. **MUST** check facts an agent asserts before acting on them: CVE IDs, indicator reputations, control references and policy citations are looked up in the source, not taken from the model ([BP-0052](/agent-engineering/workflow/prevent-and-catch-hallucinations/)).

### Keep people and the process able to run without it

9. **MUST** keep every process runnable without the AI: documented manual steps, and an outage of the model or agent platform treated as an incident in the Recover plan.
10. **SHOULD** keep analysts in practice: rotate them through work the agent normally does, and give them the edge cases, so skills exist when the agent is wrong or unavailable.

## Function by function

| Function | Where AI helps | Autonomy ceiling | Watch for |
| --- | --- | --- | --- |
| **Govern** (GV) | Drafting policies and standards, mapping controls to frameworks, keeping the risk register current, triaging supplier security questionnaires | Draft only; a person approves policy and risk acceptance | Invented control IDs and citations; policy that reads well but is not what you do |
| **Identify** (ID) | Reconciling asset inventories across sources, prioritising vulnerabilities by exploitation and exposure, threat-modelling assistance, attack-surface review | Recommend; may open tickets | Wrong asset context, so a critical system is ranked low; stale vulnerability data |
| **Protect** (PR) | Reviewing configuration drift and infrastructure code, security review of pull requests, preparing access reviews, patch planning, awareness content | Changes go as a branch and pull request a person merges ([BP-0078](/software-engineering/version-control-review/agents-never-push-to-main/)); access removals need approval | Fixes that break service; an agent that can change the controls that constrain it |
| **Detect** (DE) | Alert triage and enrichment, drafting and tuning detection rules, hunting queries, summarising logs | Close only defined low-severity alert classes above the confidence floor, with sampling; new or changed detections ship through a pull request with test data | Silent misses in auto-closed alerts; detections tuned until they never fire |
| **Respond** (RS) | Building incident timelines, collecting evidence, proposing containment, drafting stakeholder and regulator communications | Reversible, low-impact containment (quarantine an email, revoke sessions) with an audit record; host isolation, account disablement and network blocks need approval | Chain of custody for evidence; containment triggered by injected text in an alert |
| **Recover** (RC) | Verifying backups and restores, assisting runbook execution, drafting post-incident reports, turning lessons into detections and controls | A person decides restore order and the return to service; the agent verifies and reports ([BP-0060](/operations/backup-recovery/back-up-and-recover-agent-systems/)) | Restoring from a compromised backup; reports that omit what went wrong |

Teams running AI in security operations mostly keep these ceilings low today. In one 2026 survey of 250 security leaders and practitioners, 57% still required human review of every verdict, and only 30% let it carry out even low-risk actions on its own.

## When to apply

When planning, buying or building AI and agent capabilities for security work (an AI SOC, triage agents, vulnerability prioritisation, policy drafting), when reviewing an existing deployment, and before widening any agent's autonomy.

## Examples

Action gate (Bun, TypeScript). The agent proposes an action and supplies its confidence; the gate, versioned and tested, decides:

```ts
// author: Stephen Eaton
// action-gate.ts — decide whether a security agent may run an action, needs a person's approval, or is denied.
// The policy is code, versioned and tested; the agent only proposes actions and supplies its confidence.
export type Tier = 'standard' | 'crown_jewel' | 'ot';
export type Proposal = { action: string; asset_tier: Tier; confidence?: number };
export type Gate = { decision: 'run' | 'approve' | 'deny'; rule: string; sample?: boolean; policy: string };

const POLICY = 'secops-autonomy@1.0.0';
const READ_ONLY = new Set(['enrich_alert', 'query_logs', 'lookup_ioc', 'collect_evidence', 'draft_report']);
const REVERSIBLE = new Set(['quarantine_email', 'revoke_sessions', 'open_ticket']); // undone in one step, small blast radius
const DISRUPTIVE = new Set(['isolate_host', 'disable_account', 'block_ip_range', 'change_firewall_rule']);
const CONFIDENCE_FLOOR = 0.9; // tuned on labelled history; below it a person decides
const SAMPLE_RATE = 0.05; // share of auto-closed alerts a person reviews

export function gate(p: Proposal, random = Math.random): Gate {
  const g = (decision: Gate['decision'], rule: string, extra: Partial<Gate> = {}): Gate => ({ decision, rule, policy: POLICY, ...extra });
  if (p.asset_tier === 'ot') return g('deny', 'R0-ot-out-of-scope'); // OT: people only (BP-0070)
  if (READ_ONLY.has(p.action)) return g('run', 'R1-read-only');
  if (p.action === 'close_alert')
    return (p.confidence ?? 0) >= CONFIDENCE_FLOOR ? g('run', 'R2-close-confident', { sample: random() < SAMPLE_RATE }) : g('approve', 'R3-close-uncertain');
  if (p.asset_tier === 'crown_jewel' && (REVERSIBLE.has(p.action) || DISRUPTIVE.has(p.action))) return g('approve', 'R4-crown-jewel');
  if (REVERSIBLE.has(p.action)) return g('run', 'R5-reversible');
  if (DISRUPTIVE.has(p.action)) return g('approve', 'R6-disruptive');
  return g('deny', 'R7-unknown-action'); // fail closed
}
```

Tested with Bun 1.4 and eight unit tests:
- read-only enrichment runs;
- quarantining an email runs under rule R5 with an audit record;
- isolating a host needs approval, and so does any action on a crown-jewel asset;
- anything on an OT asset is denied, and so is an unknown action;
- a close below the 0.9 confidence floor goes to a person;
- a confident close runs, and is flagged for human review at the configured 5% rate.

Inventory entry for one use (kept with the security programme's records):

```yaml
- use: phishing-triage
  csf: [DE.AE, RS.AN]
  reads: [user-reported emails, mail gateway logs]
  model: pinned model and version
  autonomy: close known-benign reports above 0.9 confidence (sampled 5%); quarantine on confirmed phish; account actions need approval
  baseline: 2026-10 labelled set, 1,200 reports; agreement and missed-phish rate recorded in the evaluation log
  owner: security-operations
```

## Anti-patterns

- Giving an agent "Respond" or "Protect" rights as a block, instead of deciding per action.
- Raising autonomy because vendor figures look good, without measuring misses on your own history.
- Reviewing only escalations, so nobody sees what the agent closed.
- An agent that can edit the gate, the detections or the logs that oversee it.
- Acting on a CVE, indicator or policy reference the model produced without looking it up.
- No manual path, so a model outage stops triage.

## Checklist

- [ ] Inventory of AI uses: CSF function and category, data, model, autonomy, owner
- [ ] Autonomy set per action by consequence and reversibility; OT people-only
- [ ] Action gate in versioned code with rule IDs, confidence floor and fail-closed default
- [ ] Human baseline and miss rate measured before widening autonomy; re-measured on change
- [ ] Auto-closed work sampled; evidence recorded for every verdict and action
- [ ] Telemetry treated as hostile; tools scoped; credentials short-lived
- [ ] Manual path documented; AI outage in the Recover plan; analysts kept in practice
