---
title: Keep one source of truth for agent instruction files
description: Make AGENTS.md the shared instruction file and have tool-specific files (CLAUDE.md, GEMINI.md, Copilot and Cursor rules) import or point to it, adding only tool-specific lines.
id: BP-0017
domain: D.AGT.INS
type: pattern
roles: [implementer, any]
stage: [plan, build, operate]
status: draft
version: 1.0.0
updated: 2026-11-24
related: [BP-0015, BP-0016]
sources:
  - { title: AGENTS.md, url: https://agents.md/ }
  - { title: Claude Code docs — Share one file with other coding tools, url: https://code.claude.com/docs/en/claude-md }
---

## Rules

1. **MUST** keep shared project instructions in one file, `AGENTS.md`, and nowhere else.
2. **MUST** make each tool-specific file either import `AGENTS.md`, link to it, or be generated from it, and contain only what is specific to that tool.
3. **MUST NOT** copy shared instructions into tool-specific files. Copies drift, and agents then follow different rules depending on the tool.
4. **SHOULD**, for Claude Code, use a `CLAUDE.md` that starts with `@AGENTS.md`. Prefer the import over a symlink when anyone uses Windows (Git may check a symlink out as a plain text file) or when Claude must edit the file (Claude Code will not write through a symlink).
5. **SHOULD** check in CI that tool-specific files still reference `AGENTS.md` and do not repeat its sections.
6. **SHOULD** confirm in each tool that the shared file actually loaded (for Claude Code, `/context` lists memory files) after changing the arrangement.

## When to apply

Any repository used with more than one coding agent, or likely to be.

## Procedure

1. Merge existing instruction files into `AGENTS.md` ([BP-0015](/agent-engineering/instructions-prompting/write-an-agents-md/)); resolve contradictions while merging.
2. Replace each tool file with an import or pointer plus its tool-specific lines.
3. Add a CI check (a few lines of shell or a Bun script) that fails if a tool file stops referencing `AGENTS.md`.
4. Start a session in each tool and confirm the shared instructions loaded.

## Examples

| Tool | File | Contents |
| --- | --- | --- |
| Shared | `AGENTS.md` | All project instructions |
| Claude Code | `CLAUDE.md` | `@AGENTS.md` then Claude-only lines ([BP-0016](/agent-engineering/instructions-prompting/write-a-claude-md/)) |
| Other tools that read `AGENTS.md` natively | — | Nothing extra needed |
| Tools with their own file only | their file | A pointer to `AGENTS.md`, or a copy generated from it in CI — never hand-edited |

## Anti-patterns

- `CLAUDE.md`, `GEMINI.md` and `.cursorrules` each holding a slightly different copy of the build commands.
- A symlinked `CLAUDE.md` in a repo with Windows contributors, which arrives as a one-line text file.
- Tool-specific files that silently stopped loading the shared file after a rename.

## Checklist

- [ ] Shared instructions only in `AGENTS.md`
- [ ] Tool files import or point to it, plus tool-only lines
- [ ] CI check for the reference
- [ ] Load confirmed in each tool

## References

- [AGENTS.md](https://agents.md/)
- [Claude Code — Share one file with other coding tools](https://code.claude.com/docs/en/claude-md)
