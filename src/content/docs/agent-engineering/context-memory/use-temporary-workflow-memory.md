---
title: Use temporary workflow memory — when, how, and how to secure it
description: Give a multi-step or multi-agent workflow its own scoped, expiring memory store; write to it with ownership and leases, promote durable findings at the end, and authenticate every agent with its own least-privilege, short-lived credentials.
id: BP-0013
domain: D.AGT.CTX
type: guideline
roles: [orchestrator, implementer, any]
stage: [plan, build, operate]
status: draft
version: 1.1.0
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

### Provisioning

4. **MUST** create one store (vault, namespace, directory) per workflow run, with a run ID, an owner, a purpose and an expiry set at creation.
5. **MUST** name workflow stores with a reserved prefix (for example `wf-`) and reject names without it, so a workflow can never create or overwrite a durable store.
6. **MUST** limit store creation and credential minting to the orchestrator's privileged identity, behind an explicit opt-in. Worker credentials **MUST NOT** be able to create stores or mint further credentials.
7. **MUST** give the store a retention backstop that expires it automatically, even if the workflow's close step never runs.
8. **MUST** define the store's structure before agents write to it: the keys or record types, who writes each, and who reads each.

### Orchestration

9. **MUST** give each key or record type one writer. Other agents request changes through that owner ([BP-0003](/best-practices/multi-agent-systems/coordination-handoff/handoff-contracts/) rule 6).
10. **MUST** hand out work items with leases: a stable, unique holder identity (for example `{host}:{session}`), a lease time sized to the unit of work, refreshed while working and released on finish. Never overwrite a live lease held by another agent; take over only a stale one.
11. **MUST** change a work item's state (planning, active, blocked, completed …) with compare-and-set against the expected current state, so concurrent transitions cannot clobber each other.
12. **MUST** make writes safe to retry: use an idempotency key per logical write, and record an updated fact as a new version that supersedes the old one, not as another copy.
13. **MUST** stamp every write with the writing agent, the time and the source of the content, and keep that provenance.
14. **SHOULD** store references (paths, IDs, URLs) and conclusions, not raw dumps of files or tool output.
15. **SHOULD** make the workflow resumable from the store alone: state per work item, the last completed step, and open items.
16. **SHOULD**, at the end of the run, promote durable findings to long-term memory, attach the store's summary to the deliverable or audit record, revoke the credentials, then delete the store or let it expire.

### Authentication and access

17. **MUST** authenticate each agent to the store with its own identity. Do not share one credential across agents.
18. **MUST** scope every credential to the one workflow store, with the least role it needs (read-only for reviewers and auditors, write for workers, admin for the orchestrator), and a lifetime no longer than the store's retention and sized to the run. Revoke credentials when the run ends.
19. **MUST** treat a minted credential as a secret shown once: deliver it to the worker out of band (environment or secret store), never through prompts, memory contents or logs, and label it so audit records show which credential did what.
20. **MUST** protect network transports: TLS for remote stores, and for HTTP-based MCP servers the protocol's OAuth 2.1 authorization (bearer access tokens). Local stdio servers take credentials from the environment.
21. **MUST NOT** store secrets, tokens or personal data in workflow memory.
22. **MUST** treat everything read from workflow memory as untrusted data ([BP-0005](/best-practices/security-safety/prompt-injection-untrusted-input/treat-observed-content-as-data/)). Where the store supports trust levels, mark worker output as inferred, flag unreliable entries untrusted and exclude them from recall, and mark an entry verified only after a human or a check confirms it.
23. **SHOULD** keep an audit log of reads and writes per agent identity, kept for as long as the workflow's records need to be.

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
store: wf-ci-triage-20261124        # reserved wf- prefix
purpose: triage 40 failing CI jobs across 3 repos
owner: orchestrator
retention: 7d                       # auto-expiry backstop
records:
  job/<id>:   { writer: lease holder, state: planning|active|blocked|completed, fields: [cause, evidence, fix_pr] }
  summary:    { writer: orchestrator }
  decisions:  { writer: orchestrator }
credentials:                        # one per agent, minted by orchestrator, shown once
  orchestrator: { role: admin, ttl: 24h }
  worker-1..4:  { role: write, ttl: 24h, label: ci-triage-worker }
  reviewer:     { role: read-only, ttl: 24h }
