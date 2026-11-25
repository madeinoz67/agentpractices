---
title: Make agent commits and pull requests reviewable
description: Agents work on a branch, commit small logical changes with clear messages and attribution, never push to protected branches or rewrite shared history, and open pull requests that state what changed, why, and the evidence it works.
id: BP-0034
domain: D.SWE.VCS
type: guideline
roles: [implementer, any]
stage: [build]
status: draft
version: 1.0.0
updated: 2026-11-24
reviewed: 2026-11-24
review_by: 2027-05-24
related: [BP-0035, BP-0036, BP-0037, BP-0002, BP-0033]
sources:
  - { title: Conventional Commits 1.0.0, url: https://www.conventionalcommits.org/en/v1.0.0/ }
  - { title: GitHub Docs — Creating a commit with multiple authors, url: https://docs.github.com/en/pull-requests/committing-changes-to-your-project/creating-and-editing-commits/creating-a-commit-with-multiple-authors }
---

## Rules

1. **MUST** work on a branch named for the task (for example `feat/issue-42-json-output`), created from the latest default branch. Never commit directly to `main` or another protected branch.
2. **MUST** make each commit one logical change that builds and passes tests on its own. Keep refactors, formatting and generated files in separate commits from behaviour changes.
3. **MUST** write commit messages that say what changed and why: a short imperative subject (for example in Conventional Commits form, `fix: reject empty tag names`), and a body when the reason is not obvious.
4. **MUST** mark agent-authored work as such, with the project's attribution convention (for example a `Co-Authored-By:` trailer naming the agent) so reviewers and audits can tell.
5. **MUST NOT** force-push, rebase or otherwise rewrite history that others have fetched (shared branches, `main`). Rewriting your own unpushed or unshared commits is fine.
6. **MUST NOT** commit secrets, credentials, local configuration, large binaries or build output; run secret scanning before committing ([BP-0033](/security-safety/least-privilege-secrets/keep-secrets-out-of-agent-context/)).
7. **MUST** fetch the remote before integrating, and integrate the latest default branch into your branch (rebase if unshared, merge if shared) before opening or updating a pull request, resolving conflicts yourself and re-running tests.
8. **MUST** open a pull request with: what changed, why (link the issue), how it was verified (commands run and their results), what was not done, and any decisions made without the requester.
9. **SHOULD** keep pull requests small enough to review in one sitting; split large work into a sequence of pull requests ([BP-0008](/agent-engineering/workflow/decompose-tasks/)).
10. **SHOULD** never mark a pull request ready, or merge it, when CI is failing or checks were skipped.
11. **MAY** squash a branch's commits on merge when the project prefers one commit per change.

## When to apply

Any agent that changes a repository.

## Examples

```text
fix: reject empty tag names in records upload

Paperless accepted "" as a tag and created an orphan.
Validate before upload and return exit code 2 with the bad field.

Closes #42
Co-Authored-By: <agent name> <agent email>
```

Pull request body:

```markdown
## What
Reject empty tag names before upload.
## Why
Closes #42 — orphan tags created by blank values.
## Verified
- `bun test` → 81 pass, 0 fail
- Manual: upload with tags `["", "Tax"]` → exit 2, "tag[0] is empty"
## Not done
Cleaning up existing orphan tags (separate issue #43).
```

## Anti-patterns

- One 2,000-line commit "update stuff".
- `git push --force` to a branch a colleague is working on.
- Pull requests that say "done" with no evidence.
- Agent commits indistinguishable from human ones.

## Checklist

- [ ] Task branch from latest default branch; no direct commits to protected branches
- [ ] Small logical commits; clear messages; agent attribution
- [ ] No rewritten shared history; no secrets or build output
- [ ] Latest default branch integrated; tests re-run
- [ ] PR states what, why, evidence, not done; CI green

## References

- [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
- [GitHub — Commits with multiple authors](https://docs.github.com/en/pull-requests/committing-changes-to-your-project/creating-and-editing-commits/creating-a-commit-with-multiple-authors)
