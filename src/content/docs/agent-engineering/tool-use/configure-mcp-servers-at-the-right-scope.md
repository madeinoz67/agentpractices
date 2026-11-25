---
title: Configure MCP servers at the right scope
description: Put each MCP server where its audience is — personal (user), this project only for you (local), the team (project, committed), or the organisation (managed) — with credentials kept out of shared config.
id: BP-0022
domain: D.AGT.TOOL
type: guideline
roles: [implementer, orchestrator, any]
stage: [plan, build, operate]
status: draft
version: 1.0.0
updated: 2026-11-24
reviewed: 2026-11-24
review_by: 2027-05-24
related: [BP-0023, BP-0016, BP-0021, BP-0013]
sources:
  - { title: Claude Code docs — Connect Claude Code to tools via MCP, url: https://code.claude.com/docs/en/mcp }
  - { title: MCP Specification — Authorization, url: https://modelcontextprotocol.io/specification/latest/basic/authorization }
---

## Rules

1. **MUST** choose the scope by who needs the server, not by convenience:

   | Scope | Who gets it | Use for | Claude Code location |
   | --- | --- | --- | --- |
   | **User** | You, in every project | Personal tools you use everywhere (your memory store, notes, personal calendar) | `~/.claude.json` (`--scope user`) |
   | **Local** (default) | You, in this project only | Experiments, personal credentials for a project service, servers you have not reviewed for the team | `~/.claude.json` under the project path (`--scope local`) |
   | **Project** | Everyone who clones the repo | Servers the project needs to be worked on (its database, issue tracker, code index) | `.mcp.json` at repo root, committed (`--scope project`) |
   | **Managed** | Everyone in the organisation | Approved corporate servers; allow/deny policy | Managed settings / `managed-mcp.json` |

2. **MUST NOT** put secrets in `.mcp.json` or any committed config. Reference them as environment variables (`${API_KEY}`) supplied by each user's environment or secret store, or use the server's OAuth sign-in.
3. **MUST** review a project-scoped server like code before committing it: it will be offered to everyone who opens the repo.
4. **MUST** give the same server one definition. When a name is defined in several scopes, the highest-precedence definition wins whole (Claude Code: local, then project, then user, then plugin, then connectors, with organisation-managed above all), so duplicates silently shadow each other.
5. **SHOULD** make `.mcp.json` portable: no absolute paths to one person's machine, `${VAR:-default}` for URLs that differ by environment, and a README or `AGENTS.md` line saying which variables each server needs.
6. **SHOULD** prefer the HTTP transport for remote servers and stdio for local processes; avoid deprecated transports (SSE) where HTTP is available.
7. **SHOULD**, in organisations, publish approved servers through managed configuration and restrict which others may be added.
8. **SHOULD** remove servers that are no longer used; every configured server adds tools, startup time and attack surface.
9. **MAY** keep a personal override of a project server at local scope (for example pointing at your own test instance), knowing it shadows the project definition for you.

## When to apply

Adding, sharing or auditing MCP servers for any MCP client. Locations above are for Claude Code; other clients have equivalent user, workspace and organisation scopes — check their docs.

## Examples

```bash
# Personal, everywhere
claude mcp add --scope user --transport stdio notes -- notes-mcp-server
# Team, committed in .mcp.json
claude mcp add --scope project --transport http issues https://issues.example.com/mcp
# Just me, this project (default)
claude mcp add --transport http staging-db https://staging.example.com/mcp
```

`.mcp.json` (committed):

```json
{
  "mcpServers": {
    "issues": {
      "type": "http",
      "url": "${ISSUES_URL:-https://issues.example.com}/mcp",
      "headers": { "Authorization": "Bearer ${ISSUES_TOKEN}" }
    },
    "code-index": { "type": "stdio", "command": "codanna", "args": ["serve", "--watch"] }
  }
}
```

## Anti-patterns

- A personal API key committed in `.mcp.json`.
- The same server added at user and project scope with different settings, so team members get different tools.
- Every experimental server added at user scope, loading into every project.
- Absolute `/Users/alice/…` paths in a shared config.

## Checklist

- [ ] Scope matches audience (user / local / project / managed)
- [ ] No secrets in committed config; variables documented
- [ ] Project servers reviewed before commit
- [ ] One definition per server name
- [ ] Unused servers removed

## References

- [Claude Code — MCP installation scopes](https://code.claude.com/docs/en/mcp)
