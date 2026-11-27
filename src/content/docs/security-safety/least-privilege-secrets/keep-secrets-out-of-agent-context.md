---
title: Keep secrets out of agent context, memory, logs and output
description: Inject credentials at the tool boundary so the model never sees them, never put secrets in prompts, instruction files, memory, skills or commits, scan and redact everywhere agents write, and rotate any secret an agent has seen.
id: BP-0033
domain: D.SEC.PRV
type: guideline
roles: [any, implementer, orchestrator]
stage: [build, operate]
status: draft
version: 1.0.2
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0032, BP-0012, BP-0013, BP-0016, BP-0022]
sources:
  - title: "OWASP LLM02:2026 Sensitive Information Disclosure"
    url: https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/
    note: "The disclosure risk this practice addresses: secrets and personal data leaking through prompts, output, memory and logs"
  - title: OWASP Secrets Management Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
    note: Storage, rotation and detection practices for secrets kept in one managed store with audit logging and scanning
---
## Rules

1. **MUST** inject credentials at the tool or transport boundary (environment of the tool process, a secret manager, OAuth handled by the client) so the model never sees the secret value.
2. **MUST NOT** put secrets in prompts, instruction files (`AGENTS.md`, `CLAUDE.md`), skills, MCP configuration that is committed, agent memory, workflow stores, or handoff briefs. Reference them by name (`${GITHUB_TOKEN}`), never by value.
3. **MUST** deny agents read access to secret files and stores they do not need (`.env`, `~/.ssh`, cloud credential files, password managers) with permission rules or the sandbox, not instructions.
4. **MUST** scan everything agents write for secrets before it leaves the machine: commits and pull requests (pre-commit and CI secret scanning), logs, memory entries, issue comments and generated documents.
5. **MUST** redact secrets and personal data from tool output and logs before they enter context or are stored.
6. **MUST** treat any secret that entered an agent's context, transcript, memory or a log as exposed: rotate it, then remove it from where it was stored.
7. **SHOULD** use short-lived, scoped tokens ([BP-0032](/security-safety/least-privilege-secrets/give-agents-least-privilege/)) so an exposed secret has limited use.
8. **SHOULD** keep secrets in one managed store (cloud secret manager, vault, OS keychain) with audit logging, not in files spread across machines.
9. **SHOULD** tell agents, in their instruction file, where credentials come from and that they must never print, echo or store them.

## When to apply

Any agent that uses credentials, reads configuration, writes code, logs, memory or documents.

## Examples

Good: the deploy tool reads `DEPLOY_TOKEN` from its own environment; the agent calls `deploy --env staging` and sees only the result. `.env` is on the agent's deny list. Pre-commit secret scanning blocks a token in a test fixture.

Bad: "Here is the API key: sk-…" pasted into chat; the agent stores it in long-term memory "for next time" and echoes it into a debug log.

## Anti-patterns

- Secrets in `CLAUDE.md` "so the agent can test the API".
- `cat .env` to "check the config".
- Debug logging of full HTTP requests with headers.
- Deleting a leaked key from the transcript but not rotating it.

## Checklist

- [ ] Credentials injected at the tool boundary; model never sees values
- [ ] No secrets in prompts, instruction files, skills, memory or committed config
- [ ] Secret files denied to agents
- [ ] Secret scanning on commits, logs, memory and outputs; redaction in place
- [ ] Exposed secrets rotated

