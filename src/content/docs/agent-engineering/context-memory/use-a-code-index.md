---
title: Use a code index to gather context
description: Find code through a symbol, reference and semantic index, read only the spans the task needs, and verify index results against current source before editing.
id: BP-0010
domain: D.AGT.CTX
type: guideline
roles: [implementer, reviewer, orchestrator]
stage: [plan, build, verify]
status: draft
version: 1.0.0
updated: 2026-11-24
related: [BP-0002, BP-0008, BP-0011]
sources:
  - { title: Codanna — local code intelligence MCP server, url: https://github.com/bartolli/codanna }
  - { title: Language Server Protocol, url: https://microsoft.github.io/language-server-protocol/ }
  - { title: ripgrep, url: https://github.com/BurntSushi/ripgrep }
---

## Rules

1. **MUST** locate code through an index (symbol lookup, references, call graph, semantic search) before opening files, when an index is available.
2. **MUST** read only the spans the task needs: the symbol, its callers and callees, and their types. Do not read whole files or directories to "get a feel" for the code.
3. **MUST** verify an index result against the current source before you edit or quote it. An index can be stale; the file on disk is the truth.
4. **MUST** re-index, or confirm the index is current, after a branch switch, pull, rebase or large edit.
5. **SHOULD** use reference and call-graph queries for impact analysis ("who calls X", "what breaks if I change Y") instead of text search, and list the affected symbols in the plan.
6. **SHOULD** fall back to text search (ripgrep) when there is no index, or when the target is not a symbol: a string literal, config key, log message, comment or file in a language the index does not parse.
7. **SHOULD** keep the index local and out of version control, and exclude secrets, vendored code, build output and generated files from it.
8. **SHOULD** record in the plan or handoff which queries found the relevant code, so a reviewer or the next agent can repeat them.
9. **MAY** have an orchestrator share one index across sub-agents (for example, a single MCP server) instead of each agent re-reading the repository.

## When to apply

Any task in an existing codebase: bug fixes, refactors, reviews, impact analysis, onboarding to an unfamiliar repo. The benefit grows with repository size. In a repo of a few files, reading them directly is fine.

## Procedure

1. **Check the index.** Confirm one exists and is current for this branch; re-index if not.
2. **Find the entry point.** Use semantic search with the task's words, or symbol lookup if you know the name.
3. **Expand the context deliberately.** Query callers, callees and implementations of that symbol. Stop when you can explain how the change propagates.
4. **Read the spans.** Open only the line ranges the queries returned.
5. **Verify.** Confirm the code at those lines matches what the index reported before you edit.
6. **Fall back for non-symbols.** Use ripgrep for strings, config keys and comments.

## Examples

| Question | Index query (example: Codanna CLI) | Fallback |
| --- | --- | --- |
| Where is `parse_config` defined? | `codanna mcp find_symbol name:"parse_config"` | `rg -n "fn parse_config"` |
| Who calls it? | `codanna mcp find_callers parse_config` | `rg -n "parse_config\("` (misses indirect calls) |
| What breaks if I change it? | `codanna mcp analyze_impact symbol_name:"parse_config"` | Manual trace of references |
| Where do we validate tokens? | `codanna mcp semantic_search_with_context query:"validate auth token"` | `rg -n -i "token"` (noisy) |
| Where is `MAX_RETRIES` set in config? | Not a symbol; skip the index | `rg -n "MAX_RETRIES"` |

Other ways to get the same queries: a language server (LSP "go to definition" and "find references"), universal-ctags for definitions only, or a hosted code-search service for very large or multi-repo estates. Use the one your environment supports; the rules do not depend on the tool.

## Anti-patterns

- `cat`-ing whole directories into context "to understand the codebase".
- Editing from an index snippet without opening the current file.
- Trusting an index built on another branch.
- Using text search for "who calls X" and missing calls through aliases, traits or interfaces.
- Committing the index, or indexing `.env` files and secrets.

## Checklist

- [ ] Index exists and is current for this branch
- [ ] Context gathered by queries, not bulk reads
- [ ] Index results checked against current source before editing
- [ ] Impact (callers and implementations) listed in the plan
- [ ] Queries recorded for the reviewer

## References

- [Codanna](https://github.com/bartolli/codanna): local code intelligence and semantic search, served over MCP or as a one-shot CLI
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)
- [ripgrep](https://github.com/BurntSushi/ripgrep)
