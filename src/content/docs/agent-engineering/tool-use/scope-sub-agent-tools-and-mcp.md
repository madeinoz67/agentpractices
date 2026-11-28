---
title: Give each sub-agent only the tools and MCP servers its role needs
description: Sub-agents usually inherit the parent's tools and MCP servers unless told otherwise. Set an explicit allowlist per role, attach MCP servers per sub-agent (with narrower credentials where possible), keep write and side-effect tools to the roles that need them, limit spawning depth and turns, and enforce it with tool lists and deny rules rather than the sub-agent's own permission mode.
id: BP-0062
domain: D.AGT.TOOL
type: guideline
roles: [orchestrator, implementer]
stage: [plan, build]
status: draft
version: 1.0.1
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0032, BP-0042, BP-0022, BP-0023, BP-0049, BP-0055, BP-0035, BP-0021]
sources:
  - title: "Claude Code docs — Subagents"
    url: https://code.claude.com/docs/en/sub-agents
    note: The tools, disallowedTools, inline mcpServers and nesting-limit fields that make an explicit per-role allowlist possible
  - title: "Claude Code docs — Permissions"
    url: https://code.claude.com/docs/en/permissions
    note: Deny rules that apply even when the sub-agent inherits a bypassing parent mode, so its own permission setting is ignored
---
A sub-agent with every tool its parent has is a second copy of the parent's blast radius, running with less oversight. In Claude Code, for example, a sub-agent with no `tools` list inherits the built-in and MCP tools of the main conversation (minus a few interactive ones). The fix is the same in any framework: decide per role what the agent may touch, and configure it.

## Rules

### Allowlist per role

1. **MUST** give every sub-agent definition an explicit tool allowlist. Do not rely on inheritance.
2. **SHOULD** start from a role matrix and widen only with a reason:

   | Role | Tools | MCP | Not |
   | --- | --- | --- | --- |
   | Explorer / researcher | Read, search, read-only shell or web fetch | Code index, docs search | Edit, write, deploy, send |
   | Implementer | Read, edit, write, run tests and build | Code index; issue tracker read | Deploy, push to protected branches, send messages |
   | Reviewer | Read, search, run tests | Code index | Edit (it reports; the implementer fixes) |
   | Operator (rare) | Narrow, named commands or wrapper scripts | Only the server for the system it operates | Anything else; always with approval |

3. **MUST** keep tools with side effects outside the workspace (deploy, send, pay, delete, write to production systems) to the roles that need them, behind approval ([BP-0032](/security-safety/least-privilege-secrets/give-agents-least-privilege/)).

### MCP per sub-agent

4. **MUST** attach MCP servers to the sub-agents that need them, not to everything: allow one server's tools by name, and withhold all MCP tools from roles that need none.
5. **SHOULD** define a server only on the sub-agent that uses it when the main conversation does not need it. In Claude Code an inline server is connected when that sub-agent starts and disconnected when it finishes, keeping it out of the main conversation's context.
6. **SHOULD** give a sub-agent's MCP server narrower credentials than the parent's where the server supports it (a read-only token for an explorer's issue-tracker server, for example) ([BP-0023](/agent-engineering/tool-use/use-mcp-servers-safely/)).
7. **SHOULD** prefer a narrow wrapper script to a broad MCP server when the sub-agent needs only a few operations ([BP-0055](/agent-engineering/tool-use/prefer-api-wrapper-scripts-to-mcp/)).

### Enforce, don't hope

8. **MUST NOT** rely on a sub-agent's own permission mode for safety. In Claude Code, when the main conversation runs in bypass, accept-edits or auto mode, the sub-agent runs in that mode and its own setting is ignored. Use tool allowlists, deny rules and hooks, which apply regardless ([BP-0021](/agent-engineering/tool-use/use-hooks-for-deterministic-control/)).
9. **SHOULD** scope guardrail hooks to the sub-agent that needs them (for example, block writes outside its worktree).
10. **SHOULD** limit spawning: remove the agent-spawning tool from workers that should not delegate, and keep nesting shallow. Claude Code allows three levels below the main conversation by default and can be set lower.
11. **SHOULD** cap turns per sub-agent, and give writing sub-agents their own worktree ([BP-0035](/software-engineering/version-control-review/isolate-parallel-agents-with-worktrees/)).
12. **SHOULD** control skills explicitly: preloading a skill is not the same as limiting access; remove the skill tool from roles that must not use skills.

### Keep it honest

13. **MUST** keep sub-agent definitions in version control and review tool-list changes like permission changes.
14. **SHOULD** test the limits: ask each sub-agent to do something outside its role (edit a file, call an unlisted server) and confirm it cannot.

## When to apply

Defining sub-agents or agent roles in any framework; adding an MCP server; reviewing an orchestrator-worker setup ([BP-0042](/multi-agent-systems/team-topologies-roles/choose-the-simplest-agent-topology/)).

## Examples

Claude Code sub-agent definitions (`.claude/agents/*.md`):

```markdown
---
# author: Stephen Eaton
name: explorer
description: Read-only codebase and issue search. Returns paths and short findings.
tools: Read, Grep, Glob, mcp__codeindex__*
disallowedTools: Agent, Skill
model: haiku
effort: low
maxTurns: 20
---
```

```markdown
---
# author: Stephen Eaton
name: implementer
description: Implements one planned unit test-first in its own worktree.
tools: Read, Grep, Glob, Edit, Write, Bash
disallowedTools: Agent, mcp__*
isolation: worktree
model: sonnet
effort: medium
---
```

```markdown
---
# author: Stephen Eaton
name: ui-checker
description: Drives the app in a browser and captures screenshots against the approved mockup.
tools: Read, mcp__playwright__*
mcpServers:
  - playwright:              # inline: only this sub-agent connects to it
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
---
```

Claude Code applies `disallowedTools` first, then resolves `tools` against what is left; a tool in both is removed.

## Anti-patterns

- Sub-agents with no tool list, inheriting every MCP server the parent has.
- A reviewer that can edit the code it reviews.
- Every MCP server configured globally "in case a sub-agent needs it".
- Counting on a sub-agent's `permissionMode` while the parent runs in bypass mode.
- Workers spawning workers spawning workers.

## Checklist

- [ ] Explicit tool allowlist on every sub-agent; role matrix written down
- [ ] Side-effect tools only where needed, with approval
- [ ] MCP servers attached per sub-agent; narrower credentials where possible
- [ ] Enforcement via tool lists, deny rules and hooks, not the sub-agent's permission mode
- [ ] Spawning depth and turns limited; writers isolated
- [ ] Definitions versioned and reviewed; limits tested

