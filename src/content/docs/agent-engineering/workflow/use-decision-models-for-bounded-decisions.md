---
title: Use decision models for repeated, bounded decisions in agent workflows
description: Separate interpretation from decision. Put policy in a deterministic, versioned decision model (decision tables such as DMN or JDM, or policy code); use a typed judgment model (such as TypeSafe's Jev) or an LLM only to turn unstructured input into the facts the policy needs; calibrate thresholds to the cost of each error; fail closed; record which rule decided; and cascade from cheapest to most capable.
id: BP-0064
domain: D.AGT.WF
type: pattern
roles: [planner, orchestrator, implementer]
stage: [plan, build, operate]
status: draft
version: 1.0.0
updated: 2026-11-24
reviewed: 2026-11-24
review_by: 2027-05-24
related: [BP-0049, BP-0047, BP-0041, BP-0040, BP-0050, BP-0006, BP-0062, BP-0059]
sources:
  - { title: OMG — Decision Model and Notation (DMN), url: https://www.omg.org/dmn/ }
  - { title: GoRules ZEN Engine (JSON Decision Model), url: https://github.com/gorules/zen }
  - { title: TypeSafe docs — Jev, url: https://docs.typesafe.ai/ }
  - { title: 'Dataiku — Jev inside a Dataiku agent (quality, latency and cost vs LLM agents)', url: https://www.dataiku.com/tech-blog/jev-inside-a-dataiku-agent }
  - { title: 'InfoQ — Decision Models in Agentic Architectures (Alex Porcelli)', url: https://www.infoq.com/presentations/decision-models-agentic-ai }
---

Agents make the same small decisions thousands of times: which team gets this ticket, does this tool call need approval, which model should handle this step, is this output good enough. Asking a generative model to decide each one in prose is slow, costly, hard to audit and slightly different every time. A decision model makes the decision explicit, testable and cheap.

There are three kinds of component. Most good designs use more than one.

| Component | What it is | Use it for | Cost and speed |
| --- | --- | --- | --- |
| **Deterministic decision model** | Decision tables and rules: DMN (an OMG standard), GoRules JDM, or policy code | Anything stated as policy: thresholds, eligibility, approvals, routing rules, budgets | Effectively free per decision; microseconds to milliseconds; same answer every time |
| **Typed judgment model** | A model that answers typed questions about unstructured input with probabilities, such as TypeSafe's Jev (Choice, Score, yes/no "Noul") | Turning text, JSON or images into the bounded facts a policy needs, at volume | Low per decision; sub-second |
| **Generative LLM** | Open-ended reasoning and writing | Exceptions, ambiguous cases, plans, explanations, anything not bounded in advance | Highest; seconds |

## Rules

### Separate interpretation from decision

1. **MUST** keep the decision in a deterministic, versioned decision model, and use models only to produce its inputs. A model's output is evidence for a decision, not the decision ([BP-0062](/agent-engineering/tool-use/scope-sub-agent-tools-and-mcp/)).
2. **MUST** express policy as decision tables or policy code with an explicit hit policy (for example first match wins), an ID on every rule, an owner, and a version. Business owners can review a table; they cannot review a prompt.
3. **MUST** test decision models like code: table-driven tests for every rule, the boundaries and the fall-through case.

### Use models where judgment is needed

4. **SHOULD** use a typed judgment model when the input is unstructured, the question is bounded (pick from known options, rate on a rubric, yes or no) and the volume is high. Keep each question atomic; combine answers in the decision model, not in the question.
5. **SHOULD** use a generative LLM for what cannot be bounded in advance, and for the borderline cases the cheaper layers hand on. Do not use an LLM as a classifier where rules or a typed model meet the bar.
6. **MUST** pin model versions and re-evaluate after any change ([BP-0050](/operations/evaluation/detect-model-drift/)).

### Set thresholds by the cost of being wrong

7. **MUST** calibrate thresholds on your own labelled cases, separately for each direction of error. Confidence describes the answer distribution, not a guarantee for one answer. Set the threshold so the expensive mistake (letting a case through that needed a person) is rare, and send the band between "confident yes" and "confident no" to a person or a more capable model.
8. **MUST** fail closed: a timeout, an error, a missing field or an unknown option leads to review, never to the permissive path.

### Record and measure

9. **MUST** record each decision with its inputs (or a reference), model versions and probabilities, the policy version and the rule ID that matched ([BP-0040](/operations/observability/keep-an-audit-trail/)).
10. **SHOULD** cascade from cheapest to most capable: rules first, then the typed model, then an LLM for the borderline remainder, then a person. Measure quality, latency and cost per 1,000 decisions at each layer before and after ([BP-0041](/operations/cost-performance/budget-and-control-agent-cost/), [BP-0006](/operations/evaluation/evaluate-agent-output/)).

## Where they fit in agent workflows

| Point in the workflow | Typical decision | Layer |
| --- | --- | --- |
| Intake | Route request to team, specialist agent or queue | Typed model → decision table |
| Before a tool call | Allow, require approval, deny | Decision table (policy) with typed risk signals |
| Model routing | Which model and effort for this step | Decision table ([BP-0049](/agent-engineering/workflow/match-model-and-effort-to-the-role/), [BP-0047](/operations/model-gateways-routing/route-by-time-of-day-pricing/)) |
| Gates between phases | Is the output complete enough to continue? | Typed model scoring plus checks ([BP-0059](/agent-engineering/workflow/validate-with-proof-not-claims/)) |
| Evaluation | Rubric scores at volume | Typed model, spot-checked by people |
| Escalation | Does a person need to see this? | Decision table on model signals and amounts |

## Evidence on cost

Dataiku ran 200 labelled supplier requests through three agents. A Jev-based agent routed 79% as expected, against 85% and 87% for two LLM agents. It answered in about 0.3 s against 2–3 s, and cost $0.03 per 1,000 requests against $0.25 and $4.35. The gap that mattered was safety: Jev let 26% of the cases that needed human review through, against 6% for the LLMs, and most of its misses sat just under its threshold. That is the case for rule 7, and for keeping the routing policy in a separate block so a threshold or model can change without touching the rule.

## Examples

Policy in code, model output as input (Bun, TypeScript). The judgment could come from a typed model or an LLM; the decision does not change:

```ts
// author: Stephen Eaton
// route.ts — the decision lives here, in versioned code; the model only supplies judgments.
type Choice = { choice: string; confidence: number };
type Judgment = { team: Choice; needs_human?: number /* Noul: P(yes) */ } | { error: string };
type Decision = { action: 'assign' | 'review'; team?: string; rule: string; policy: string };

const POLICY = 'ticket-routing@1.2.0';
const T = { confident: 0.7, humanYes: 0.5 }; // tuned on labelled data, see eval set

// Decision table, first match wins. Each row has an ID for the audit trail.
export function decide(j: Judgment, amountAud = 0): Decision {
  if ('error' in j) return { action: 'review', rule: 'R0-model-failed', policy: POLICY };            // fail closed
  if ((j.needs_human ?? 0) >= T.humanYes) return { action: 'review', rule: 'R1-model-flagged', policy: POLICY };
  if (amountAud > 5000) return { action: 'review', rule: 'R2-amount-over-limit', policy: POLICY };      // pure rule, no model
  if (j.team.confidence < T.confident) return { action: 'review', rule: 'R3-low-confidence', policy: POLICY };
  return { action: 'assign', team: j.team.choice, rule: 'R4-confident-assign', policy: POLICY };
}
```

The same policy as a decision table people can review:

| Rule | Model failed | P(needs human) | Amount (AUD) | Team confidence | Decision |
| --- | --- | --- | --- | --- | --- |
| R0 | yes | – | – | – | review |
| R1 | no | ≥ 0.5 | – | – | review |
| R2 | no | < 0.5 | > 5,000 | – | review |
| R3 | no | < 0.5 | ≤ 5,000 | < 0.70 | review |
| R4 | no | < 0.5 | ≤ 5,000 | ≥ 0.70 | assign to team |

Hit policy: first match. Tested by one case per row plus each boundary.

## Anti-patterns

- An LLM prompt that "decides" refunds, approvals or access, with the policy buried in prose.
- Policy thresholds hard-coded inside prompts or scattered through agent code.
- One threshold for both directions of error.
- Timeouts or unparseable answers treated as "allow".
- No record of which rule fired, so nobody can explain a decision.
- Swapping in a cheaper model without measuring the dangerous misses.

## Checklist

- [ ] Decisions in versioned decision tables or policy code, rule IDs, owner, hit policy
- [ ] Models produce inputs only; questions atomic; versions pinned
- [ ] Thresholds calibrated per error direction on labelled data; uncertain band to people
- [ ] Fail closed on errors and unknowns
- [ ] Decision record: inputs, model versions, probabilities, policy version, rule ID
- [ ] Cascade measured for quality, latency and cost per 1,000 decisions

## References

- [OMG — Decision Model and Notation](https://www.omg.org/dmn/)
- [GoRules ZEN Engine (JDM)](https://github.com/gorules/zen)
- [TypeSafe — Jev documentation](https://docs.typesafe.ai/)
- [Dataiku — Jev inside a Dataiku agent](https://www.dataiku.com/tech-blog/jev-inside-a-dataiku-agent)
- [InfoQ — Decision Models in Agentic Architectures](https://www.infoq.com/presentations/decision-models-agentic-ai)
