---
title: Vet, pin and track every agent dependency
description: Treat models, MCP servers, skills, plugins, hooks, gateways and packages as supply chain — verify they are real and from the expected publisher, review and pin them, keep an inventory, and never let an agent install something it cannot verify exists.
id: BP-0044
domain: D.SEC.SUP
type: guideline
roles: [implementer, reviewer, orchestrator]
stage: [plan, build, operate]
status: draft
version: 1.0.1
updated: 2026-11-25
related: [BP-0019, BP-0021, BP-0023, BP-0036, BP-0046]
sources:
  - { title: OWASP LLM04:2026 Supply Chain, url: https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/ }
  - { title: 'Trend Micro — Slopsquatting: when AI agents hallucinate malicious packages', url: https://www.trendmicro.com/vinfo/us/security/news/cybercrime-and-digital-threats/slopsquatting-when-ai-agents-hallucinate-malicious-packages }
---

## Rules

1. **MUST** keep an inventory of everything an agent depends on: models and providers, gateways, MCP servers, skills, plugins, hooks, packages and their versions.
2. **MUST** verify a package exists, is the intended one, and comes from the expected publisher before an agent adds it. AI tools sometimes suggest package names that do not exist, and attackers register those names with malware ("slopsquatting").
3. **MUST** pin every dependency to a reviewed version (lockfiles, commit SHAs, image digests) and update deliberately, not automatically on every run.
4. **MUST** review third-party skills, plugins, hooks and MCP servers like code before enabling them ([BP-0019](/agent-engineering/skills-reusable-procedures/use-skills/), [BP-0021](/agent-engineering/tool-use/use-hooks-for-deterministic-control/), [BP-0023](/agent-engineering/tool-use/use-mcp-servers-safely/)).
5. **MUST** route agent package installs through an approved registry or proxy where possible, with allow-lists for new packages.
6. **SHOULD** check new dependencies for age, maintainers, download history and known vulnerabilities, and treat a brand-new package with a plausible name as suspicious.
7. **SHOULD** record which model and version produced an output, and re-evaluate when a provider changes or deprecates a model ([BP-0006](/operations/evaluation/evaluate-agent-output/)).
8. **SHOULD** run dependency and secret scanning in CI on every agent change, and review lockfile diffs ([BP-0036](/software-engineering/version-control-review/review-agent-written-changes/)).
9. **SHOULD** keep a software bill of materials that includes agent components (models, servers, skills), so you can answer "where do we use X?" when an advisory lands.

## When to apply

Adding or updating any component an agent uses or installs, and when agents write code that adds dependencies.

## Examples

Good: the agent proposes `npm install fast-csv-parse`; a hook checks the registry, finds the package was published two days ago by an unknown account with no downloads, and blocks it with "unverified package; did you mean `fast-csv`?".

Bad: the agent installs whatever names it remembers, unpinned, and enables a skill pack from a forum post.

## Anti-patterns

- `latest` tags for MCP servers and gateway images.
- Agents with permission to install any package globally.
- No record of which model version produced a release's code.

## Checklist

- [ ] Inventory of models, servers, skills, plugins, hooks, packages
- [ ] Packages verified real and from the expected publisher
- [ ] Everything pinned; updates deliberate
- [ ] Third-party agent components reviewed
- [ ] Installs via approved registry; scanning in CI; SBOM includes agent parts

## References

- [OWASP LLM04:2026 Supply Chain](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/)
- [Trend Micro — Slopsquatting](https://www.trendmicro.com/vinfo/us/security/news/cybercrime-and-digital-threats/slopsquatting-when-ai-agents-hallucinate-malicious-packages)
