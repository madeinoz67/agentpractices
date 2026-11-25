---
title: Manage short-term (working) memory
description: Treat the context window as a finite working memory — load just in time, keep task state in an external ledger, compact at milestones, and re-read rather than recall.
id: BP-0011
domain: D.AGT.CTX
type: guideline
roles: [any]
stage: [build, operate]
status: draft
version: 1.0.0
updated: 2026-11-24
reviewed: 2026-11-24
review_by: 2027-05-24
related: [BP-0002, BP-0010, BP-0012, BP-0013]
sources:
  - { title: Anthropic — Effective context engineering for AI agents, url: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents }
  - { title: 'Claude Cookbook — Context engineering: memory, compaction, and tool clearing', url: https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools }
---

## Rules

1. **MUST** treat the context window as a limited budget. Load information when a step needs it (by path, query or ID), not up front "in case".
2. **MUST** keep task state in an external ledger (plan, task list, decisions, open questions, file paths touched), not only in the conversation.
3. **MUST** update the ledger at each milestone: after a step completes, a decision is made, or a plan changes.
4. **MUST** re-read a file, page or tool result before acting on it if it was loaded before a compaction or many turns ago. Do not act on recalled content.
5. **MUST** keep these through any compaction or summary: the goal and done-criteria, decisions and their reasons, open items, and the identifiers (paths, IDs, URLs) needed to reload detail.
6. **SHOULD** drop or summarise bulky tool output (long logs, full file dumps, search results) once its conclusion is recorded.
7. **SHOULD** send deep or noisy work (broad searches, large log analysis) to a sub-agent with its own context, and take back only its conclusions and references.
8. **SHOULD** record where each working fact came from (file and line, URL, command), so it can be re-checked instead of trusted.
9. **MAY** compact proactively at natural boundaries (end of a task unit) rather than waiting for the window to fill.

## When to apply

Any task longer than a few turns, any task that reads large files or logs, and any session that may be compacted, resumed, or handed to another agent.

## Procedure

1. **Start a ledger** (a file such as `progress.md`, or the harness's task list) with goal, done-criteria and the unit list.
2. **Work one unit at a time.** Load only what the unit needs.
3. **At each milestone**, write to the ledger: what was done, the evidence, decisions, and what is next.
4. **Before compaction or handoff**, make sure the ledger alone is enough to resume.
5. **After compaction or resume**, read the ledger first and reload detail by reference.

```markdown
# Ledger — add --json to parts CLI
Goal: every data command supports --json (BP-0001). Done when: tests pass, jq parses output.
- [x] U1 schema — schema/list.json; fixture validates (bun test schema)
- [ ] U2 list --json — next
Decisions: field names snake_case (matches API). Open: does `show` include stock history?
Touched: cmd/list.go, schema/list.json
```

## Anti-patterns

- Reading the whole repository or every log at the start.
- Relying on "I saw that earlier" after the window has been compacted.
- A summary that keeps the narrative but drops the file paths and decisions.
- Letting a sub-agent return its full trace instead of conclusions.
- Keeping the only copy of the plan in the conversation.

## Checklist

- [ ] Ledger exists and is current
- [ ] Context loaded by reference, just in time
- [ ] Bulky output summarised once used
- [ ] Facts re-read after compaction before acting

## References

- [Anthropic — Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Claude Cookbook — memory, compaction and tool clearing](https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools)
