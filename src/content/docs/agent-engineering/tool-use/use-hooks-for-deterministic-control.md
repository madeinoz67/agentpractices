---
title: Use hooks for deterministic control, not as the only guardrail
description: Use hooks where something must happen on an event every time (format, test, log, notify, block), keep hard allow/deny in the permission system, and review hooks from projects and plugins like code before trusting them.
id: BP-0021
domain: D.AGT.TOOL
type: guideline
roles: [any, orchestrator]
stage: [plan, build, operate]
status: draft
version: 1.0.1
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0020, BP-0019, BP-0016, BP-0005, BP-0013]
sources:
  - title: "Claude Code docs — Hooks reference"
    url: https://code.claude.com/docs/en/hooks
    note: "The event list, the /hooks listing that shows each hook's source, and the debug flag for a hook that will not block"
  - title: "Claude Code docs — How Claude remembers your project"
    url: https://code.claude.com/docs/en/claude-md
    note: Why an instruction file is context the agent reads rather than enforcement, which is what pushes musts into hooks and deny rules
---
## Rules

### When to use a hook

1. **MUST** use a hook (or a permission rule) — not an instruction file or skill — for anything that must always or never happen. Instructions are context the agent reads; hooks run every time the event fires.
2. **SHOULD** use hooks for work that must follow an event every time: format or lint after an edit, run the affected tests, add an audit log entry, notify a person, inject current context at session start, or stop the agent finishing while checks fail.
3. **MUST** keep hard allow and deny decisions in the harness's permission system (deny rules, managed settings), and use hooks to add checks on top. In Claude Code the hook `if` filter is best-effort; permission rules are the enforcement layer.
4. **MUST NOT** rely on a hook alone for a control whose failure would be serious. Combine it with least privilege for the agent's credentials and sandboxing ([BP-0013](/agent-engineering/context-memory/use-temporary-workflow-memory/) rules 17–19, [BP-0005](/security-safety/prompt-injection-untrusted-input/treat-observed-content-as-data/)).

### Scope and ownership

5. **MUST** put each hook at the right scope: personal (`~/.claude/settings.json`), project shared (`.claude/settings.json`, committed and reviewed), project personal (`.claude/settings.local.json`), organisation (managed settings), or plugin.
6. **MUST** review hooks that come with a project, plugin, skill or sub-agent before enabling them. Hooks run arbitrary commands with your permissions.
7. **SHOULD**, in managed environments, enforce organisation hooks centrally and restrict others (in Claude Code, managed settings such as `allowManagedHooksOnly`, and allow-lists for HTTP hook URLs and variables).

### Operating hooks

8. **SHOULD** list and review configured hooks regularly (Claude Code `/hooks` shows every hook, its source and its command), and remove ones no longer needed.
9. **SHOULD** check the debug log when a hook seems not to run or not to block, before changing it (Claude Code `--debug`).
10. **SHOULD** tell the agent, in its instruction file, which hooks exist and what they enforce, so it does not fight them or retry blocked actions in a loop.
11. **MAY** temporarily disable hooks for a single diagnostic run only with the owner's agreement, never as a way around a block.

## When to apply

Any agent harness that supports hooks. Choosing between mechanisms:

| Need | Mechanism |
| --- | --- |
| Must never happen (delete prod data, push to `main`, read `.env`) | Permission deny rule / managed setting, plus a `PreToolUse` hook for richer checks |
| Must happen after an event (format, test, log) | Hook (`PostToolUse`, `Stop`, `SessionStart` …) |
| A convention the agent should follow | Instruction file ([BP-0016](/agent-engineering/instructions-prompting/write-a-claude-md/)) |
| A procedure used for some tasks | Skill ([BP-0019](/agent-engineering/skills-reusable-procedures/use-skills/)) |

## Examples

| Event | Hook | Effect |
| --- | --- | --- |
| `PreToolUse` on `Edit\|Write` | Protect generated, vendored and secret paths | Blocks with a reason ([BP-0020](/agent-engineering/tool-use/author-agent-hooks/)) |
| `PostToolUse` on `Edit\|Write` | Run the formatter on the changed file | Code always formatted |
| `Stop` | Run `bun test`; block finishing on failure | Agent cannot report "done" with failing tests |
| `SessionStart` | Add current branch and open issue to context | Agent starts oriented |
| `Notification` | Desktop or phone notification | Person knows the agent is waiting |

## Anti-patterns

- "Never run `rm -rf`" in `CLAUDE.md` with no deny rule or hook.
- Committing a project hook nobody reviewed, or enabling a plugin's hooks unread.
- A `Stop` hook that blocks forever because the check can never pass.
- Disabling all hooks to get past a block.

## Checklist

- [ ] Musts and must-nots enforced by permissions and hooks, not prose
- [ ] Each hook at the right scope; project and plugin hooks reviewed
- [ ] Hooks listed in the instruction file
- [ ] Hooks reviewed periodically; debug log checked before changes

