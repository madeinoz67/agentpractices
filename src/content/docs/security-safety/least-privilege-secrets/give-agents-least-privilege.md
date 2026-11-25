---
title: Give agents least-privilege, short-lived, attributable access
description: Give each agent its own identity, only the tools and permissions its task needs, credentials that expire, sandboxed execution, and human approval for high-impact actions — act on behalf of a user with that user's rights, never a generic admin.
id: BP-0032
domain: D.SEC.PRV
type: guideline
roles: [orchestrator, implementer, any]
stage: [plan, build, operate]
status: draft
version: 1.0.1
updated: 2026-11-25
reviewed: 2026-11-25
review_by: 2027-05-25
related: [BP-0033, BP-0013, BP-0021, BP-0023, BP-0005]
sources:
  - { title: OWASP LLM03:2026 Excessive Agency, url: https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/ }
  - { title: MCP Specification — Security best practices (scope minimization), url: https://modelcontextprotocol.io/specification/latest/basic/security_best_practices }
---

## Rules

### Functionality

1. **MUST** give an agent only the tools its task needs. Remove tools, MCP servers and skills it does not use; a read task gets read-only tools.
2. **SHOULD** prefer narrow tools (create a ticket in project X) over open-ended ones (run any shell command, fetch any URL); where an open-ended tool is unavoidable, constrain it with allow-lists and permission rules.

### Permissions and identity

3. **MUST** give each agent (and each worker in a multi-agent run) its own identity, so every action is attributable and revocable on its own.
4. **MUST** scope each credential to the resources and operations the task needs (read-only where possible, one project, one bucket, one database schema) and enforce that scope in the downstream system, not in the prompt.
5. **MUST** act on behalf of a user with that user's own permissions (delegated OAuth with minimum scopes), never with a shared high-privilege service identity.
6. **MUST** use short-lived credentials that expire with the task or session, and revoke them when the task ends.
7. **MUST NOT** give agents standing production admin rights. Use just-in-time elevation with approval for the specific action, and drop it afterwards.

### Execution and approval

8. **MUST** run agents that execute code or commands in a sandbox: limited filesystem paths, no network or an egress allow-list, no access to credential stores or other users' data.
9. **MUST** require human approval for high-impact actions — deleting data, changing access, sending external messages, spending money, deploying to production — enforced by the harness or the downstream system, not by instructions alone ([BP-0021](/agent-engineering/tool-use/use-hooks-for-deterministic-control/)).
10. **SHOULD** rate-limit and cap agent actions (number of changes, spend, messages) so a malfunction or injection has bounded impact.
11. **SHOULD** log every privileged action with agent identity, user on whose behalf, approval, and outcome, and review access regularly.

## When to apply

Every agent with tools, credentials or the ability to act. The usual root causes of damaging agent behaviour are excessive functionality, excessive permissions and excessive autonomy; these rules cut each one.

## Examples

| Agent | Over-privileged | Least privilege |
| --- | --- | --- |
| Inbox summariser | Mail API with read, send, delete | Read-only OAuth scope; no send tool |
| Coding agent | Personal token with org admin | Fine-grained token: one repo, contents + PRs, 8-hour expiry; push to `main` denied |
| SCCM report agent | Domain admin service account | Read-only SQL login to reporting views; runs in a sandbox with no outbound internet |
| Deploy step | Agent holds prod credentials | Agent opens a change; pipeline deploys after human approval |

## Anti-patterns

- One shared API key for every agent.
- Agents running as the developer's full account "because it is easier".
- "Do not delete anything" in the prompt instead of a read-only credential.
- Credentials that never expire.

## Checklist

- [ ] Only needed tools enabled; narrow tools preferred
- [ ] Own identity per agent; scope enforced downstream
- [ ] On-behalf-of with user's rights; no shared admin
- [ ] Short-lived credentials; JIT elevation with approval
- [ ] Sandboxed execution; high-impact actions approved; actions capped and logged

## References

- [OWASP LLM03:2026 Excessive Agency](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/)
- [MCP Security best practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices)
