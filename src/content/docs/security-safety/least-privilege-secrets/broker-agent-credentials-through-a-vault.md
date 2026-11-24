---
title: Broker agent credentials through a secrets vault (for example OpenBao)
description: Give every agent role its own vault identity and least-privilege policy; issue short-lived dynamic credentials per task and revoke them at the end; inject values into the tool or process at run time so the model never sees them; hand secrets between processes only by response wrapping; audit every access; and run the vault itself as critical infrastructure agents cannot administer.
id: BP-0063
domain: D.SEC.PRV
type: guideline
roles: [orchestrator, implementer]
stage: [plan, build, operate]
status: draft
version: 1.0.0
updated: 2026-11-24
related: [BP-0032, BP-0033, BP-0062, BP-0055, BP-0046, BP-0040, BP-0060, BP-0044]
sources:
  - { title: OpenBao documentation, url: https://openbao.org/docs/ }
  - { title: OpenBao — Agent (auto-auth, templates, process supervisor), url: https://openbao.org/docs/agent-and-proxy/agent/ }
  - { title: OpenBao — Database secrets engine, url: https://openbao.org/docs/secrets/databases/ }
  - { title: OpenBao 2.6.x release notes, url: https://openbao.org/community/release-notes/2-6-0/ }
  - { title: 'InfoQ — OpenBao 2.7 (governance, licence)', url: https://infoq.com/news/2026/11/vault-fork-openbao-27 }
---

Agents need credentials to do anything useful, and every credential an agent holds is one an injected prompt, a bad plan or a leaked transcript can misuse. A secrets vault turns "a key in an `.env` file the agent can read" into "a short-lived credential, scoped to one task, issued to one identity, logged, and revoked when the task ends".

OpenBao is a good default for self-hosting. It is the community fork of HashiCorp Vault, now under the Linux Foundation's OpenSSF and licensed MPL 2.0. It provides secrets engines (KV, database, PKI, SSH, transit), auth methods, audit devices, and an agent daemon that authenticates and injects secrets for applications.

## Rules

### Identity and policy

1. **MUST** keep agent credentials in a vault, not in repositories, `.env` files, agent instructions, prompts or memory.
2. **MUST** give each agent role (and each sub-agent role) its own vault identity: a workload identity (JWT/OIDC, Kubernetes service account, certificate) or AppRole, never a shared admin or root token ([BP-0062](/agent-engineering/tool-use/scope-sub-agent-tools-and-mcp/)).
3. **MUST** attach a deny-by-default policy per role that grants only the paths and capabilities that role needs (read one database role's credentials, not the whole mount).

### Short-lived, per task

4. **SHOULD** use dynamic secrets wherever the target supports them (databases, cloud accounts, SSH certificates, PKI): created on request, with a lease, and revoked when the task ends. Keep static secrets in a versioned key-value store only where nothing else works, and rotate them.
5. **MUST** keep lifetimes short and bounded: short token and lease TTLs with a hard maximum, and bootstrap credentials (for example an AppRole secret ID) single-use and short-lived.
6. **MUST** revoke at the end of each run, and be able to revoke everything a role or a run holds at once when something goes wrong.

### Keep values out of the model

7. **MUST** inject secret values into the tool, script or process at run time (a wrapper that reads the vault, or the vault agent rendering a file or setting environment variables for a child process), so the model sees names and references, never values ([BP-0033](/security-safety/least-privilege-secrets/keep-secrets-out-of-agent-context/), [BP-0055](/agent-engineering/tool-use/prefer-api-wrapper-scripts-to-mcp/)).
8. **MUST** redact secrets from tool output, logs and traces, and never pass a secret value in a message between agents. When one process must hand a secret to another, use response wrapping: a single-use, short-TTL token that unwraps it once.

### Audit and operate

9. **MUST** enable an audit device, ship its logs off the vault host, tag requests with the agent's run ID where possible, and alert on denials, unusual paths and volume spikes ([BP-0040](/operations/observability/keep-an-audit-trail/)).
10. **MUST NOT** give agents permission to change vault policies, auth methods or audit settings. Administration is for people, with approval.
11. **MUST** run the vault as critical infrastructure: high availability for production, unseal keys split between people or auto-unseal through a KMS or HSM, storage backed up and restores tested ([BP-0060](/operations/backup-recovery/back-up-and-recover-agent-systems/)), version pinned and security releases applied promptly ([BP-0044](/security-safety/supply-chain/vet-and-pin-agent-dependencies/)).

### Choose the vault

12. **SHOULD** choose by where agents run and who operates it:

    | Option | Fits | Trade-off |
    | --- | --- | --- |
    | OpenBao (self-hosted) | Homelab to enterprise; open-source, no vendor licence; dynamic secrets | You run, patch and back it up |
    | HashiCorp / IBM Vault | Organisations already standardised on it | Business Source Licence; enterprise features paid |
    | Cloud secret managers (AWS, Azure, Google) | Agents running in that cloud with workload identity | Per-cloud; fewer dynamic-secret engines |
    | Team password managers with service accounts | Small teams, static secrets | Usually no dynamic secrets or leases |

## When to apply

Any agent that calls APIs, databases, cloud services or infrastructure with credentials; any multi-agent system where roles need different access.

## Examples

Policy for an explorer role (read-only database credentials and one KV path):

```hcl
# author: Stephen Eaton
path "database/creds/reporting-readonly" {
  capabilities = ["read"]
}
path "kv/data/agents/explorer/*" {
  capabilities = ["read"]
}
```

Dynamic database credentials with a short lease:

```bash
# author: Stephen Eaton
bao secrets enable database
bao write database/roles/reporting-readonly \
    db_name=reporting \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="15m" \
    max_ttl="1h"
bao read database/creds/reporting-readonly   # each read creates a new user with its own lease
```

OpenBao Agent authenticating and rendering credentials for a wrapper script, so the coding agent only ever runs `bun scripts/api/report.ts` and never sees the password:

```hcl
# author: Stephen Eaton
auto_auth {
  method "approle" {
    config = {
      role_id_file_path   = "/run/agent/role-id"
      secret_id_file_path = "/run/agent/secret-id"
    }
  }
}

template {
  source      = "/etc/openbao/report-db.ctmpl"
  destination = "/run/agent/report-db.env"
}
```

Check the auth-method and template options against the documentation for the OpenBao version you run.

## Anti-patterns

- One long-lived admin token shared by every agent.
- API keys in `.env` files inside the repository the agent works in.
- An agent printing a credential to "check it works".
- Secrets passed between agents in task messages.
- Static database passwords that never rotate.
- A vault with audit logging off, or one only the agent's own host can read.

## Checklist

- [ ] All agent credentials in the vault; none in repo, env files, prompts or memory
- [ ] One identity and deny-by-default policy per agent role
- [ ] Dynamic, short-lived credentials per task; revoked at run end; mass revocation possible
- [ ] Values injected into tools and processes, never into model context; output redacted
- [ ] Response wrapping for any secret handoff
- [ ] Audit device on, logs shipped and alerted on; agents cannot administer the vault
- [ ] Vault run as critical infrastructure: HA, unseal plan, backups, patched

## References

- [OpenBao documentation](https://openbao.org/docs/)
- [OpenBao — Agent](https://openbao.org/docs/agent-and-proxy/agent/)
- [OpenBao — Database secrets engine](https://openbao.org/docs/secrets/databases/)
- [OpenBao 2.6.x release notes](https://openbao.org/community/release-notes/2-6-0/)
