---
title: Back up agent systems and keep backups out of agents' reach
description: Back up the data agents touch and the agent state you cannot rebuild (memory, knowledge graphs, workflow state, instructions, skills, gateway config, evals); keep at least one copy offline or immutable that agent credentials cannot reach; checkpoint before destructive or bulk operations; set recovery objectives per data class; and test restores on a schedule, including the "an agent deleted production" scenario.
id: BP-0060
domain: D.OPS.BDR
type: guideline
roles: [orchestrator, implementer]
stage: [plan, operate]
status: draft
version: 1.0.0
updated: 2026-11-24
reviewed: 2026-11-24
review_by: 2027-05-24
related: [BP-0032, BP-0021, BP-0040, BP-0053, BP-0012, BP-0013, BP-0031, BP-0046, BP-0059]
sources:
  - { title: 'CISA — #StopRansomware Guide', url: https://www.cisa.gov/stopransomware/ransomware-guide }
  - { title: NIST SP 800-34 Rev. 1 — Contingency Planning Guide for Federal Information Systems, url: https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final }
  - { title: 'The Register — Replit deleted user''s production database (July 2025)', url: https://www.theregister.com/2025/07/21/replit_saastr_vibe_coding_incident }
  - { title: AI Incident Database — Incident 1152 (Replit agent, loss of production data), url: https://incidentdatabase.ai/entities/saastr/ }
---

Agents add two things to ordinary backup practice. They hold state that is easy to forget to back up (memory, knowledge graphs, workflow state, the instructions and skills that make them behave), and they hold credentials that can destroy data quickly. In July 2025 a coding agent on Replit deleted a live production database during an explicit code freeze. The platform's response included automatic separation of development and production databases. The agent also wrongly told the user the deletion could not be rolled back.

## Rules

### Know what to protect

1. **MUST** inventory what needs backing up, in two classes, and record it:

   | Class | Examples | Approach |
   | --- | --- | --- |
   | Must back up (cannot be rebuilt) | Production data agents read or write; long-term memory; knowledge graphs; workflow state and ledgers; audit logs; decision logs; evaluation golden sets | Back up on a schedule with retention |
   | Rebuildable (back up the recipe) | Vector indexes, caches, generated docs | Back up the source and the build steps; test the rebuild |
   | Configuration | AGENTS.md / CLAUDE.md, skills, hooks, MCP config, gateway routes and keys policy, prompts, role/model tables | Keep in version control; back up the repository |
   | Secrets | Provider keys, tokens | Never in backups in plain text; keep an inventory and a re-issue procedure |

2. **MUST** set a recovery point objective (how much data you can lose) and recovery time objective (how long you can be down) per data class, and choose backup frequency and method to meet them.

### Keep backups out of agents' reach

3. **MUST** keep at least one copy offline or immutable (object lock, write-once retention) that agent credentials, and the credentials on any machine an agent runs on, cannot modify or delete. Backups reachable with everyday credentials can be destroyed along with the data, whether by an attacker or by an agent.
4. **MUST** separate environments: agents work against development or staging data by default; production access is separate, explicit, least-privilege and logged ([BP-0032](/security-safety/least-privilege-secrets/give-agents-least-privilege/)).
5. **MUST** checkpoint before destructive or bulk operations: commit or branch, take a database or volume snapshot, export the records about to change. The agent checks the checkpoint exists before proceeding.
6. **MUST** block or gate destructive commands in configuration, not only in instructions: deny rules, hooks and approvals for deletes, drops, truncates, force pushes and bulk updates ([BP-0021](/agent-engineering/tool-use/use-hooks-for-deterministic-control/)). Prefer soft delete (move to a holding area, trash, a `_to_delete/` folder) over permanent deletion.
7. **MUST** protect version control: branch protection on main, no force push, required review, so an agent cannot rewrite shared history.

### Prove you can restore

8. **MUST** test restores on a schedule (for example monthly for critical data, quarterly otherwise) and after any change to storage, credentials or the backup tool: restore to a separate location, check integrity and content, and record the time taken against the recovery time objective.
9. **SHOULD** check backup integrity routinely (repository checks, reading a sample of the data back), and alert when a backup job fails or has not run.
10. **MUST** exercise the agent scenarios, not only hardware loss: "an agent deleted production data", "an agent corrupted memory or the knowledge graph", "an agent's credentials were stolen".
11. **SHOULD** keep agent memory and knowledge graphs versioned so they can be restored to a point before bad data entered, and use provenance to find what else it touched ([BP-0053](/multi-agent-systems/coordination-handoff/prevent-error-amplification/)).

### Recover safely

12. **MUST** keep a recovery runbook written for people, stored where it survives the outage, with owners and contacts.
13. **MUST** have a person approve restores to production. An agent may prepare and run steps, but its claims about what can or cannot be recovered are checked, not trusted ([BP-0059](/agent-engineering/workflow/validate-with-proof-not-claims/)).
14. **SHOULD** after recovery, record what happened, which controls failed, and turn the gap into a check, a deny rule or a test ([BP-0040](/operations/observability/keep-an-audit-trail/)).

## When to apply

Any agent with write access to data, files, repositories or infrastructure, and any agent system with memory, knowledge graphs or workflow state you would not want to lose.

## Examples

Deny rules for destructive commands (Claude Code `settings.json`):

```json
{
  "permissions": {
    "deny": [
      "Bash(rm -rf *)",
      "Bash(git push --force *)",
      "Bash(git push -f *)",
      "Bash(dropdb *)"
    ],
    "ask": ["Bash(git reset --hard *)", "Bash(terraform destroy *)"]
  }
}
```

Pattern rules like these catch common forms only; compound commands and scripts can get around them, so pair them with least-privilege credentials and backups the agent cannot reach.

Restore test (restic):

```bash
# author: Stephen Eaton
# monthly restore test: restore latest snapshot to scratch, verify, time it
set -euo pipefail
start=$(date +%s)
restic check --read-data-subset=5%
restic restore latest --target /tmp/restore-test
test -s /tmp/restore-test/data/memory/export.jsonl
echo "restore ok in $(( $(date +%s) - start ))s" | tee -a restore-tests.log
rm -rf /tmp/restore-test
```

## Anti-patterns

- Backups on a share the agent's account can write to.
- Agents pointed at production "just for this task".
- Vector indexes backed up, but not the documents or the steps to rebuild them.
- Memory and knowledge graphs with no backup and no history.
- Backups that have never been restored.
- Believing the agent when it says the data cannot be recovered.

## Checklist

- [ ] Inventory of must-back-up, rebuildable, config and secrets, with RPO/RTO per class
- [ ] One copy offline or immutable, out of agent credentials' reach
- [ ] Dev/prod separated; production access explicit and logged
- [ ] Checkpoint before destructive or bulk operations; destructive commands gated in config
- [ ] Branch protection; no force push
- [ ] Scheduled restore tests, timed; integrity checks and failure alerts
- [ ] Agent-specific disaster scenarios exercised; human-approved restores; runbook

## References

- [CISA — #StopRansomware Guide](https://www.cisa.gov/stopransomware/ransomware-guide)
- [NIST SP 800-34 Rev. 1](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final)
- [The Register — Replit production database deletion](https://www.theregister.com/2025/07/21/replit_saastr_vibe_coding_incident)
- [AI Incident Database — Incident 1152](https://incidentdatabase.ai/entities/saastr/)
