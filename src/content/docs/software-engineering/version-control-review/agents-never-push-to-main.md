---
title: Agents never push to main — issue, branch, pull request
description: An agent changes a repository only through an issue, a branch of its own and a pull request a person merges, and cleans up its branch and worktree afterwards; it never pushes, force-pushes or merges to the default branch, and the repository enforces that with a ruleset and agent credentials that cannot bypass it, not with an instruction alone.
id: BP-0078
domain: D.SWE.VCS
type: guideline
roles: [implementer, reviewer, orchestrator]
stage: [build, verify]
status: draft
version: 1.0.1
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0075, BP-0036, BP-0069, BP-0032, BP-0021, BP-0059]
sources:
  - title: "GitHub Docs — Available rules for rulesets"
    url: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets
    note: The rule types a default-branch ruleset can set, such as blocking force pushes and deletion
  - title: "GitHub Docs — Creating rulesets for a repository"
    url: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository
    note: The procedure behind the ruleset the practice requires, rather than an instruction agents can skip
  - title: "GitHub Docs — Linking a pull request to an issue"
    url: https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue
    note: The closing keyword that ties a pull request to its issue, and the default-branch condition it needs
  - title: "GitHub Docs — Managing the automatic deletion of branches"
    url: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-the-automatic-deletion-of-branches
    note: The repository setting that deletes head branches on merge, so remote cleanup does not depend on the agent
  - title: "GitHub Docs — Risks and mitigations for Copilot cloud agent"
    url: https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations
    note: The hosted-agent risk framing behind giving an agent its own identity and a restricted push scope
---
## Rules

### The flow

1. **MUST** start every agent change from an issue that states the intent, or link the existing issue. The issue is where a person agreed to the change; the pull request is where they check it.
2. **MUST** work on a new branch for each issue, created from the current default branch and named with the issue number, for example `fix/22-bp-0014-ledger` or `agent/22-bp-0014-ledger`.
3. **MUST NOT** push, force-push or merge to the default branch or a release branch, and **MUST NOT** rewrite history on any branch another person or agent uses. This holds when the agent's credentials would allow it and when a person asks for "just push it": the agent pushes the branch and opens the pull request instead.
4. **MUST** open a pull request against the default branch with a closing keyword for the issue (`Closes #22`) in the description, and a summary of what changed, why, how it was verified (commands and results, [BP-0059](/agent-engineering/workflow/validate-with-proof-not-claims/)) and what is left. Closing keywords only take effect when the pull request targets the default branch.
5. **SHOULD** keep one issue per pull request and open it as a draft until its checks pass.
6. **MUST** update the branch when the default branch moves (rebase or merge on the branch), resolve conflicts there and re-run the checks; never resolve them by pushing to the default branch.
7. **MUST** leave approval and merge to a person. An agent **MUST NOT** approve or merge its own pull request, or another agent's, and **MUST NOT** use a bypass even when its credentials hold one ([BP-0069](/agent-engineering/workflow/design-human-approvals-people-read/)).

### Clean up after the merge

8. **MUST** clean up once the pull request is merged: delete the remote branch, delete the local branch and any worktree the agent created for it, prune stale remote-tracking refs, and switch the working copy back to the updated default branch. Turn on the repository setting that deletes head branches automatically after merge, so the remote side does not depend on the agent.
9. **MUST** do the same when a pull request is closed without merging, after recording why on the issue; a branch nobody will merge is not a backup.
10. **MUST** delete only what it created: branches with its prefix or named in its own pull request, never a branch another person or agent is using, and never with a force flag on a branch git says is not merged (`git branch -d`, not `-D`), unless the pull request was squash- or rebase-merged and the agent has checked the pull request is merged.

### Enforce it in the repository, not only in the prompt

