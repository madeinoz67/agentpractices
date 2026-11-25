---
title: Write CLAUDE.md files that Claude Code follows
description: Keep CLAUDE.md concise, specific and layered (user, project, local, subdirectory); import AGENTS.md instead of duplicating it; move procedures to skills and file-specific rules to .claude/rules.
id: BP-0016
domain: D.AGT.INS
type: guideline
roles: [implementer, any]
stage: [plan, build]
status: draft
version: 1.0.0
updated: 2026-11-24
reviewed: 2026-11-24
review_by: 2027-05-24
related: [BP-0015, BP-0017, BP-0012, BP-0005]
sources:
  - { title: Claude Code docs — How Claude remembers your project, url: https://code.claude.com/docs/en/claude-md }
---

## Rules

1. **MUST** keep only facts Claude needs in every session in `CLAUDE.md`: build and test commands, conventions, project layout, and "always do X" rules. Move multi-step procedures to skills and instructions for one part of the codebase to path-scoped rules in `.claude/rules/`.
2. **MUST** write instructions specific enough to verify ("Use 2-space indentation", "Run `npm test` before committing", "API handlers live in `src/api/handlers/`").
3. **MUST** remove contradictions across all loaded files (user, project, local, subdirectory, `.claude/rules/`). When two rules conflict, Claude may follow either.
4. **MUST** put each instruction at the right scope:

   | Scope | File | Shared with |
   | --- | --- | --- |
   | Personal, all projects | `~/.claude/CLAUDE.md`, `~/.claude/rules/` | Just you |
   | Team, this project | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Everyone, via git |
   | Personal, this project | `./CLAUDE.local.md` (gitignored), or an `@~/…` import to share across worktrees | Just you |
   | One area of the code | `src/area/CLAUDE.md` or a `.claude/rules/*.md` with `paths:` | Everyone, loaded on demand |

5. **MUST** use a hook, permission rule or managed setting — not `CLAUDE.md` — for anything that must never happen. `CLAUDE.md` is context Claude reads, not enforced configuration.
6. **MUST NOT** put secrets in any `CLAUDE.md` or imported file.
7. **SHOULD** keep each `CLAUDE.md` under about 200 lines. Imports help organisation but still load at launch, so they do not save context.
8. **SHOULD**, when the repo has an `AGENTS.md`, start `CLAUDE.md` with `@AGENTS.md` and add only Claude-specific instructions below it (see [BP-0017](/agent-engineering/instructions-prompting/one-source-of-truth-for-agent-instructions/)).
9. **SHOULD** structure the file with headings and short bullets, not paragraphs.
10. **SHOULD** review imports from others before approving them: the first time a project imports files from outside the working directory, Claude Code asks for approval. Treat committed instruction files from others as untrusted until read ([BP-0005](/security-safety/prompt-injection-untrusted-input/treat-observed-content-as-data/)).
11. **SHOULD** check what actually loaded (`/memory`, `/context`) when instructions seem ignored, before rewriting them.
12. **MAY** start with `/init` to generate a first draft, then cut it down and add what Claude would not discover itself.

## When to apply

Any repository or machine where Claude Code is used. For tool-neutral instructions that other agents also need, write [AGENTS.md (BP-0015)](/agent-engineering/instructions-prompting/write-an-agents-md/) first.

## How loading works (summary)

- Files in the working directory and every directory above it load at launch; files in subdirectories load when Claude reads files there.
- Content is concatenated, not overridden: broader files come first, more specific ones later, and `CLAUDE.local.md` after `CLAUDE.md` at each level.
- `@path` imports resolve relative to the importing file and can nest up to four hops. Text in code spans or fenced blocks is not imported.
- Claude Code reads `AGENTS.md` on its own when there is no `CLAUDE.md` (or `CLAUDE.local.md`) in the working directory or above; when there is one, it reads `CLAUDE.md` only unless `CLAUDE.md` imports `AGENTS.md` or the setting is changed.
- Auto memory (notes Claude writes itself) is separate from `CLAUDE.md`; use `CLAUDE.md` for instructions you decide, and long-term memory practice ([BP-0012](/agent-engineering/context-memory/manage-long-term-memory/)) for what is learned.

Check the [current Claude Code documentation](https://code.claude.com/docs/en/claude-md); these details change between versions.

## Examples

```markdown
@AGENTS.md

## Claude Code
- Use plan mode for changes under `src/billing/`.
- Use the code index (BP-0010) before reading files: `codanna mcp find_symbol …`.
- Ask before running database migrations.
```

```markdown
---
paths: ["src/api/**/*.ts"]
---
# API rules (.claude/rules/api.md)
- Validate every request body with the shared Zod schemas in `src/api/schemas/`.
- Return errors as RFC 9457 problem details.
```

## Anti-patterns

- A 600-line `CLAUDE.md` that copies the README, architecture docs and every procedure.
- Using `CLAUDE.md` as a guardrail ("never run `rm -rf`") instead of a deny rule or hook.
- Personal preferences committed in the team file.
- `CLAUDE.md` and `AGENTS.md` with the same content maintained separately.
- Rewriting instructions without first checking whether the file loaded.

## Checklist

- [ ] Every-session facts only; procedures in skills, area rules in `.claude/rules/`
- [ ] Each instruction verifiable and at the right scope
- [ ] No contradictions across loaded files
- [ ] Hard limits enforced by hooks or permissions, not prose
- [ ] Imports `@AGENTS.md` when one exists; under about 200 lines

## References

- [Claude Code — How Claude remembers your project](https://code.claude.com/docs/en/claude-md)
