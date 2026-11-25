---
title: Choose skills, MCP servers, CLIs or hooks for each capability
description: Skills carry know-how (procedures, conventions, references, helper scripts) and load only when relevant; MCP servers carry access (authenticated, governed connections to systems); CLIs and scripts carry actions an agent with a shell can run cheaply; hooks carry rules that must always hold; always-loaded instructions carry the few facts every task needs. Pick by what the capability is, combine them, and ship a server's skills with the server where the client supports it.
id: BP-0074
domain: D.AGT.SKL
type: guideline
roles: [planner, implementer]
stage: [plan, build]
status: draft
version: 1.0.0
updated: 2026-11-25
reviewed: 2026-11-25
review_by: 2027-02-25
related: [BP-0018, BP-0019, BP-0030, BP-0055, BP-0073, BP-0021, BP-0015, BP-0017, BP-0062]
sources:
  - { title: Anthropic Engineering — Equipping agents for the real world with Agent Skills, url: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills }
  - { title: Agent Skills specification, url: https://agentskills.io/specification }
  - { title: MCP — Skills extension overview, url: https://modelcontextprotocol.io/extensions/skills/overview }
  - { title: MCP — SEP-2640 Skills Extension, url: https://modelcontextprotocol.io/seps/2640-skills-extension }
---

"Skills or MCP?" is usually the wrong question: they solve different problems and work best together. A skill is know-how: a folder with a `SKILL.md`, references and scripts, where only the name and description sit in context until the task needs the rest. An MCP server is access: a connection to a system, with authentication, scopes and tools. Anthropic describes skills as procedural knowledge and MCP as access to external tools and software.

## Rules

### Decide by what the capability is

1. **MUST** classify each capability before choosing a mechanism:

   | The capability is… | Use | Why |
   | --- | --- | --- |
   | How to do a kind of task: procedure, conventions, checklists, templates, domain reference | **Skill** | Loads only when relevant; can hold far more than fits in context; versioned as files |
   | Access to a system that needs authentication, scopes, audit or central governance | **MCP server** | Managed auth and token handling; one governed server for many clients; works where there is no shell |
   | A few fixed operations an agent with a shell can run | **CLI or wrapper script**, often bundled in a skill | Cheapest in context; composable; testable ([BP-0055](/agent-engineering/tool-use/prefer-api-wrapper-scripts-to-mcp/)) |
   | A rule that must hold every time (block, require, format, log) | **Hook or permission rule** | Deterministic; not left to the model ([BP-0021](/agent-engineering/tool-use/use-hooks-for-deterministic-control/)) |
   | A few facts every task in the project needs | **AGENTS.md / CLAUDE.md** | Always loaded; keep it short ([BP-0015](/agent-engineering/instructions-prompting/write-an-agents-md/)) |

2. **MUST NOT** use a skill to grant access (credentials or tokens in skill files) or an MCP server to deliver a long procedure as tool descriptions. Each mechanism carries the part it is good at.
3. **MUST NOT** rely on a skill or instruction for something that must never be skipped; put that in a hook, a permission rule or the server's own authorization.

### Combine them

4. **SHOULD** pair them: the MCP server provides the governed actions; a skill teaches when and how to use them well (which tool first, which arguments, what to check after). A skill can also bundle a wrapper script for the common read paths and leave writes to the governed server.
5. **SHOULD**, when you publish an MCP server, ship its usage skills with it using the MCP Skills extension (`io.modelcontextprotocol/skills`, SEP-2640, final since September 2026), so clients that support it discover the instructions together with the tools. Keep the same skills installable as plain Agent Skills for clients that do not.
6. **MUST** keep one source of truth when the same know-how is served several ways (a repository skill, a skill served over MCP, a plugin): generate the others from it ([BP-0017](/agent-engineering/instructions-prompting/one-source-of-truth-for-agent-instructions/)).

### Cost and safety

7. **SHOULD** compare context cost: a skill costs its description until used; a connected MCP server costs its tool definitions unless the client defers loading them, and every result passes through the model; a script's output can be filtered before it does.
8. **MUST** apply the same supply-chain rules to both: skills contain instructions and code that run with the agent's permissions, MCP servers run code and hold credentials. Review, pin and scope both ([BP-0044](/security-safety/supply-chain/vet-and-pin-agent-dependencies/), [BP-0023](/agent-engineering/tool-use/use-mcp-servers-safely/)).
9. **MUST** treat skills fetched from an MCP server as untrusted until reviewed, like any instructions from outside ([BP-0005](/security-safety/prompt-injection-untrusted-input/treat-observed-content-as-data/)).

## When to apply

Deciding how to give agents a new capability, packaging an integration, or reviewing why an agent keeps misusing a tool.

## Examples

| Capability | Mechanism |
| --- | --- |
| "Write release notes our way" | Skill (template, rules, examples) |
| Read and create Jira issues with each user's own permissions | MCP server (OAuth, scopes) + skill on how the team triages |
| List open GitHub issues as compact JSON | Wrapper script, bundled in a triage skill |
| Never push to `main`; always run the type check before stopping | Permission rule + Stop hook |
| "Use Bun; tests live in `tests/`" | AGENTS.md |
| Records filing to a hierarchical taxonomy in Paperless | Skill (taxonomy, rules, scripts) + the Paperless API via script or MCP for access |

## Anti-patterns

- An MCP server whose tool descriptions are pages of procedure.
- A skill with an API token in its `scripts/` folder.
- Hundreds of lines of workflow in AGENTS.md that only one task needs.
- "The skill says never delete" as the only protection against deletes.
- The same instructions copied into a skill, a server and a plugin, drifting apart.

## Checklist

- [ ] Each capability classified: know-how, access, action, rule or always-needed fact
- [ ] Skills for know-how; MCP for governed access; scripts for cheap actions; hooks for rules
- [ ] No credentials in skills; no procedures crammed into tool descriptions
- [ ] Server usage skills shipped with the server where supported; one source of truth
- [ ] Context cost compared; supply-chain review for skills and servers alike

## References

- [Anthropic — Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Agent Skills specification](https://agentskills.io/specification)
- [MCP — Skills extension](https://modelcontextprotocol.io/extensions/skills/overview)
- [SEP-2640 — Skills Extension](https://modelcontextprotocol.io/seps/2640-skills-extension)
