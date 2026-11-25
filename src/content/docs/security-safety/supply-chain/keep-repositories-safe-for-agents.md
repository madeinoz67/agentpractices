---
title: Keep repositories safe when agents read and act on them
description: Issues, pull requests, comments, commit messages and repository files are untrusted input to any agent that reads them, and CI is where agents meet secrets. Never splice that text into prompts or shell, run agents in CI with read-only tokens and no secrets, use safe triggers, pin actions, scan agent-facing content, review agent-written pull requests like a stranger's, protect agent instruction files, and keep the trusted parts of the repository out of a pull request's reach.
id: BP-0075
domain: D.SEC.SUP
type: guideline
roles: [orchestrator, implementer, reviewer]
stage: [build, verify, operate]
status: draft
version: 1.0.0
updated: 2026-11-25
reviewed: 2026-11-25
review_by: 2027-05-25
related: [BP-0044, BP-0005, BP-0032, BP-0033, BP-0036, BP-0034, BP-0062, BP-0053, BP-0063]
sources:
  - { title: 'Aikido Security — PromptPwnd: prompt injection in GitHub Actions using AI agents', url: https://aikido.dev/blog/promptpwnd-github-actions-ai-agents }
  - { title: Invariant Labs — GitHub MCP exploited (toxic agent flow), url: https://invariantlabs.ai/blog/mcp-github-vulnerability }
  - { title: CISA — Supply chain compromise of tj-actions/changed-files (CVE-2025-30066), url: https://www.cisa.gov/news-events/alerts/2025/03/18/supply-chain-compromise-third-party-github-action-cve-2025-30066 }
  - { title: GitHub Docs — Secure use reference for GitHub Actions, url: https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions }
  - { title: zizmor — static analysis for GitHub Actions, url: https://github.com/zizmorcore/zizmor }
---

A repository is now read by agents as well as people: triage bots read issues, review agents read pull requests, coding agents read the whole tree, and AI steps run inside CI next to tokens and secrets. Anyone who can open an issue, comment or send a pull request can put text in front of those agents. Three incidents show the shape of the risk:

- **Issue text into an agent in CI.** Aikido's PromptPwnd research found workflows that inserted issue bodies, pull-request descriptions or commit messages straight into prompts for AI agents that also held high-privilege tokens and shell access; a crafted issue could make the agent leak those tokens.
- **Issue text into an agent with broad access.** Invariant Labs showed that a malicious issue in a public repository could steer an agent using the GitHub MCP server into reading the user's private repositories and publishing them in a public pull request. Untrusted input, private data and a public write channel in one session was enough.
- **CI dependencies.** In March 2025 the `tj-actions/changed-files` action was compromised and its version tags moved to malicious code that printed CI secrets into logs; repositories referencing it by tag ran the malicious version.

## Rules

### Treat repository text as untrusted input

1. **MUST** treat issue titles and bodies, comments, pull-request titles, descriptions and diffs, commit messages, branch names, review comments and repository files from contributors as untrusted data for every agent that reads them ([BP-0005](/security-safety/prompt-injection-untrusted-input/treat-observed-content-as-data/)).
2. **MUST NOT** interpolate that text into a prompt template or a shell command in a workflow. Pass it through environment variables or files, quoted, and tell the agent it is data to analyse.
3. **MUST** split agent sessions so none combines all three: untrusted repository text, access to private data or secrets, and a way to write somewhere public ([BP-0053](/multi-agent-systems/coordination-handoff/prevent-error-amplification/)).

### Run agents in CI with the least reach

4. **MUST** give AI steps in CI a read-only token and no secrets by default. Set workflow `permissions: {}` and grant per job only what that job needs ([BP-0032](/security-safety/least-privilege-secrets/give-agents-least-privilege/)).
5. **MUST** restrict the tools an AI step can use (no general shell, no `gh` with write scopes) and gate any write it proposes (labels, comments, commits) through a separate, deterministic job that checks it.
6. **MUST NOT** use `pull_request_target` or `workflow_run` to check out or run code from a pull request; avoid them unless the job only touches trusted code and treats event text as data.
7. **MUST** decide who can trigger AI steps: restrict agent runs on pull requests and issues from people without write access, or run them without secrets in an isolated job.

### Pin and analyse CI itself

8. **MUST** pin third-party actions to full commit SHAs (with the version in a comment), or use GitHub's Actions lockfile where you have adopted it, keep them updated through reviewed automated pull requests, and allow-list which actions may run ([BP-0044](/security-safety/supply-chain/vet-and-pin-agent-dependencies/)).
9. **SHOULD** run static analysis on workflows (for example zizmor or CodeQL for Actions), secret scanning, and dependency review on every pull request.
10. **MUST** keep the code that checks a pull request out of that pull request's control: run scanners and policies from the default branch, not from the pull request.

### Scan what agents will read

11. **SHOULD** scan agent-facing content (issues, comments, pull-request descriptions, docs, agent instruction files) for hidden or invisible characters, bidirectional controls, hidden HTML and instruction-like text addressed to agents, and label or block it for a person to review. Report rule IDs, not the suspicious text itself.
12. **MUST** require review from code owners for agent instruction files (AGENTS.md, CLAUDE.md, skills, hooks, MCP and settings files) and CI workflows; a pull request that changes how agents behave is a privileged change.

### Pull requests written by agents

13. **MUST** review agent-written pull requests as you would a stranger's: read the diff, not the description; check for new dependencies, workflow changes, permission changes, network calls, obfuscated or generated blobs, and edits to tests that make them pass ([BP-0036](/software-engineering/version-control-review/review-agent-written-changes/)).
14. **MUST** protect the default branch: required reviews from a person, required status checks, no force pushes, signed commits where you use them, and agents unable to approve or merge their own pull requests.
15. **MUST** keep secrets out of the repository and out of agent-visible CI logs; rotate any secret that appeared in a log, issue or pull request, and treat it as compromised ([BP-0033](/security-safety/least-privilege-secrets/keep-secrets-out-of-agent-context/), [BP-0063](/security-safety/least-privilege-secrets/broker-agent-credentials-through-a-vault/)).

## When to apply

Any repository read by agents, any CI pipeline that runs an AI step, and any project that accepts issues or pull requests from people outside the core team.

## Examples

Untrusted text reaches the agent through an environment variable, with no secrets and a read-only token (GitHub Actions):

```yaml
# author: Stephen Eaton
name: issue-triage
on:
  issues: { types: [opened] }
permissions: {}
jobs:
  suggest:
    runs-on: ubuntu-latest
    permissions: { contents: read, issues: read }
    steps:
      - uses: actions/checkout@<full-commit-sha> # vX.Y.Z — pinned
        with: { persist-credentials: false }
      - name: Suggest labels (no write access, no secrets)
        env:
          ISSUE_TITLE: ${{ github.event.issue.title }}   # data, never interpolated into a script or prompt template
          ISSUE_BODY: ${{ github.event.issue.body }}
        run: bun scripts/suggest-labels.ts > suggestion.json
      - uses: actions/upload-artifact@<full-commit-sha> # vX.Y.Z
        with: { name: suggestion, path: suggestion.json }
  apply:
    needs: suggest
    runs-on: ubuntu-latest
    permissions: { issues: write }
    steps:
      - uses: actions/download-artifact@<full-commit-sha> # vX.Y.Z
        with: { name: suggestion }
      - name: Apply only labels from the allow-list
        run: bun scripts/apply-allowed-labels.ts suggestion.json
```

This site's own repository follows the same pattern: an issue-scan workflow runs the scanner from the default branch, passes event text only through environment variables, labels issues `needs-security-review` with the rule IDs found, and fails pull requests whose description trips the scanner; all actions are pinned to commit SHAs and workflows are checked with zizmor and CodeQL.

CODEOWNERS for files that change agent behaviour:

```text
/AGENTS.md              @madeinoz67
/CLAUDE.md              @madeinoz67
/.claude/               @madeinoz67
/.github/workflows/     @madeinoz67
/security/              @madeinoz67
```

## Anti-patterns

- A workflow prompt built by pasting the issue body into the template.
- An AI triage step with `contents: write`, cloud keys and an unrestricted shell.
- `pull_request_target` checking out the pull request's code.
- Actions referenced by tag (`@v4`) with no pin.
- A scanner that the pull request under review can edit.
- An agent allowed to approve and merge its own pull request.
- AGENTS.md changed in a drive-by pull request with no code-owner review.

## Checklist

- [ ] Repository text treated as untrusted; never interpolated into prompts or shell
- [ ] No session mixes untrusted text, private data and a public write channel
- [ ] AI steps: read-only token, no secrets, restricted tools; writes gated by a separate job
- [ ] No `pull_request_target`/`workflow_run` running pull-request code; triggers restricted
- [ ] Actions pinned to SHAs; workflow analysis, secret scanning, dependency review
- [ ] Checks run from the default branch; agent-facing content scanned
- [ ] Code-owner review for agent instruction files and workflows; branch protection; agents cannot self-merge
- [ ] Secrets out of repo and logs; leaked secrets rotated

## References

- [Aikido — PromptPwnd](https://aikido.dev/blog/promptpwnd-github-actions-ai-agents)
- [Invariant Labs — GitHub MCP exploited](https://invariantlabs.ai/blog/mcp-github-vulnerability)
- [CISA — tj-actions/changed-files compromise](https://www.cisa.gov/news-events/alerts/2025/03/18/supply-chain-compromise-third-party-github-action-cve-2025-30066)
- [GitHub — Secure use reference for GitHub Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)
- [zizmor](https://github.com/zizmorcore/zizmor)
