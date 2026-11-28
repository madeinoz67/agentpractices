---
title: Detect and respond to model drift
description: Pin model versions, record which model actually served each call, re-run a golden evaluation set on a schedule and on every change, compare against a baseline with thresholds, watch live signals and provider lifecycle notices, and roll back through the gateway when quality drops.
id: BP-0050
domain: D.OPS.EVL
type: guideline
roles: [orchestrator, reviewer, implementer]
stage: [verify, operate]
status: draft
version: 1.0.1
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0006, BP-0051, BP-0039, BP-0046, BP-0049, BP-0044]
sources:
  - title: "Claude Platform docs — Model IDs and versions"
    url: https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions
    note: A snapshot ID's weights stay fixed while an alias moves to the newest snapshot, the reason rule 1 pins
  - title: "Claude Platform docs — Model deprecations"
    url: https://platform.claude.com/docs/en/about-claude/model-deprecations
    note: The retirement schedule rule 10 tracks, so a deprecation is planned for rather than discovered from an error message
  - title: OpenTelemetry GenAI semantic conventions
    url: https://github.com/open-telemetry/semantic-conventions-genai
    note: The gen_ai.request.model and gen_ai.response.model attributes whose mismatch exposes a silent fallback or alias move
---
Model drift is a change in agent behaviour that you did not make on purpose. It comes from more places than the model weights:

| Source | Example |
| --- | --- |
| Model version | An alias moves to a newer snapshot; a provider ships an update |
| Serving | Gateway fallback sends traffic to another model or provider; provider infrastructure changes |
| Settings | A default effort or thinking setting changes between releases |
| Your side | Prompt, skill, tool schema, MCP server or retrieval index changes |
| Inputs | The work itself changes (new repo, new document types) |

## Rules

### Make drift visible

1. **MUST** pin model versions in production configuration (snapshot IDs, not moving aliases), and change them only through a reviewed change. Anthropic, for example, states that a model ID's weights and configuration do not change, while older aliases resolve to the latest snapshot.
2. **MUST** record on every model call both the model requested and the model that served it (`gen_ai.request.model` and `gen_ai.response.model`), plus provider, effort level and gateway route ([BP-0039](/operations/observability/trace-agent-runs/)). Alert when they differ unexpectedly.
3. **MUST** version everything else that shapes behaviour: system prompt (hash), skills and practices (`BP-ID@version`), tool and MCP server versions, retrieval index build. Record them on the run.

### Check on purpose

4. **MUST** keep a golden evaluation set per workflow or role: representative tasks with checkable criteria, plus every past real failure ([BP-0006](/operations/evaluation/evaluate-agent-output/)).
5. **MUST** run it on a schedule (for example daily for critical workflows, weekly otherwise) **and** on every change event: model or route change, effort change, prompt or skill change, provider notice.
6. **MUST** compare against a stored baseline with thresholds set in advance: pass rate, rubric score, format validity, tool-call error rate, refusals, output length, tokens, cost and latency. Run each case several times; outputs vary between runs, so compare rates, not single results.
7. **MUST** pin the judge too: if a model grades the output, pin its version and rubric, and spot-check it against human judgement. An unpinned judge drifts with the thing it judges.

### Watch production

8. **SHOULD** watch live signals against a rolling baseline: task success, retries and escalations, tool errors, human overrides, review findings, tokens per task ([BP-0051](/operations/observability/observe-agent-workflows/)).
9. **SHOULD** sample production outputs for rubric grading and human review, weighted towards high-stakes work.
10. **MUST** track provider lifecycle: deprecation pages and, where offered, the provider's models API (Anthropic's reports a `lifecycle` status with `deprecated_at` and `retires_at`). Plan the migration before retirement, not after.

### Respond

11. **MUST** treat a planned model change as a release: run the golden set on the candidate, then canary a small share of traffic through the gateway, compare, and widen only if thresholds hold ([BP-0046](/operations/model-gateways-routing/route-model-traffic-through-a-gateway/)).
12. **MUST** have a rollback: pin back to the last good model and settings in the gateway, freeze further changes, and open an incident.
13. **MUST** turn every drift-caused failure into a regression case, and update the role table when the right model or effort changes ([BP-0049](/agent-engineering/workflow/match-model-and-effort-to-the-role/)).

## When to apply

Any agent or workflow in regular use, and before and after any model, provider, effort or prompt change.

## Examples

Drift check (Bun). Runs each golden case several times, compares pass rate and median tokens against a stored baseline, and fails the job on a breach:

```ts
// author: Stephen Eaton
// drift-check.ts — usage: bun drift-check.ts baseline.json results.json
type Run = { case: string; pass: boolean; tokens: number };
type Baseline = { passRate: number; medianTokens: number; maxPassDrop: number; maxTokenRise: number };

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function compare(base: Baseline, runs: Run[]) {
  const passRate = runs.filter((r) => r.pass).length / runs.length;
  const medianTokens = median(runs.map((r) => r.tokens));
  const breaches: string[] = [];
  if (base.passRate - passRate > base.maxPassDrop)
    breaches.push(`pass rate ${passRate.toFixed(2)} < baseline ${base.passRate.toFixed(2)} - ${base.maxPassDrop}`);
  if (medianTokens > base.medianTokens * (1 + base.maxTokenRise))
    breaches.push(`median tokens ${medianTokens} > baseline ${base.medianTokens} +${base.maxTokenRise * 100}%`);
  return { passRate, medianTokens, breaches };
}

if (import.meta.main) {
  const [b, r] = Bun.argv.slice(2);
  const res = compare(await Bun.file(b).json(), await Bun.file(r).json());
  console.log(JSON.stringify(res, null, 2));
  process.exit(res.breaches.length ? 1 : 0);
}
```

Trace attributes that make served-model drift visible:

```text
gen_ai.request.model    = claude-sonnet-5-5
gen_ai.response.model   = claude-sonnet-5-5      # differs → fallback or alias move
gen_ai.request.reasoning.level = medium
app.prompt.sha256       = 9f2c…   app.practices = BP-0002@1.0.0,BP-0049@1.1.0
app.gateway.route       = coder-primary
```

## Anti-patterns

- Using a moving alias in production and finding out from users that behaviour changed.
- One run per eval case, so normal variation looks like drift (or hides it).
- An unpinned model grading the output of another unpinned model.
- Gateway fallbacks that silently serve a different model with no record.
- Learning of a retirement from an error message.

## Checklist

- [ ] Model versions pinned; changes reviewed
- [ ] Requested vs served model, effort and route recorded per call
- [ ] Prompt, skill, tool and index versions recorded per run
- [ ] Golden set run on schedule and on every change, several runs per case
- [ ] Baseline and thresholds set in advance; judge pinned
- [ ] Lifecycle notices tracked; canary and rollback in the gateway

