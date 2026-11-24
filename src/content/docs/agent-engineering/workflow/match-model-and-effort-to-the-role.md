---
title: Match model and thinking effort to each role
description: Set the model and effort (thinking level) per role, not per session; start from the provider's guidance, tune effort before switching model, prove each setting with evaluations, keep effort stable within a cached conversation, and escalate on failure.
id: BP-0049
domain: D.AGT.WF
type: guideline
roles: [orchestrator, planner, implementer, reviewer, researcher]
stage: [plan, build, operate]
status: draft
version: 1.0.0
updated: 2026-11-24
related: [BP-0048, BP-0042, BP-0041, BP-0006, BP-0046]
sources:
  - { title: Claude Platform docs — Choosing a model, url: https://platform.claude.com/docs/en/about-claude/models/choosing-a-model }
  - { title: Claude Platform docs — Effort, url: https://platform.claude.com/docs/en/build-with-claude/effort }
  - { title: Claude Code docs — Subagents (model and effort fields), url: https://code.claude.com/docs/en/sub-agents }
  - { title: OpenAI docs — Reasoning models, url: https://developers.openai.com/api/docs/guides/reasoning }
  - { title: Google Cloud docs — Gemini thinking, url: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/thinking }
---

## Rules

1. **MUST** set the model and effort for each role explicitly (orchestrator, planner, implementer, explorer, reviewer, high-volume worker), not once for the whole session. Defaults differ by model and change between releases.
2. **MUST** prove each setting with evaluations on your own tasks before relying on it ([BP-0006](/operations/evaluation/evaluate-agent-output/)). The table below is a starting point, not a result.
3. **SHOULD** tune effort before switching model: lower effort on a capable model is often cheaper than a weaker model that fails and retries.
4. **SHOULD** put the most capable model where a mistake is expensive and compounds: planning, architecture, and the final independent review. Put small, fast models where work is high-volume, well-specified and cheap to check: search, extraction, classification, formatting.
5. **MUST** keep effort constant within a cached conversation, or use a per-message effort control where the provider has one. Changing top-level effort between requests can invalidate the prompt cache.
6. **MUST** allow for thinking in the output budget: at the highest effort levels set a large maximum output (Anthropic suggests starting at 64k tokens for recent Opus models).
7. **SHOULD** escalate on failure in steps: higher effort, then a more capable model, then a human ([BP-0048](/multi-agent-systems/coordination-handoff/orchestrate-agent-workflows/) rule 10). Step down again once evaluations show quality holds.
8. **MUST** record the model and effort used for each step in traces, so cost and quality can be compared ([BP-0039](/operations/observability/trace-agent-runs/)).
9. **MUST** re-check the table and re-run evaluations when a provider releases or retires a model. Date the table.
10. **SHOULD** enforce these settings in configuration (agent definitions, gateway routes, [BP-0046](/operations/model-gateways-routing/route-model-traffic-through-a-gateway/)), not in prose an agent may ignore.

## Starting points by role

Anthropic models as at 2026-11-24. The role assignments are this site's starting points, derived from the provider guidance below; run an effort sweep on your own evaluations. Effort levels are `low`, `medium`, `high`, `xhigh`, `max`; availability depends on the model.

| Role | Starting model | Starting effort | Notes |
| --- | --- | --- | --- |
| Orchestrator / planner | Claude Opus 5.5 | `high` | Fable 5.2 for the hardest planning or multi-hour sessions; it defaults to `high` |
| Spec, architecture, final review | Claude Opus 5.5 (or Fable 5.2) | `high`–`xhigh` | Fresh context; the most capable model you have |
| Long-running autonomous coding (>30 min) | Claude Opus 5.5 | `xhigh` | Large max output; measure the gain over `high` |
| Implementer, well-specified unit | Claude Sonnet 5.5 | `medium` | `high` for harder units |
| Implementer, complex or multi-file | Claude Opus 5.5 | `medium`–`high` | Opus 5.5 defaults to `medium` |
| Explorer / search / retrieval | Claude Haiku 5.5 | `low`–`medium` | `low` may skip searches or checks in long prompts |
| Extraction, classification, high-volume | Claude Haiku 5.5 | `low` | Spot-check output |
| Strict instruction following, knowledge work | Claude Haiku 5.5 | `high` | |

Provider guidance behind the table: Anthropic lists Opus 5.5 for complex agentic coding and Haiku 5.5 for subagent and high-volume tasks; recommends `low` effort for subagents and simple tasks, `medium` for balanced agentic work, `high` for complex reasoning and coding, and `xhigh` for long-horizon tasks; and recommends tuning effort before switching models. On Opus 5.5 and Fable 5.2 thinking is always adaptive and effort is the main control for thinking depth.

### Other providers

| Provider | Control | Levels | Starting guidance |
| --- | --- | --- | --- |
| Anthropic | `output_config.effort` | `low` → `max` | As above |
| OpenAI | `reasoning.effort` | Varies by model: `none`/`minimal`, `low`, `medium`, `high`, `xhigh` | Docs suggest starting with `gpt-5.5`; `gpt-5.5-pro` for the hardest problems |
| Google Gemini 3+ | `thinking_level` | `MINIMAL`, `LOW`, `MEDIUM`, `HIGH` (varies by model) | `LOW` for high-throughput simple work; do not send both `thinking_level` and `thinking_budget` |

Map roles across providers by capability tier, not by name, and re-evaluate after any mapping.

## Examples

Claude Code subagent definitions (`.claude/agents/*.md`):

```markdown
---
# author: Stephen Eaton
name: explorer
description: Read-only codebase search. Returns file paths and short findings.
model: haiku
effort: low
tools: Read, Grep, Glob
---
```

```markdown
---
# author: Stephen Eaton
name: final-reviewer
description: Independent whole-branch review against the spec.
model: opus
effort: high
---
```

Claude Code resolves a subagent's model from the invocation parameter, then the `model` field, then `CLAUDE_CODE_SUBAGENT_MODEL`, then the main conversation's model. `CLAUDE_CODE_EFFORT_LEVEL` overrides the `effort` field. The built-in Explore agent uses the main conversation's model; define your own `Explore` with `model: haiku` to run it cheaper.

API (TypeScript, Bun):

```ts
// author: Stephen Eaton
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic();

const ROLE = {
  planner:  { model: 'claude-opus-5-5',  effort: 'high'   },
  worker:   { model: 'claude-sonnet-5-5', effort: 'medium' },
  explorer: { model: 'claude-haiku-5-5', effort: 'low'    },
} as const; // checked 2026-11-24 against provider docs; re-run evals on change

export async function run(role: keyof typeof ROLE, prompt: string) {
  const { model, effort } = ROLE[role];
  return client.messages.create({
    model,
    max_tokens: effort === 'low' ? 8_000 : 32_000,
    output_config: { effort },
    messages: [{ role: 'user', content: prompt }],
  });
}
```

## Anti-patterns

- The most expensive model at maximum effort for every step, including grep.
- The cheapest model for the final review.
- Copying another team's effort settings without running your own evaluations.
- Changing effort mid-conversation and losing the prompt cache.
- An undated "best model" table that nobody re-checks.

## Checklist

- [ ] Model and effort set per role, in configuration
- [ ] Settings proven with evaluations; table dated
- [ ] Effort tuned before model switched
- [ ] Effort stable within cached conversations; output budget allows for thinking
- [ ] Escalation path defined; model and effort recorded in traces

## References

- [Claude Platform — Choosing a model](https://platform.claude.com/docs/en/about-claude/models/choosing-a-model)
- [Claude Platform — Effort](https://platform.claude.com/docs/en/build-with-claude/effort)
- [Claude Code — Subagents](https://code.claude.com/docs/en/sub-agents)
- [OpenAI — Reasoning models](https://developers.openai.com/api/docs/guides/reasoning)
- [Google Cloud — Gemini thinking](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/thinking)
