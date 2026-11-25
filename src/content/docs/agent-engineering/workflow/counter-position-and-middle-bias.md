---
title: Counter position and middle-option bias in model decisions
description: Models choosing among options, rating on scales or comparing candidates are swayed by where an option sits and how it is labelled — first, last, middle, or "Option A". Use meaningful option names, described scale levels and no neutral midpoint unless it is a real answer; shuffle and swap order and only accept answers that survive; measure the bias with placebo runs; calibrate scores; and keep key context out of the middle of long prompts.
id: BP-0066
domain: D.AGT.WF
type: guideline
roles: [planner, implementer, reviewer]
stage: [build, verify]
status: draft
version: 1.0.0
updated: 2026-11-24
reviewed: 2026-11-24
review_by: 2027-05-24
related: [BP-0064, BP-0065, BP-0006, BP-0028, BP-0052, BP-0040]
sources:
  - { title: 'Zheng et al. — Large Language Models Are Not Robust Multiple Choice Selectors (ICLR 2024)', url: https://arxiv.org/abs/2309.03882 }
  - { title: 'Fragile Preferences: A Deep Dive into Order Effects in Large Language Models (2025)', url: https://arxiv.org/abs/2506.14092 }
  - { title: 'Prompt Perturbations Reveal Human-Like Biases in LLM survey responses (2025)', url: https://arxiv.org/abs/2507.07188 }
  - { title: 'Auditing Multimodal LLM Raters: Central Tendency Bias in Clinical Ordinal Scoring (2026)', url: https://arxiv.org/abs/2605.16386 }
  - { title: 'Liu et al. — Lost in the Middle: How Language Models Use Long Contexts', url: https://arxiv.org/abs/2307.03172 }
---

When a model picks from options, the answer depends partly on *where* and *how* the options are shown, not only on what they say. The effects are documented:

| Bias | What happens | Evidence |
| --- | --- | --- |
| Label (selection) bias | Prefers certain option IDs such as "A" | Across 20 models, mainly from prior weight on ID tokens; one model chose A/B/C/D 34.6% / 27.3% / 22.3% / 15.8% of the time |
| Primacy / recency | Favours the first or last option | Order effects can lead models to pick strictly inferior options, and were stronger than gender bias in resume comparisons; survey-style questions showed recency bias up to 20× |
| Centrality (middle) | Favours the middle of three | A consistent preference for the middle option in triplewise comparisons |
| Central tendency on scales | Ratings bunch towards the middle; extremes avoided | Reported for LLM judges; a middle or "don't know" option can trigger it |
| Lost in the middle (context) | Information in the middle of a long prompt is used less than at the start or end | Long-context retrieval studies |

None of this means models cannot decide. It means a decision that matters must be designed so position cannot decide it.

## Rules

### Design the question

1. **MUST** identify options by meaningful names (`billing`, `technical`), not letters or numbers, and read the answer back by name.
2. **MUST** describe every level of a rating scale in words. Use an even number of levels or a binary question unless a neutral answer is genuinely valid; if "unsure" is valid, make it an explicit option that routes to review, not a middle score.
3. **SHOULD** prefer atomic yes/no or absolute checks against criteria over ranking many candidates at once; rank by combining independent scores in code ([BP-0064](/agent-engineering/workflow/use-decision-models-for-bounded-decisions/)).

### Counterbalance

4. **MUST** for pairwise comparisons (including model-as-judge), ask in both orders and accept only a consistent answer; an answer that flips with the order is a tie or goes to review.
5. **SHOULD** for choices among several options that matter, ask in several shuffled orders and aggregate; low agreement across orders means content did not decide, so escalate.
6. **MUST** randomise option order per call by default, and never let an upstream ranking (retrieval score, submission time, alphabetical order) fix the order of candidates in decisions about people.

### Measure and calibrate

7. **SHOULD** measure the bias with placebo runs: identical or content-free options in shuffled positions. Any position that wins more than its share is the bias you must design around.
8. **SHOULD** monitor production: how often each position wins, and the spread of scores (share of extremes, standard deviation) against human labels. Scores compressed towards the middle need recalibrating or re-anchoring before thresholds are set.
9. **MUST** recheck after any model, prompt or option-list change ([BP-0065](/operations/evaluation/benchmark-models-on-your-own-tasks/)).

### Long context

10. **SHOULD** place the task, constraints and critical facts at the start and end of long prompts, retrieve fewer and more relevant chunks rather than many, and restate key constraints next to the question ([BP-0028](/agent-engineering/context-memory/retrieve-context-well/)).

### High-stakes decisions

11. **MUST** for decisions about people (hiring, eligibility, access) apply rules 4–6 always, record the orders used and the agreement in the decision record ([BP-0040](/operations/observability/keep-an-audit-trail/)), and audit outcomes by position.

## When to apply

Routing, triage, ranking candidates, model-as-judge evaluations, rubric scoring, and any agent step that chooses from a list.

## Examples

Order swapping and shuffled voting (Bun, TypeScript). The judge returns the chosen option's *text*, so labels cannot leak in:

```ts
// author: Stephen Eaton
// debias.ts — counter position bias: ask in several orders, map answers back to option names, aggregate.
export type Judge = (options: string[]) => Promise<string>; // returns the chosen option *text*, not a letter

const shuffle = <T>(xs: T[], rnd = Math.random) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// Pairwise: ask A-vs-B and B-vs-A; only a consistent answer counts.
export async function comparePair(judge: Judge, a: string, b: string): Promise<string | 'tie'> {
  const [first, second] = await Promise.all([judge([a, b]), judge([b, a])]);
  return first === second ? first : 'tie'; // disagreement = order decided it → treat as tie / send to review
}

// Choice among n: ask in k random orders, majority vote, report agreement.
export async function chooseBalanced(judge: Judge, options: string[], k = 5, rnd = Math.random) {
  const votes = new Map<string, number>();
  for (let i = 0; i < k; i++) {
    const pick = await judge(shuffle(options, rnd));
    votes.set(pick, (votes.get(pick) ?? 0) + 1);
  }
  const [winner, n] = [...votes].sort((x, y) => y[1] - x[1])[0];
  return { winner, agreement: n / k }; // low agreement → the content did not decide; escalate
}
```

Tested with a fake judge that always picks the middle (pure position bias): pairwise swapping returns `tie`, and shuffled voting shows low agreement. A judge with a real preference wins with full agreement either way.

Rating scale, before and after:

```text
Before: "Rate severity 1–5."                       → bunches at 3
After:  "Which best describes the impact?
         none_visible: no user-visible effect
         degraded: works with a workaround
         blocked: a user cannot complete the task
         outage: many users cannot use the service
         unsure: cannot tell from the information given (→ review)"
```

## Anti-patterns

- "Answer A, B, C or D" for a decision that matters.
- Five-point scales with an undefined "3".
- Model-as-judge comparisons run in one order only.
- Candidates always listed in retrieval or submission order.
- The key constraint buried in the middle of a long prompt.

## Checklist

- [ ] Options named, scale levels described, no accidental neutral midpoint
- [ ] Pairwise comparisons run in both orders; inconsistent = tie or review
- [ ] Shuffled order by default; multi-order voting for decisions that matter
- [ ] Placebo runs and production position stats; score spread calibrated against people
- [ ] Key context at the start and end of long prompts
- [ ] Decisions about people counterbalanced, recorded and audited by position

## References

- [Large Language Models Are Not Robust Multiple Choice Selectors](https://arxiv.org/abs/2309.03882)
- [Fragile Preferences: Order Effects in LLMs](https://arxiv.org/abs/2506.14092)
- [Prompt Perturbations Reveal Human-Like Biases](https://arxiv.org/abs/2507.07188)
- [Central Tendency Bias in LLM Raters](https://arxiv.org/abs/2605.16386)
- [Lost in the Middle](https://arxiv.org/abs/2307.03172)