11. **MUST** protect the default branch with a ruleset (or branch protection): require a pull request, require the status checks, block force pushes and deletion, and keep the bypass list empty or limited to named people for break-glass ([BP-0075](/security-safety/supply-chain/keep-repositories-safe-for-agents/) rule 14).
12. **MUST** give agents their own identity (a GitHub App or bot account) and credentials scoped to the repository and to pushing branches, never an administrator's token. With a separate identity, the owner's review counts as an independent approval, and the audit log shows which changes an agent made ([BP-0032](/security-safety/least-privilege-secrets/give-agents-least-privilege/)).
13. **SHOULD** restrict where an agent can push to its own branch prefix, as hosted coding agents do, and add a local guard (a `pre-push` hook or an agent hook that blocks `git push` to the default branch, [BP-0021](/agent-engineering/tool-use/use-hooks-for-deterministic-control/)). Local guards can be skipped (`--no-verify`); they catch mistakes, the ruleset is the control.
14. **MUST**, when the agent cannot reach the remote, hand over the branch (a bundle, a patch series or a pushed fork) and the pull request text, not an updated default branch for a person to push.

## When to apply

Every repository an agent can write to: product code, infrastructure, documentation, this corpus. It applies to agents running locally with a person's credentials as much as to hosted coding agents.

## Examples

Ruleset for the default branch (`gh api -X POST repos/OWNER/REPO/rulesets --input protect-default.json`). Set `required_approving_review_count` to 1 or more once agents have their own identity; a solo maintainer reviewing an agent that pushes as them cannot approve their own pull request.

```json
{
  "name": "protect-default-branch",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "bypass_actors": [],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 1, "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": true, "require_last_push_approval": true,
        "required_review_thread_resolution": true } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [{ "context": "build" }] } }
  ]
}
```

The agent's side of the flow:

```sh
git switch -c fix/22-bp-0014-ledger origin/main
# ...change, then run the project's checks...
git push -u origin fix/22-bp-0014-ledger
gh pr create --draft --base main --title "BP-0014: say where the gap ledger lives" \
  --body "Closes #22. Changed: rule 5 names the ledger's location. Verified: bun run verify (187 pass). Left: none."

# after a person merges it
gh pr view fix/22-bp-0014-ledger --json state --jq .state   # expect MERGED
git switch main && git pull --ff-only
git push origin --delete fix/22-bp-0014-ledger 2>/dev/null || true   # already gone if auto-delete is on
git branch -D fix/22-bp-0014-ledger   # -D only because the PR state is MERGED (squash merges look unmerged to git)
git fetch --prune
```

Local guard (`.githooks/pre-push`, enabled with `git config core.hooksPath .githooks`):

```sh
#!/bin/sh
# author: Stephen Eaton
# .githooks/pre-push — refuse pushes to the default branch from this clone; changes go through a pull request.
protected="refs/heads/main refs/heads/master"
while read -r local_ref local_sha remote_ref remote_sha; do
  for p in $protected; do
    if [ "$remote_ref" = "$p" ]; then
      echo "pre-push: refusing to push to ${remote_ref#refs/heads/}. Push a branch and open a pull request." >&2
      exit 1
    fi
  done
done
exit 0
```

Tested against a local bare repository: a push to `main` is refused with the message above, a push to `fix/22-x` succeeds, and `git push --no-verify` to `main` succeeds, which is why rule 11 puts the control on the server. The cleanup commands were run after a squash merge: `git branch -d` refused the branch as "not fully merged", and `-D` removed it once the merge was confirmed.

## Anti-patterns

- "Small fix, pushed straight to main" by an agent, or by a person pushing what an agent prepared on main.
- An agent running with the owner's administrator token, so the ruleset's bypass applies to it.
- An agent approving or merging its own pull request, or two agents approving each other's.
- Resolving a conflict by force-pushing the default branch.
- A pull request with no linked issue and a description written from the agent's memory instead of the diff and the check output.
- Relying on "never push to main" in AGENTS.md with no ruleset behind it.
- Merged branches and agent worktrees left behind until nobody knows which are live.

## Checklist

- [ ] Issue first; branch per issue, named with its number
- [ ] Pull request to the default branch with `Closes #N`, verification and what is left
- [ ] Default branch ruleset: pull request required, checks required, no force push or deletion, no agent on the bypass list
- [ ] Agents use their own identity with scoped credentials; they cannot approve or merge
- [ ] Local pre-push or agent hook blocks pushes to the default branch
- [ ] After merge or close: remote and local branch, worktree and stale refs removed; auto-delete head branches on
- [ ] Offline agents hand over a branch and pull request text, not a new main
