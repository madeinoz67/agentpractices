---
title: Prefer targeted API wrapper scripts to MCP servers for narrow, repeated work
description: When an agent with a shell needs a few fixed operations on an API, give it a small, tested wrapper script (or an existing CLI) that returns compact, filtered output, instead of a broad MCP server; keep MCP where it earns its place — managed OAuth, dynamic discovery, clients without a shell, or shared governed access.
id: BP-0055
domain: D.AGT.TOOL
type: guideline
roles: [implementer, orchestrator]
stage: [plan, build]
status: draft
version: 1.0.0
updated: 2026-11-24
reviewed: 2026-11-24
review_by: 2027-05-24
related: [BP-0022, BP-0023, BP-0001, BP-0018, BP-0032, BP-0033, BP-0005, BP-0041]
sources:
  - { title: Anthropic Engineering — Code execution with MCP, url: https://www.anthropic.com/engineering/code-execution-with-mcp }
  - { title: Mario Zechner — What if you don't need MCP at all?, url: https://mariozechner.at/posts/2025-11-02-what-if-you-dont-need-mcp/ }
  - { title: Simon Willison — Too many MCPs, url: https://simonwillison.net/2025/Aug/22/too-many-mcps/ }
  - { title: Checkly — CLIs are more token-efficient than MCP. Or are they?, url: https://www.checklyhq.com/blog/mcp-vs-cli-token-efficiency/ }
  - { title: Claude Code docs — Permissions, url: https://code.claude.com/docs/en/permissions }
---

Direct MCP tool calls have two costs. Tool definitions sit in the context, and every intermediate result passes through the model, which often copies it into the next call. Anthropic's example of moving that work into code cut token use from about 150,000 to 2,000. A small script the agent runs from its shell avoids both costs for the operations it covers. It composes with other tools (`| jq`, files), and frontier models already know common CLIs such as `gh`.

The picture is not one-sided. Deferred tool loading (tool search) removes most of the definitions cost of idle MCP servers, and a server with a handful of well-designed tools is cheap. The strongest case for scripts is the *results* cost and narrow, repeated work.

## Rules

### Choose

1. **MUST** decide per integration, not by habit:

   | Use a wrapper script or existing CLI when | Keep an MCP server when |
   | --- | --- |
   | The agent needs a few fixed operations | The tool set must be discovered at run time |
   | Results are large and need filtering, joining or aggregating | The server manages OAuth sign-in and token refresh you would otherwise hand-roll |
   | Output feeds other tools, files or scripts | The client has no shell or code execution (chat apps, some IDE agents) |
   | A well-known CLI already exists (`gh`, `az`, `kubectl`, `aws`) | One governed server is shared by many agents or users, with central auth, audit and policy |
   | Behaviour must be deterministic and testable | The vendor's server offers capabilities its API or CLI does not |

2. **SHOULD** check whether the vendor's CLI and MCP server actually offer the same features before choosing; they often differ.

### Build the wrapper well

3. **MUST** give each wrapper one job and a small interface: a few flags, concise `--help`, input validation, and an explicit result shape ([BP-0001](/software-engineering/cli-design/design-clis-for-agents/)).
4. **MUST** return compact, structured output: only the fields the agent needs, a default limit with a hard maximum, filtering done server-side or in the script. For large data, write to a file and return the path and a summary.
5. **MUST** fail clearly: non-zero exit code, a one-line error on stderr, nothing half-printed on stdout.
6. **MUST** make wrappers read-only by default. Writes need an explicit flag or a separate script, support `--dry-run`, are idempotent where possible, and go through the same approval as any other side effect.
7. **MUST** take credentials from the environment or a secret manager at run time, scoped to least privilege, and never print, log or echo them ([BP-0032](/security-safety/least-privilege-secrets/give-agents-least-privilege/), [BP-0033](/security-safety/least-privilege-secrets/keep-secrets-out-of-agent-context/)).
8. **MUST** test each wrapper against the real API (or a recorded fixture of it) before agents rely on it, and pin the API version it targets. Re-test when the API changes.

### Make it usable and safe

9. **SHOULD** make wrappers discoverable without loading them all: list them in AGENTS.md or package them in a skill whose one-line description loads first and whose body explains usage on demand ([BP-0018](/agent-engineering/skills-reusable-procedures/author-agent-skills/)).
10. **MUST** treat wrappers as code: keep them in version control, review changes, pin dependencies, and allow-list them narrowly in the agent's permissions rather than allowing the whole shell.
11. **MUST** treat wrapper output as untrusted data, exactly like MCP tool output ([BP-0005](/security-safety/prompt-injection-untrusted-input/treat-observed-content-as-data/)).
12. **SHOULD**, where you keep MCP servers, scope them per project, enable deferred tool loading, and remove tools you do not use ([BP-0022](/agent-engineering/tool-use/configure-mcp-servers-at-the-right-scope/), [BP-0023](/agent-engineering/tool-use/use-mcp-servers-safely/)).
13. **SHOULD** measure the switch: tokens and success rate per task before and after ([BP-0041](/operations/cost-performance/budget-and-control-agent-cost/)).

## When to apply

Coding and operations agents that have a shell, when adding or reviewing an integration with an external API.

## Examples

Read-only wrapper (Bun). It returns open issues as compact JSON, using the search API so the limit counts issues rather than pull requests:

```ts
// author: Stephen Eaton
// gh-issues.ts — list open issues as compact JSON for agents (read-only).
// usage: bun gh-issues.ts <owner/repo> [--label name] [--limit 20]
import { parseArgs } from 'node:util';

const { positionals, values } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: { label: { type: 'string' }, limit: { type: 'string', default: '20' }, help: { type: 'boolean' } },
});
const repo = positionals[0];
if (values.help || !repo?.includes('/')) {
  console.error('usage: gh-issues <owner/repo> [--label name] [--limit N≤100]  → JSON [{number,title,labels,updated,url}]');
  process.exit(values.help ? 0 : 2);
}
const limit = Math.min(Math.max(Number(values.limit) || 20, 1), 100);
// Search API so pull requests are excluded server-side and the limit means issues.
const q = [`repo:${repo}`, 'is:issue', 'is:open', ...(values.label ? [`label:"${values.label}"`] : [])].join(' ');
const qs = new URLSearchParams({ q, sort: 'updated', per_page: String(limit) });
const res = await fetch(`https://api.github.com/search/issues?${qs}`, {
  headers: {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
  },
});
if (!res.ok) { console.error(`github: ${res.status} ${res.statusText}`); process.exit(1); }
const { items } = (await res.json()) as { items: any[] };
console.log(JSON.stringify(items.map((i) => ({ number: i.number, title: i.title, labels: i.labels.map((l: any) => l.name), updated: i.updated_at.slice(0, 10), url: i.html_url }))));
```

```bash
$ bun scripts/api/gh-issues.ts oven-sh/bun --label bug --limit 2
[{"number":49552,"title":"`bun build --dts` fails …","labels":["bug","typescript","bundler"],"updated":"2026-11-24","url":"…"}, …]
```

Testing it against the real API found a bug in the first version: the issues endpoint also returns pull requests, so a limit of 3 returned nothing on a busy repository. That is the case for rule 8.

Narrow permission allow-list (Claude Code `settings.json`):

```json
{
  "permissions": {
    "allow": ["Bash(bun scripts/api/gh-issues.ts *)"],
    "ask": ["Bash(bun scripts/api/gh-issue-create.ts *)"]
  }
}
```

AGENTS.md entry:

```markdown
## API helpers (scripts/api/)
- `gh-issues.ts <owner/repo> [--label L] [--limit N]` — open issues as JSON (read-only)
- `gh-issue-create.ts` — creates an issue; needs approval; supports --dry-run
Prefer these to the GitHub MCP server for these operations.
```

## Anti-patterns

- A 40-tool MCP server loaded in every session to read one list.
- Passing a 50,000-token API response through the model to pick out five rows.
- A wrapper that dumps the raw API response, unbounded.
- Wrappers with write access by default, or a token in the script.
- Allowing `Bash(*)` so the agent can run one helper.
- Rebuilding OAuth refresh by hand when a maintained MCP server already handles it.

## Checklist

- [ ] Choice made per integration against the table
- [ ] Wrapper: one job, small interface, compact bounded output, clear errors
- [ ] Read-only by default; writes flagged, dry-run, approved
- [ ] Credentials injected, scoped, never printed
- [ ] Tested against the real API; API version pinned
- [ ] Discoverable via AGENTS.md or a skill; narrowly allow-listed; output treated as untrusted
- [ ] Remaining MCP servers scoped and deferred; tokens and success measured

## References

- [Anthropic — Code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [Mario Zechner — What if you don't need MCP at all?](https://mariozechner.at/posts/2025-11-02-what-if-you-dont-need-mcp/)
- [Simon Willison — Too many MCPs](https://simonwillison.net/2025/Aug/22/too-many-mcps/)
- [Checkly — CLIs are more token-efficient than MCP. Or are they?](https://www.checklyhq.com/blog/mcp-vs-cli-token-efficiency/)
- [Claude Code — Permissions](https://code.claude.com/docs/en/permissions)
