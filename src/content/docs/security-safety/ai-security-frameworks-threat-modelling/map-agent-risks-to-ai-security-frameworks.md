---
title: Map agent risks to the AI security frameworks (ATLAS, NIST AI RMF, OWASP, CoSAI)
description: Use the main AI security frameworks for what each is good at — NIST AI RMF as the governance spine, the OWASP LLM and Agentic Top 10s to find risks, MITRE ATLAS to name attacker techniques, and the CoSAI Risk Map and crosswalks to reach controls — then keep one versioned risk register per agent system that ties every risk to edition-qualified framework IDs, an implemented control, evidence, an owner and review dates.
id: BP-0077
domain: D.SEC.FRM
type: guideline
roles: [orchestrator, planner, reviewer]
stage: [plan, build, verify, operate]
status: draft
version: 1.1.0
updated: 2026-11-25
reviewed: 2026-11-25
review_by: 2027-02-25
related: [BP-0005, BP-0032, BP-0044, BP-0053, BP-0061, BP-0069, BP-0070, BP-0075, BP-0040, BP-0051]
sources:
  - { title: NIST — AI Risk Management Framework (AI RMF 1.0, Generative AI Profile NIST AI 600-1), url: https://www.nist.gov/itl/ai-risk-management-framework }
  - { title: NIST IR 8596 (preliminary draft) — Cybersecurity Framework Profile for Artificial Intelligence (Cyber AI Profile), url: https://csrc.nist.gov/pubs/ir/8596/iprd }
  - { title: OWASP GenAI Security Project — Top 10 for LLM Applications 2026, url: https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/ }
  - { title: OWASP GenAI Security Project — Top 10 for Agentic Applications for 2026, url: https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications/ }
  - { title: OWASP GenAI Security Project — GenAI Security Industry Framework Crosswalk, url: https://genai.owasp.org/resource/genai-security-industry-framework-crosswalk/ }
  - { title: MITRE ATLAS, url: https://atlas.mitre.org/ }
  - { title: MITRE ATLAS data releases (GitHub), url: https://github.com/mitre-atlas/atlas-data/releases }
  - { title: Coalition for Secure AI (CoSAI) — Risk Map and tooling (GitHub), url: https://github.com/cosai-oasis/secure-ai-tooling }
  - { title: Coalition for Secure AI — mission, scope and workstreams, url: https://www.coalitionforsecureai.org/about/ }
---

No single framework covers agent security. They answer different questions, and they overlap. Use each one for the question it answers well, map them into one register per agent system, and tie every risk to a control you can prove. Coverage of a framework is not the goal; risks with working controls are.

| Framework | Question it answers | Use it for | Status (checked 2026-11-25) |
| --- | --- | --- | --- |
| **NIST AI RMF 1.0** (AI 100-1) and **Generative AI Profile** (AI 600-1) | How do we govern AI risk as an organisation? | The programme spine: GOVERN, MAP, MEASURE, MANAGE; inventory, roles, risk tolerance | Voluntary. AI RMF 1.0 is being revised under the US AI Action Plan; the GenAI Profile (July 2024) names 12 GenAI risks |
| **NIST Cyber AI Profile** (IR 8596) | How does AI fit our CSF 2.0 programme? | Placing AI into an existing CSF-based security programme | Preliminary draft (December 2025); SP 800-53 overlays for AI (COSAiS) in development |
| **OWASP Top 10 for LLM Applications 2026** | What goes wrong when a model is a component in an app? | Finding model-level risks during design and review | Released August 2026; entries reordered from 2025 |
| **OWASP Top 10 for Agentic Applications 2026** (ASI01–ASI10) | What goes wrong when the model acts with tools, memory, identity and autonomy? | Finding agent-level risks; use with the LLM list for any agent with tools | Released December 2025 |
| **MITRE ATLAS** | How do adversaries actually attack AI systems? | Naming attack techniques (AML.T IDs) in threat models, red-team plans, detections and incident records | Monthly releases; many techniques now tagged for agentic AI |
| **CoSAI Risk Map** (CoSAI-RM) and CoSAI papers | Which controls address which risks, and who owns them? | Risk-to-control mapping by persona, with mappings to ATLAS and NIST AI RMF; incident response, model signing, agentic identity and MCP guidance | OASIS Open Project; Risk Map maintained as YAML on GitHub |

## Rules

### Choose a spine, then map

1. **MUST** pick one governance spine and map everything else into it. For most organisations that is NIST AI RMF (or ISO/IEC 42001 if you are certifying); in an existing CSF 2.0 programme, add the Cyber AI Profile. Do not run five parallel checklists.
2. **MUST** keep an inventory of agent systems and, for each, its components: models, tools and MCP servers, memory and retrieval stores, identities and credentials, data, channels to other agents, and the people who approve its actions.

### Threat-model each agent system

3. **MUST** threat-model each agent system before release and on significant change: walk ASI01–ASI10 and LLM01–LLM10 against its components, describe the attack paths that apply, and name the ATLAS techniques for each path.
4. **MUST** record the result in a versioned risk register kept with the system's code. Each risk carries its framework references, the control that addresses it, evidence the control works (a test, a configuration check, a log query), an owner, the date it was last reviewed and the date the next review is due. A risk without a control is an accepted risk with a named owner and an expiry.
5. **MUST** write framework IDs with their edition or release. IDs are renumbered between editions: LLM06 is Excessive Agency in the 2025 list and Unbounded Consumption in the 2026 list. Record the ATLAS release you mapped against.
6. **MUST** map risks to controls you have implemented, not to framework clauses. "Addresses ASI03" is a claim; "token is scoped to one repository and expires in 15 minutes, checked by test X" is a control.

### Use the frameworks well

7. **SHOULD** start from published crosswalks (the OWASP GenAI Framework Crosswalk, the mappings in the OWASP Top 10 documents, the CoSAI Risk Map's ATLAS and NIST mappings) rather than mapping by hand, and check them: they are best-effort and some mappings are coarse.
8. **SHOULD** use ATLAS technique IDs in red-team plans, detection rules, audit records and incident reports, so results compare across systems and over time ([BP-0040](/operations/observability/keep-an-audit-trail/), [BP-0051](/operations/observability/observe-agent-workflows/)).
9. **SHOULD** use the CoSAI Risk Map's personas (for example model provider, application developer, platform operator) to decide who owns each control, especially where a vendor or platform owns part of the stack.
10. **SHOULD** apply sector guidance on top: for OT and critical infrastructure, start from operational continuity and safety ([BP-0070](/security-safety/ot-industrial-systems/keep-agents-out-of-the-control-path/)); NIST has a concept note for an AI RMF profile on critical infrastructure.

### Keep it current and honest

11. **MUST** re-review the register when a framework releases a new edition (ATLAS monthly, the OWASP lists roughly yearly, NIST on revision) and when the system changes; check it in CI so overdue or unversioned entries fail.
12. **MUST NOT** present framework coverage as assurance or compliance. The OWASP lists are awareness documents and NIST AI RMF is voluntary; "we cover the Top 10" says nothing about whether the controls work.

## Map the agentic risks to practices on this site

| OWASP Agentic 2026 | Start with |
| --- | --- |
| ASI01 Agent Goal Hijack | [BP-0005](/security-safety/prompt-injection-untrusted-input/treat-observed-content-as-data/), [BP-0069](/agent-engineering/workflow/design-human-approvals-people-read/) |
| ASI02 Tool Misuse and Exploitation | [BP-0062](/agent-engineering/tool-use/scope-sub-agent-tools-and-mcp/), [BP-0023](/agent-engineering/tool-use/use-mcp-servers-safely/), [BP-0021](/agent-engineering/tool-use/use-hooks-for-deterministic-control/) |
| ASI03 Identity and Privilege Abuse | [BP-0032](/security-safety/least-privilege-secrets/give-agents-least-privilege/), [BP-0063](/security-safety/least-privilege-secrets/broker-agent-credentials-through-a-vault/) |
| ASI04 Agentic Supply Chain Vulnerabilities | [BP-0044](/security-safety/supply-chain/vet-and-pin-agent-dependencies/), [BP-0075](/security-safety/supply-chain/keep-repositories-safe-for-agents/) |
| ASI05 Unexpected Code Execution | [BP-0032](/security-safety/least-privilege-secrets/give-agents-least-privilege/) (sandboxing), [BP-0021](/agent-engineering/tool-use/use-hooks-for-deterministic-control/) |
| ASI06 Memory and Context Poisoning | [BP-0029](/agent-engineering/context-memory/evaluate-and-secure-rag/), [BP-0005](/security-safety/prompt-injection-untrusted-input/treat-observed-content-as-data/) |
| ASI07 Insecure Inter-Agent Communication | [BP-0061](/multi-agent-systems/communication-protocols/choose-agent-communication-channels/) |
| ASI08 Cascading Failures | [BP-0053](/multi-agent-systems/coordination-handoff/prevent-error-amplification/) |
| ASI09 Human-Agent Trust Exploitation | [BP-0069](/agent-engineering/workflow/design-human-approvals-people-read/), [BP-0052](/agent-engineering/workflow/prevent-and-catch-hallucinations/) |
| ASI10 Rogue Agents | [BP-0051](/operations/observability/observe-agent-workflows/), [BP-0050](/operations/evaluation/detect-model-drift/), [BP-0040](/operations/observability/keep-an-audit-trail/) |

The LLM Top 10 2026, in order: LLM01 Prompt Injection, LLM02 Sensitive Information Disclosure, LLM03 Excessive Agency, LLM04 Supply Chain, LLM05 Data and Model Poisoning, LLM06 Unbounded Consumption, LLM07 Misinformation, LLM08 Hidden Context Exposure, LLM09 Vector and Embedding Weaknesses, LLM10 Improper Output Handling.

## When to apply

Before building or buying an agent system, at design review, before release, after an incident, when a framework publishes a new edition, and when an auditor, customer or regulator asks how you manage AI security risk.

## Examples

Risk register kept in the agent system's repository (`risk-register.yaml`):

```yaml
service: release-notes-agent
frameworks: { owasp-llm: "2026", owasp-agentic: "2026", mitre-atlas: "v2026.10", nist-ai-rmf: "1.0" }
risks:
  - id: R-01
    title: Instructions in a fetched issue hijack the agent's goal
    refs: [ASI01:2026, LLM01:2026, AML.T0051]
    control: Fetched content is passed as data, and tool calls outside the task need human approval
    practices: [BP-0005, BP-0069]
    evidence: tests/injection-fixtures.test.ts
    owner: platform-security
    last_reviewed: 2026-11-25
    next_review: 2027-02-25
  - id: R-02
    title: The agent's token can push to protected branches
    refs: [ASI03:2026, LLM03:2026]
    control: Short-lived token scoped to one repository, read-only on main
    practices: [BP-0032, BP-0063]
    evidence: ""
    owner: platform-security
    last_reviewed: 2026-07-01
    next_review: 2026-10-01
```

CI check (Bun) that fails on unversioned IDs, missing controls, evidence or owners, missing or future review dates, and overdue reviews:

```ts
// author: Stephen Eaton
// check-risk-register.ts — fail CI when an agent risk register is incomplete, unversioned or overdue.
// usage: bun check-risk-register.ts risk-register.yaml
type Risk = { id: string; title: string; refs: string[]; control: string; evidence: string; owner: string; last_reviewed: string; next_review: string };
type Register = { service: string; frameworks: Record<string, string>; risks: Risk[] };

export function check(r: Register, today = new Date().toISOString().slice(0, 10)): string[] {
  const errors: string[] = [];
  for (const k of ['owasp-llm', 'owasp-agentic', 'mitre-atlas'])
    if (!r.frameworks?.[k]) errors.push(`frameworks.${k}: record the edition or release you mapped against`);
  for (const x of r.risks ?? []) {
    const at = `${x.id}`;
    if (!x.refs?.length) errors.push(`${at}: no framework references`);
    for (const ref of x.refs ?? [])
      if (/^(LLM|ASI)\d\d$/.test(ref)) errors.push(`${at}: ${ref} has no edition (write ${ref}:2026); IDs are renumbered between editions`);
      else if (!/^(LLM|ASI)\d\d:\d{4}$|^AML\.T\d{4}(\.\d{3})?$/.test(String(ref))) errors.push(`${at}: unrecognised reference ${ref}`);
    for (const f of ['control', 'evidence', 'owner'] as const) if (!String(x[f] ?? '').trim()) errors.push(`${at}: missing ${f}`);
    const last = String(x.last_reviewed ?? ''), next = String(x.next_review ?? '');
    if (!last) errors.push(`${at}: missing last_reviewed`);
    else if (last > today) errors.push(`${at}: last_reviewed ${last} is in the future`);
    if (last && next && next <= last) errors.push(`${at}: next_review ${next} must be after last_reviewed ${last}`);
    if (!next || next < today) errors.push(`${at}: review overdue (${next})`);
  }
  return errors;
}

if (import.meta.main) {
  const reg = Bun.YAML.parse(await Bun.file(Bun.argv[2]).text()) as Register;
  const errors = check(reg);
  for (const e of errors) console.error(e);
  console.log(`${reg.risks?.length ?? 0} risk(s), ${errors.length} problem(s)`);
  process.exit(errors.length ? 1 : 0);
}
```

Output for the register above (exit code 1):

```text
R-02: missing evidence
R-02: review overdue (2026-10-01)
2 risk(s), 2 problem(s)
```

Tested with Bun 1.4: the register above fails on R-02 as shown, and writing `LLM03` without `:2026` fails with "has no edition", and a missing or future `last_reviewed` is reported.

## Anti-patterns

- A spreadsheet that ticks off all twenty Top 10 entries with "addressed" and no control or evidence.
- Framework IDs with no edition, so a 2025 mapping silently means something else against the 2026 list.
- Using only the LLM Top 10 for an agent that has tools, memory and credentials.
- A threat model written once for the launch review and never revisited.
- Red-team findings and incidents described in free text that cannot be compared or counted.
- Treating vendor claims of "OWASP coverage" as evidence about your system.

## Checklist

- [ ] One governance spine chosen; other frameworks mapped into it
- [ ] Inventory of agent systems and their components
- [ ] Threat model per system using ASI01–ASI10, LLM01–LLM10 and ATLAS techniques
- [ ] Versioned risk register in the repository: edition-qualified IDs, control, evidence, owner, last-reviewed and next-review dates
- [ ] Crosswalks used and checked; ATLAS IDs used in red-team, detection and incident records
- [ ] Register checked in CI; re-reviewed on new framework editions and system changes
- [ ] Nobody claims framework coverage as assurance
