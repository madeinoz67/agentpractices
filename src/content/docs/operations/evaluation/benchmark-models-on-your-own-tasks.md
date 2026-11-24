---
title: Benchmark models on your own tasks for accuracy, speed, cost and output format
description: Use public leaderboards only to shortlist; choose models by running a private set of your own tasks several times each, measuring task success, schema and format validity, time to first token, end-to-end time and cost per successful task, with fair settings for every model; gate on must-haves, pick the cheapest model that passes, and record and re-run the decision.
id: BP-0065
domain: D.OPS.EVL
type: procedure
roles: [orchestrator, reviewer]
stage: [plan, verify, operate]
status: draft
version: 1.0.0
updated: 2026-11-24
related: [BP-0049, BP-0006, BP-0050, BP-0041, BP-0046, BP-0064, BP-0059]
sources:
  - { title: 'Alzahrani et al. — When Benchmarks are Targets: Revealing the Sensitivity of LLM Leaderboards', url: https://arxiv.org/abs/2402.01781 }
  - { title: Contamination Inflates Scores but Rarely Reorders LLM Leaderboards (2026), url: https://arxiv.org/abs/2609.02899 }
  - { title: Claude Platform docs — Structured outputs, url: https://platform.claude.com/docs/en/build-with-claude/structured-outputs }
  - { title: pstack (Cursor plugins) — benchmark-checklist skill, url: https://github.com/cursor/plugins/tree/main/pstack/skills/benchmark-checklist }
---

Public benchmarks tell you roughly where a model sits; they do not tell you whether it does *your* work, at *your* latency, in *your* format, for *your* budget. Leaderboard scores are sensitive to small changes in how questions are posed, and training-data contamination inflates absolute scores, although one 2026 study found it rarely changed the ranking. Use them to shortlist, then measure.

## Rules

### 1. Shortlist

1. **SHOULD** shortlist three to five candidates per role from provider guidance, public leaderboards and models you already run, including at least one cheaper tier than you expect to need. Exclude any model or provider not approved for the data ([BP-0046](/operations/model-gateways-routing/route-model-traffic-through-a-gateway/)).

### 2. Build the task set

2. **MUST** build a private benchmark set from your own work: typically 50–200 representative tasks per role, including edge cases and every past failure you have a record of. Keep it off the public web so it cannot leak into training data ([BP-0006](/operations/evaluation/evaluate-agent-output/)).
3. **MUST** give every task an automated check where possible (tests, schema validation, exact or set match), and a written rubric with a pinned judge model where not.

### 3. Run fairly

4. **MUST** give each model a fair setup: the same tools and task, prompts adapted to each provider's guidance, each model's recommended settings, and an effort or thinking sweep rather than one level ([BP-0049](/agent-engineering/workflow/match-model-and-effort-to-the-role/)).
5. **MUST** run each task several times per model (at least 3, and 5 or more when the result is close), interleaving models so time-of-day load and caching affect them equally. Run through the same gateway, region and network you will use in production.
6. **MUST** count errors, timeouts, refusals and truncations as failures, and confirm the work actually happened (the tool ran, the file was written) before scoring it ([BP-0059](/agent-engineering/workflow/validate-with-proof-not-claims/)).

### 4. Measure four things

7. **MUST** measure:

   | Dimension | Metrics |
   | --- | --- |
   | **Accuracy** | Task pass rate; rubric score; the rate of the dangerous error (for example a missed escalation), separately |
   | **Speed** | Time to first token; output tokens per second; end-to-end task time including tool calls and retries; p50 and p95 |
   | **Cost** | Cost per *successful* task, including retries, thinking tokens and cache effects |
   | **Output format** | Schema-valid rate; required fields present; enum and casing correct; length and structure rules for prose |

8. **SHOULD** measure format both with and without the provider's structured-output feature where one exists. Constrained decoding can guarantee schema-valid JSON, but still validate: refusals and output-length truncation can return output that does not match the schema, unsupported schema constraints may be dropped, enum casing can change, and the first use of a new schema adds latency.

### 5. Decide and record

9. **MUST** decide with hard gates first (minimum pass rate, maximum dangerous-error rate, minimum format validity, p95 time limit, data approval), then choose the cheapest or fastest model that passes all gates. Do not trade a gate for a lower price.
10. **MUST** treat a difference smaller than the run-to-run spread as no difference, and report medians with ranges, not single numbers.
11. **MUST** record the decision with the date, model versions, settings, results and the task set version, update the role table, and re-run the benchmark on new model releases, price changes and drift alerts ([BP-0050](/operations/evaluation/detect-model-drift/)).

## When to apply

Choosing a model for a role, switching providers, adopting a new model release, or when cost, latency or quality complaints appear.

## Examples

Scorecard for an extraction role (illustrative):

| Model | Pass | Missed escalations | Schema-valid | TTFT p50 | Task p95 | Cost / pass | Gates |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Large | 0.94 | 1% | 1.00 (structured) | 0.9 s | 7.8 s | $0.021 | pass |
| Mid | 0.91 | 2% | 1.00 (structured) | 0.4 s | 3.1 s | $0.006 | pass → **chosen** |
| Small | 0.79 | 9% | 0.97 | 0.2 s | 1.4 s | $0.002 | fails accuracy gates |

Gates: pass ≥ 0.90, missed escalations ≤ 3%, schema-valid ≥ 0.99, p95 ≤ 5 s.

Run summariser (Bun). Reads one JSON line per run and prints the four dimensions per model; errors count as failures:

```ts
// author: Stephen Eaton
// score.ts — summarise benchmark runs per model: accuracy, format validity, speed, cost.
// usage: bun score.ts runs.jsonl   (one JSON object per run, schema below)
type Run = { model: string; case: string; pass: boolean; schemaValid: boolean;
             ttftMs: number; totalMs: number; outTokens: number; costUsd: number; error?: string };

const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
};

export function summarise(runs: Run[]) {
  const byModel = Map.groupBy(runs, (r) => r.model);
  return [...byModel].map(([model, rs]) => {
    const ok = rs.filter((r) => !r.error);
    const passes = ok.filter((r) => r.pass).length;
    return {
      model,
      runs: rs.length,
      errors: rs.length - ok.length,
      passRate: +(passes / rs.length).toFixed(3),            // errors count as failures
      schemaValidRate: +(ok.filter((r) => r.schemaValid).length / rs.length).toFixed(3),
      ttftP50: Math.round(pct(ok.map((r) => r.ttftMs), 50)),
      totalP50: Math.round(pct(ok.map((r) => r.totalMs), 50)),
      totalP95: Math.round(pct(ok.map((r) => r.totalMs), 95)),
      tokPerSec: Math.round(pct(ok.map((r) => r.outTokens / ((r.totalMs - r.ttftMs) / 1000)), 50)),
      costPerPass: passes ? +(rs.reduce((a, r) => a + r.costUsd, 0) / passes).toFixed(4) : null,
    };
  });
}

if (import.meta.main) {
  const text = await Bun.file(Bun.argv[2]).text();
  console.table(summarise(text.trim().split('\n').map((l) => JSON.parse(l))));
}
```

## Anti-patterns

- Choosing from a leaderboard alone.
- One run per task, so noise decides.
- Comparing a model at its best settings with another at defaults.
- Average latency only, ignoring p95 and time to first token.
- Cost per call instead of cost per successful task.
- Trusting structured output without validating it.
- Never re-running the benchmark after the decision.

## Checklist

- [ ] Shortlist from public data; only approved models
- [ ] Private, representative task set with automated checks or pinned rubric judge
- [ ] Fair settings, effort sweep, several interleaved runs per task, production path
- [ ] Accuracy, dangerous-error rate, speed (TTFT, tokens/s, p50/p95), cost per success, format validity
- [ ] Hard gates first, then cheapest or fastest; noise treated as no difference
- [ ] Decision recorded; role table updated; re-run on releases and drift

## References

- [When Benchmarks are Targets](https://arxiv.org/abs/2402.01781)
- [Contamination Inflates Scores but Rarely Reorders LLM Leaderboards](https://arxiv.org/abs/2609.02899)
- [Claude Platform — Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [pstack — benchmark-checklist](https://github.com/cursor/plugins/tree/main/pstack/skills/benchmark-checklist)