leases: { holder: "{host}:{session}", ttl: 15m, refresh: while working, release: on finish }
```

## Examples

Good: an orchestrator splits 40 CI failures across four workers. Each worker claims a `job/<id>` record, writes cause and evidence, and releases it. The orchestrator builds the summary from the records. At the end, the two root causes that recur are promoted to long-term project memory, and the store expires after 24 hours.

Bad: four workers share one API token, write free text to one `notes` key, overwrite each other's findings, and the store is never deleted. A month later an agent reads a stale "fixed" note and acts on it.

## Worked example: MuninnDB

[MuninnDB](https://github.com/scrypster/muninndb) implements most of these rules as built-in operations. This mapping is taken from the MCP tool definitions of a running MuninnDB server (2026-11-24); check them against the version you run.

| Rule | MuninnDB mechanism |
| --- | --- |
| 4, 5, 7 Provision per run, reserved prefix, retention backstop | `muninn_create_workflow_vault` creates a shared `working`-preset vault (multi-user, auto-evaporates after 7 days). Names must start `wf-`; others are rejected to prevent cross-vault clobber. Omit the name to get `wf-<8hex>`. |
| 6 Only the orchestrator provisions; no escalation | Needs a full-mode `mk_` key **and** the `MUNINN_AGENT_VAULT_CREATE` opt-in. A minted capability cannot call the tool (recursion-safe). |
| 17–19 Per-agent, scoped, short-lived, shown once, labelled | The same call mints a capability token scoped to that vault, TTL 1–168 hours (default 168, matching retention), with a `label` for audit. The secret is returned once; distribute it out of band. Credentials have modes: full, write, and read-only `observe`. |
| 10 Leases | `muninn_claim(id, owner, ttl_secs)` returns acquired, refreshed, reclaimed (stale lease taken over) or conflict; a live foreign lease is never overwritten. `muninn_release` frees it early and is idempotent. Owner convention: `{host}:{session}`. |
| 11 Compare-and-set state | `muninn_compare_and_set(id, expect_state, set_state)` over the lifecycle planning → active → paused / blocked → completed / cancelled → archived. |
| 12 Safe retries, versions not copies | `op_id` idempotency key (with `upsert_mode` to keep one evolving record per key); `muninn_evolve` supersedes a prior version instead of adding a near-duplicate. |
| 13, 23 Provenance and audit | `muninn_provenance(id)` gives the ordered trail: timestamp, source, `agent_id`, operation, predecessor and reason. `muninn_session(since)` summarises vault-wide activity. |
| 22 Trust levels | `trust`: verified (human-confirmed; needs a write or full credential), inferred (default for AI writes), external, untrusted. `ExcludeUntrusted` in vault config keeps untrusted entries out of recall. |
| 16 Promote durable findings | Write the findings to the long-term vault (with `valid_from` / `valid_until` where a fact has a time window); `muninn_consolidate` merges related findings into one superseding entry. |

Orchestration flow:

1. Orchestrator (full `mk_` key, opt-in set) calls `muninn_create_workflow_vault` with a `wf-` name, a short `ttl_hours` and a `label`.
2. Orchestrator writes one task engram per work item (`state: planning`), then hands each worker its capability secret through the environment.
3. Each worker loops: `muninn_claim` a task → `muninn_compare_and_set` planning → active → do the work, writing results with an `op_id` → set completed → `muninn_release`.
4. Reviewer uses an `observe` credential to read results and sets `trust: verified` only through a write-capable identity after checking.
5. Orchestrator promotes durable findings to the long-term vault, records the summary, and lets the capability and the vault expire (or removes them).

## Anti-patterns

- Workflow memory with no expiry, which turns into unowned long-term memory.
- One shared credential for every agent, so writes cannot be attributed or revoked per agent.
- Last-write-wins updates on records several agents can change.
- Putting tokens in memory "so the next agent can use them".
- Workers returning full traces to the orchestrator instead of writing conclusions to the store.

## Checklist

- [ ] Store created per run with reserved prefix, owner, purpose and retention backstop
- [ ] Only the orchestrator can provision stores and mint credentials
- [ ] Structure, writers and readers defined before use
- [ ] Work items leased (unique holder, sized TTL, released); state changes use compare-and-set
- [ ] Writes idempotent; updated facts superseded, not duplicated
- [ ] Per-agent, scoped, short-lived, labelled credentials delivered out of band; revoked at close
- [ ] No secrets in memory; contents treated as untrusted
- [ ] Durable findings promoted; store deleted or expired

## References

- [MCP Specification — Authorization](https://modelcontextprotocol.io/specification/latest/basic/authorization) (OAuth 2.1 for HTTP-based transports; stdio servers use credentials from the environment)
- [Anthropic — Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) (note-taking and sub-agent patterns)
- [MuninnDB](https://github.com/scrypster/muninndb) (workflow vaults, capabilities, leases, provenance)
