---
title: Author agent hooks that are fast, deterministic and fail safe
description: Write each hook as a small, tested, deterministic program on the narrowest event and matcher, that reads the event as untrusted JSON, blocks with an explicit signal and reason, and decides what happens when it fails.
id: BP-0020
domain: D.AGT.TOOL
type: guideline
roles: [implementer, any]
stage: [build, verify]
status: draft
version: 1.0.0
updated: 2026-11-24
reviewed: 2026-11-24
review_by: 2027-05-24
related: [BP-0021, BP-0018, BP-0005, BP-0001]
sources:
  - { title: Claude Code docs — Hooks reference, url: https://code.claude.com/docs/en/hooks }
  - { title: Claude Code docs — Hooks guide, url: https://code.claude.com/docs/en/hooks-guide }
---

## Rules

1. **MUST** attach each hook to the narrowest event and matcher that covers its job (for example `PreToolUse` with matcher `Bash` or `Edit|Write`), not to every event or tool.
2. **MUST** make the hook deterministic: same input, same decision. No model calls in a hook that enforces policy; keep judgement for prompt or agent hooks that only advise.
3. **MUST** parse the event input (JSON on stdin, or the HTTP body) defensively and treat every field — tool input, file paths, prompts — as untrusted data. Never pass it to a shell unquoted or `eval` it.
4. **MUST** block with the harness's explicit blocking signal and a reason the agent can act on. In Claude Code, exit code `2` with the reason on stderr blocks; any other non-zero exit is a non-blocking error and the action proceeds.
5. **MUST** decide what a failure, crash or timeout means for each enforcing hook. In Claude Code a timed-out `PreToolUse` hook does not block unless `"onFailure": "block"` is set; set it for policy hooks.
6. **MUST** keep hooks fast. A hook on every tool call adds latency to every step; do slow work asynchronously or in `PostToolUse`.
7. **MUST** reference scripts by an absolute or project-anchored path (for example `${CLAUDE_PROJECT_DIR}/.claude/hooks/…`), and prefer exec form (command plus arguments, no shell) over a shell string.
8. **MUST NOT** put secrets in hook configuration or scripts. Read them from the environment; for HTTP hooks, allow only the variables the hook needs.
9. **MUST** test each hook with recorded event payloads: an allowed case, a blocked case, malformed input, and a timeout.
10. **SHOULD** write hook scripts in a language with real JSON parsing (Bun/TypeScript, Python, Go) rather than `grep` over raw JSON, and give each script an `author` and purpose header.
11. **SHOULD** log each decision (event, tool, decision, reason) where the operator can audit it, without logging secrets or file contents.
12. **SHOULD** use a hook's ability to rewrite input or add context sparingly, and document it: silent changes to what the agent asked for are hard to debug.

## When to apply

Whenever you write a hook for an agent harness (Claude Code hooks, or the equivalent in other tools). For when to use a hook at all, see [BP-0021](/agent-engineering/tool-use/use-hooks-for-deterministic-control/).

## Examples

`.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{ "type": "command", "command": "bun", "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/protect-paths.ts"], "onFailure": "block" }]
      }
    ]
  }
}
```

`.claude/hooks/protect-paths.ts`:

```ts
// author: Stephen Eaton
// PreToolUse hook: block edits to generated, vendored and secret paths.
const PROTECTED = [/^\.env/, /(^|\/)secrets\//, /^internal\/gen\//, /^vendor\//];

let input: any;
try { input = JSON.parse(await Bun.stdin.text()); }
catch { console.error('protect-paths: unreadable hook input'); process.exit(2); }

const path = String(input?.tool_input?.file_path ?? '');
const rel = path.startsWith(input?.cwd ?? '') ? path.slice((input.cwd ?? '').length + 1) : path;
if (PROTECTED.some((re) => re.test(rel))) {
  console.error(`Blocked: ${rel} is protected (generated, vendored or secret). Edit the source instead.`);
  process.exit(2);
}
process.exit(0);
```

Test with recorded payloads:

```sh
echo '{"cwd":"/repo","tool_input":{"file_path":"/repo/.env"}}' | bun .claude/hooks/protect-paths.ts; echo $?   # 2
echo '{"cwd":"/repo","tool_input":{"file_path":"/repo/src/a.ts"}}' | bun .claude/hooks/protect-paths.ts; echo $? # 0
echo 'not json' | bun .claude/hooks/protect-paths.ts; echo $?                                                     # 2
```

## Anti-patterns

- `exit 1` for a block, which in Claude Code lets the action proceed.
- A policy hook that silently allows on crash or timeout.
- `bash -c "$(jq -r .tool_input.command)"`-style handling of agent input.
- One catch-all hook on every event that grows into an unreviewable script.
- Hooks that call a model to decide whether to allow a dangerous action.

## Checklist

- [ ] Narrowest event and matcher
- [ ] Deterministic; input parsed defensively, never executed
- [ ] Explicit block signal with an actionable reason
- [ ] Failure and timeout behaviour set (`onFailure: block` for policy hooks)
- [ ] Fast; project-anchored path; exec form; no secrets
- [ ] Tested with allow, block, malformed and timeout payloads

## References

- [Claude Code — Hooks reference](https://code.claude.com/docs/en/hooks)
- [Claude Code — Hooks guide](https://code.claude.com/docs/en/hooks-guide)
