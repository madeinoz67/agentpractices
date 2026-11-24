---
title: Cut cost with time-of-day (peak/off-peak) routing
description: Where providers price by time of day, keep their current schedule in gateway config, defer work that can wait to off-peak windows, route interactive work by current price only to evaluated models, keep sessions on one provider so caches still pay, and measure the real saving.
id: BP-0047
domain: D.OPS.GW
type: pattern
roles: [orchestrator, implementer]
stage: [plan, build, operate]
status: draft
version: 1.1.0
updated: 2026-11-24
related: [BP-0046, BP-0041, BP-0006, BP-0039]
sources:
  - { title: LiteLLM docs — Off-peak pricing, url: https://docs.litellm.ai/docs/proxy/off_peak_pricing }
  - { title: Claude Code Router — Custom router, url: https://musistudio.github.io/claude-code-router/docs/server/advanced/custom-router }
  - { title: 'InfoWorld — DeepSeek raises some V4 prices as AI demand strains capacity (2026)', url: https://www.infoworld.com/article/4209439/deepseek-raises-some-v4-prices-by-more-than-10x-as-ai-demand-strains-capacity.html }
  - { title: OpenRouter API — List models (pricing), url: https://openrouter.ai/docs/api/api-reference/models/get-models }
  - { title: LiteLLM — model prices and context window map, url: https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json }
  - { title: Claude Platform docs — Batch processing, url: https://platform.claude.com/docs/en/build-with-claude/batch-processing }
---

## Rules

### Know the schedule

1. **MUST** take peak and off-peak windows and prices from the provider's current pricing page, record them in the gateway configuration with the source, the date checked and an expiry date, and refresh them on a schedule (rules 12–17). Providers add, change and withdraw these schemes; a stale schedule routes work to the expensive window.
2. **MUST** define windows in UTC in configuration, including weekday and weekend rules, and convert to local time only for display.
3. **MUST** check how the provider bills a request that crosses a window boundary, and plan long jobs so they start and finish inside the cheap window.

### Decide what can move

4. **MUST** classify work before routing by time:

   | Work | Time routing |
   | --- | --- |
   | Interactive (a person is waiting) | Route by **current** price among evaluated models; never make a person wait for a cheap window |
   | Deferrable (nightly reports, bulk tagging, re-indexing, test generation, backlog triage) | **Queue** for the off-peak window, or send to a batch API |
   | Deadline-bound | Run off-peak if it finishes before the deadline; otherwise run now |

5. **MUST** route only to models that passed your evaluations for that work, and only to providers approved for that data ([BP-0046](/operations/model-gateways-routing/route-model-traffic-through-a-gateway/) rules 6–7). A cheaper window does not change what data may go where.
6. **SHOULD** compare off-peak pricing with batch processing for deferrable work and use whichever is cheaper for the same quality; batch APIs are often discounted independently of time of day.

### Implement it

7. **SHOULD** implement time routing in the gateway, not in each agent: a scheduled queue for deferrable jobs, and a routing rule for interactive requests.
8. **SHOULD** choose the model at the **start of a session or job** and keep it for the session. Switching provider mid-session discards the prompt cache and can cost more than the time discount saves ([BP-0041](/operations/cost-performance/budget-and-control-agent-cost/) rules 5–6).
9. **MUST** fall back to the peak-time route when the off-peak provider is slow, rate-limited or down, rather than letting deferred work miss its deadline.

### Prove it

10. **SHOULD** teach the gateway's cost tracking the time-based prices (for example LiteLLM's `off_peak_pricing` with `hours_utc` windows), so reported spend matches the bill.
11. **MUST** measure the actual saving against the bill and check quality did not drop (evaluation scores, rework, failed runs) before widening the policy ([BP-0006](/operations/evaluation/evaluate-agent-output/)).

### Keep schedules and prices current

12. **MUST** give every window and price entry an expiry (for example 30 days after it was checked). When an entry expires, the router **MUST** stop using it and fall back to the standard route until someone re-checks it, and raise an alert. Failing to the standard route costs a little more; failing to a stale window can cost a lot more.
13. **MUST** run a scheduled refresh job (for example weekly, and on any provider announcement) that compares the configured windows and prices with current sources and reports every difference:
    - the provider's own pricing page or pricing/models API (authoritative);
    - aggregator APIs, such as OpenRouter's models list, which returns per-model pricing including time-based overrides;
    - community price maps, such as LiteLLM's model price file (useful for base prices, but community-maintained and can lag; confirm against the provider).
14. **MUST** apply changes through a reviewed change (pull request) with the new source and date, not by the job writing straight to production routing.
15. **MUST** reconcile the gateway's computed cost against the provider invoice at least monthly. A gap above a set threshold (for example 5%) means a stale price, a missing time rule, or cache and batch pricing not modelled; fix the table, not the report.
16. **SHOULD** recompute the expected saving after every price or window change. If the off-peak discount no longer beats the cost of delay, or a batch API is now cheaper, change the policy.
17. **MUST** recalculate UTC windows when a provider defines its windows in a local time zone that observes daylight saving, at each clock change.

## When to apply

Teams or developers using providers that price by time of day, with a meaningful share of work that can wait. Example: in 2026 DeepSeek priced off-peak at half the peak rate, and analysts noted most hours of the day fall in the cheap window; such schedules are set by the provider and can change at short notice.

## Examples

Claude Code Router custom router that picks a cheaper route inside an off-peak window. It uses the documented `function(config, context)` signature and always returns a valid `provider,model` string; older releases used a different signature, so check the docs for the version you run.

```js
// author: Stephen Eaton
// CCR custom router: choose route by UTC time-of-day pricing window.
// Windows are examples: copy the provider's CURRENT schedule and record when you checked it.
// Example only: a nightly window that crosses midnight UTC. Real schemes can be weekday-only.
const OFF_PEAK_UTC = [{ from: '16:30', to: '00:30' }];
const SCHEDULE = { source: '<provider pricing page>', checked: '2026-11-24', expires: '2026-12-24' };
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

function isOffPeak(now = new Date()) {
  if (now >= new Date(SCHEDULE.expires)) return false; // stale schedule: use the standard route
  const m = now.getUTCHours() * 60 + now.getUTCMinutes();
  return OFF_PEAK_UTC.some(({ from, to }) => {
    const f = toMin(from), t = toMin(to);
    return f <= t ? m >= f && m < t : m >= f || m < t; // handles windows that cross midnight
  });
}

module.exports = function (config, context) {
  // Leave background/long-context scenarios to the Router config; only move the default route.
  if (context.scenario && context.scenario !== 'default') return config.Router[context.scenario] ?? config.Router.default;
  return isOffPeak() ? 'cheap-provider,evaluated-model' : config.Router.default;
};
module.exports.isOffPeak = isOffPeak;
```

LiteLLM cost tracking for a time-priced deployment (illustrative prices):

```yaml
model_list:
  - model_name: cheap-coder
    litellm_params: { model: provider/model-name, api_key: os.environ/PROVIDER_API_KEY }
    model_info:
      off_peak_pricing:
        hours_utc: "16:30-00:30"
        input_cost_per_token: 1.35e-7
        output_cost_per_token: 5.5e-7
```

LiteLLM also supports weekday-qualified windows (`windows`, `weekdays`, `weekday_timezone`) for schemes where weekends are billed off-peak.

Scheduled refresh check (Bun). Flags expired entries and compares configured base prices with LiteLLM's community price map; run it weekly in CI and open an issue or PR on any finding:

```ts
// author: Stephen Eaton
// price-check.ts — usage: bun price-check.ts pricing.json [tolerance]
type Entry = { model: string; litellmKey?: string; inputPerToken: number; outputPerToken: number;
               source: string; checked: string; expires: string };
const MAP_URL = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';

export function check(entries: Entry[], map: Record<string, any>, now = new Date(), tol = 0.01) {
  const findings: string[] = [];
  for (const e of entries) {
    if (now >= new Date(e.expires)) findings.push(`${e.model}: expired ${e.expires} (checked ${e.checked}) — re-check ${e.source}`);
    const ref = map[e.litellmKey ?? e.model];
    if (!ref) { findings.push(`${e.model}: not in reference map — check provider directly`); continue; }
    for (const [mine, theirs, label] of [[e.inputPerToken, ref.input_cost_per_token, 'input'],
                                         [e.outputPerToken, ref.output_cost_per_token, 'output']] as const) {
      if (typeof theirs === 'number' && Math.abs(mine - theirs) > theirs * tol)
        findings.push(`${e.model}: ${label} ${mine} vs reference ${theirs} — confirm with provider`);
    }
  }
  return findings;
}

if (import.meta.main) {
  const [file, tol] = Bun.argv.slice(2);
  const map = await (await fetch(MAP_URL)).json();
  const findings = check(await Bun.file(file).json(), map, new Date(), tol ? Number(tol) : undefined);
  findings.forEach((f) => console.log(f));
  process.exit(findings.length ? 1 : 0);
}
```

Deferrable job scheduling: a nightly queue (cron in the off-peak window, converted from UTC) runs bulk records tagging, repository triage and embedding refreshes; anything still queued an hour before the window closes is sent to the batch API instead.

## Anti-patterns

- Hard-coding a provider's discount window once and never checking it again.
- Holding an interactive session until a cheap window opens.
- Swapping models mid-session for a few cents and losing a large cached prefix.
- Routing confidential data to an unapproved provider because it is cheap at night.
- Claiming savings from list prices without checking the bill.
- Windows and prices with no expiry, still routing months after the provider changed them.
- A refresh job that rewrites production routing with no review.

## Checklist

- [ ] Current schedule recorded in UTC with source and date; re-checked
- [ ] Work classified: interactive, deferrable, deadline-bound
- [ ] Only evaluated models and approved providers in the time routes
- [ ] Model chosen per session/job; fallback to peak route on failure
- [ ] Gateway cost tracking knows time-based prices; saving checked against the bill
- [ ] Every window and price has source, checked date and expiry; expired entries fall back
- [ ] Scheduled refresh job diffs against provider and reference prices; changes via PR
- [ ] Monthly reconciliation against the invoice; DST changes handled

## References

- [LiteLLM — Off-peak pricing](https://docs.litellm.ai/docs/proxy/off_peak_pricing)
- [Claude Code Router — Custom router](https://musistudio.github.io/claude-code-router/docs/server/advanced/custom-router)
- [Claude Platform — Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
