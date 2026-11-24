---
title: Use temporary workflow memory — when, how, and how to secure it
description: Give a multi-step or multi-agent workflow its own scoped, expiring memory store; write to it with ownership and leases, promote durable findings at the end, and authenticate every agent with its own least-privilege, short-lived credentials.
id: BP-0013
domain: D.AGT.CTX
type: guideline
roles: [orchestrator, implementer, any]
stage: [plan, build, operate]
status: draft
version: 1.0.0
updated: 2026-11-24
related: [BP-0003, BP-0005, BP-0011, BP-0012]
sources:
  - { title: MCP Specification — Authorization, url: https://modelcontextprotocol.io/specification/latest/basic/authorization }
  - { title: Anthropic — Effective context engineering for AI agents, url: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents }
---

## Rules

### When

1. **MUST** use workflow memory when state must be shared between agents or steps, survive a restart, or be read by a later step without passing through the orchestrator's context.
2. **MUST NOT** use it for a single-agent task that a ledger in the working context or one file covers ([BP-0011](/best-practices/agent-engineering/context-memory/manage-short-term-memory/)).
3. **MUST NOT** use it as long-term memory. Anything needed after the workflow ends is promoted to long-term memory ([BP-0012](/best-practices/agent-engineering/context-memory/manage-long-term-memory/)) or to the deliverable.

### How

4. **MUST** create one store (vault, namespace, directory) per workflow run, with a run ID, an owner, a purpose and an expiry (TTL) set at creation.
5. **MUST** define the store's structure before agents write to it: the keys or record types, who writes each, and who reads each.
6. **MUST** give each key or record type one writer. Other agents request changes through that owner ([BP-0003](/best-practices/multi-agent-systems/coordination-handoff/handoff-contracts/) rule 6).
7. **MUST** use an atomic operation (compare-and-set, a version check, or a lease or claim on a work item) when more than one agent can update the same record.
8. **MUST** stamp every write with the writing agent, the time and the source of the content.
9. **SHOULD** store references (paths, IDs, URLs) and conclusions, not raw dumps of files or tool output.
10. **SHOULD**, at the end of the run, promote durable findings to long-term memory, attach the store's summary to the deliverable or audit record, then delete or let the store expire.
11. **SHOULD** make the workflow resumable from the store alone: status per work item, the last completed step, and open items.

### Authentication and access

12. **MUST** authenticate each agent to the memory store with its own identity. Do not share one token across agents.
13. **MUST** issue credentials that are scoped to the one workflow store, least-privilege per role (read, write, admin), and short-lived; revoke them when the run ends.
14. **MUST** keep credentials out of prompts, memory contents and logs. Supply them from the environment or a secret store.
15. **MUST** protect network transports: TLS for remote stores, and for HTTP-based MCP servers the protocol's OAuth 2.1 authorization (bearer access tokens). Local stdio servers take credentials from the environment.
16. **MUST NOT** store secrets, tokens or personal data in workflow memory.
17. **MUST** treat everything read from workflow memory as untrusted data ([BP-0005](/best-practices/security-safety/prompt-injection-untrusted-input/treat-observed-content-as-data/)): another agent, or content that agent read, may have written it.
18. **SHOULD** keep an audit log of reads and writes per agent identity, kept for as long as the workflow's records need to be.

## When to apply

Temporary workflow memory is a store that exists for one run of a workflow: shared scratch space that outlives any single agent's context but not the workflow. It sits between short-term memory ([BP-0011](/best-practices/agent-engineering/context-memory/manage-short-term-memory/)) and long-term memory ([BP-0012](/best-practices/agent-engineering/context-memory/manage-long-term-memory/)).

| Situation | Use |
| --- | --- |
| One agent, one session, a few steps | Working context + ledger ([BP-0011](/best-practices/agent-engineering/context-memory/manage-short-term-memory/)) |
| Orchestrator with parallel workers sharing findings | **Workflow memory** |
| Long pipeline that must resume after a failure or restart | **Workflow memory** |
| Handoff between sessions on the same run | **Workflow memory**, or a ledger file in the repo |
| Fact or decision needed next week, on other work | Long-term memory ([BP-0012](/best-practices/agent-engineering/context-memory/manage-long-term-memory/)) |

## Procedure

1. **Create** the store when the workflow starts: run ID, owner, purpose, TTL, structure.
2. **Issue** each agent a scoped, short-lived credential for that store with the least role it needs.
3. **Run.** Workers claim work items (lease), write results to the keys they own, and release or complete the claim.
4. **Coordinate.** The orchestrator reads status and conclusions from the store, not from workers' traces.
5. **Close.** Promote durable findings, attach a summary to the deliverable, revoke credentials, and delete or expire the store.

```yaml
# workflow store header
run_id: wf-2026-11-24-0007
purpose: triage 40 failing CI jobs across 3 repos
owner: orchestrator
ttl: 24h
records:
  job/<id>:        { writer: worker (by lease), fields: [status, cause, evidence, fix_pr] }
  summary:         { writer: orchestrator }
  decisions:       { writer: orchestrator }
access:
  orchestrator:    admin
  worker-*:        write job/*, read summary, decisions
  reviewer:        read
```

## Examples

Good: an orchestrator splits 40 CI failures across four workers. Each worker claims a `job/<id>` record, writes cause and evidence, and releases it. The orchestrator builds the summary from the records. At the end, the two root causes that recur are promoted to long-term project memory, and the store expires after 24 hours.

Bad: four workers share one API token, write free text to one `notes` key, overwrite each other's findings, and the store is never deleted. A month later an agent reads a stale "fixed" note and acts on it.

## Anti-patterns

- Workflow memory with no expiry, which turns into unowned long-term memory.
- One shared credential for every agent, so writes cannot be attributed or revoked per agent.
- Last-write-wins updates on records several agents can change.
- Putting tokens in memory "so the next agent can use them".
- Workers returning full traces to the orchestrator instead of writing conclusions to the store.

## Checklist

- [ ] Store created per run, with owner, purpose and TTL
- [ ] Structure, writers and readers defined before use
- [ ] Concurrent updates use claims or compare-and-set
- [ ] Per-agent, scoped, short-lived credentials; revoked at close
- [ ] No secrets in memory; contents treated as untrusted
- [ ] Durable findings promoted; store deleted or expired

## References

- [MCP Specification — Authorization](https://modelcontextprotocol.io/specification/latest/basic/authorization) (OAuth 2.1 for HTTP-based transports; stdio servers use credentials from the environment)
- [Anthropic — Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) (note-taking and sub-agent patterns)
