---
title: Isolate parallel agents with worktrees and branches
description: Give each concurrently running agent its own git worktree and branch from a fresh base, keep tasks file-disjoint, integrate one at a time, and clean up worktrees when done.
id: BP-0035
domain: D.SWE.VCS
type: pattern
roles: [orchestrator, implementer]
stage: [plan, build]
status: draft
version: 1.0.0
updated: 2026-11-24
reviewed: 2026-11-24
review_by: 2027-05-24
related: [BP-0034, BP-0036, BP-0008, BP-0013]
sources:
  - { title: git-worktree documentation, url: https://git-scm.com/docs/git-worktree }
---

## Rules

1. **MUST** give each agent working at the same time its own working directory: a git worktree (or a separate clone) on its own branch. Never let two agents edit the same working tree.
2. **MUST** create each worktree from the latest default branch, fetched just before.
3. **MUST** split parallel tasks so they touch different files and decisions ([BP-0008](/agent-engineering/workflow/decompose-tasks/) rule 9). If two tasks must change the same file, run them one after the other.
4. **MUST** integrate finished branches one at a time: update the next branch from the newly updated default branch, re-run tests, then merge. Do not merge several agent branches blind.
5. **MUST** keep per-worktree state out of the repository (local environment files, ports, caches, databases), so parallel worktrees do not collide; give each its own ports or data directory where services run.
6. **SHOULD** name worktrees and branches after the task (`../repo-issue-42`, `feat/issue-42-…`) so ownership is obvious.
7. **SHOULD** remove worktrees and delete merged branches when the task ends (`git worktree remove`, `git worktree prune`).
8. **SHOULD** record which agent owns which worktree in the run's ledger or workflow memory ([BP-0013](/agent-engineering/context-memory/use-temporary-workflow-memory/)).

## When to apply

An orchestrator running several coding agents at once, or a person running more than one agent session on the same repository.

## Procedure

```sh
git fetch origin
git worktree add -b feat/issue-42-json ../repo-issue-42 origin/main
git worktree add -b feat/issue-43-exit-codes ../repo-issue-43 origin/main
# … agents work in ../repo-issue-42 and ../repo-issue-43 …
# integrate one at a time, then:
git worktree remove ../repo-issue-42
git branch -d feat/issue-42-json
git worktree prune
```

## Anti-patterns

- Two agents in one checkout overwriting each other's edits.
- Parallel tasks that both edit `package.json` and the same module.
- Merging five agent branches in one go and debugging the combined failure.
- Dozens of stale worktrees left on disk.

## Checklist

- [ ] One worktree and branch per concurrent agent, from a fresh base
- [ ] Parallel tasks file-disjoint
- [ ] Integrated one at a time with tests re-run
- [ ] Local state and ports isolated per worktree
- [ ] Worktrees and merged branches cleaned up

## References

- [git-worktree](https://git-scm.com/docs/git-worktree)
