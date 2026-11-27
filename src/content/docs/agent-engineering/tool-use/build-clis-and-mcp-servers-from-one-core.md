---
title: Build CLIs and MCP servers from one core, and choose daemon or per-client deliberately
description: Put the logic in one tested library and expose it through thin adapters — a CLI for people and shell-using agents, an MCP server for MCP clients, an MCP App when a UI helps. Target the current MCP specification (2026-07-28, stateless) with an official SDK; design few, task-shaped tools with strict schemas, structured output and errors the model can fix; secure transports and tokens; decide whether the server runs per client over stdio or as a shared daemon; and keep a list of every surface that exposes the core, with a gate for each pair that must stay in step.
id: BP-0073
domain: D.AGT.TOOL
type: guideline
roles: [implementer, reviewer]
stage: [plan, build, verify]
status: draft
version: 1.1.0
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-02-27
related: [BP-0001, BP-0055, BP-0022, BP-0023, BP-0062, BP-0071, BP-0044, BP-0063, BP-0005, BP-0014, BP-0085, BP-0090, BP-0091]
sources:
  - { title: MCP specification 2026-07-28 — changelog, url: https://modelcontextprotocol.io/specification/2026-07-28/changelog }
  - { title: MCP blog — The 2026-07-28 specification, url: https://blog.modelcontextprotocol.io/posts/2026-07-28/ }
  - { title: MCP — Security best practices, url: https://modelcontextprotocol.io/specification/latest/basic/security_best_practices }
  - { title: MCP blog — MCP Apps (official extension), url: https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/ }
  - { title: MCP TypeScript SDK v2 — Tools, url: https://ts.sdk.modelcontextprotocol.io/v2/servers/tools }
---

The same capability often needs three front ends: a CLI people and shell-using agents can run, an MCP server for MCP clients, and sometimes an MCP App that renders a UI in the conversation. An API, a web UI, a TUI and the documentation usually join them. Build the capability once and keep every surface thin, so behaviour, validation, tests and docs do not drift apart. For whether you need MCP at all, see [BP-0055](/agent-engineering/tool-use/prefer-api-wrapper-scripts-to-mcp/); for CLI design rules, [BP-0001](/software-engineering/cli-design/design-clis-for-agents/).

## Rules

### One core, thin adapters

1. **MUST** put the logic, validation and business rules in a library with its own tests. The CLI, the MCP server and any MCP App call it; none of them contains logic of its own.
2. **MUST** keep the adapters consistent: the same names, limits, defaults and error meanings in every front end, tested through each adapter as well as the core.

### Target the current protocol

3. **MUST** build MCP servers on an official, maintained SDK and the current specification (2026-07-28 at the time of writing), pin the SDK version, and re-test on SDK and spec updates.
4. **MUST** design for the stateless core: there are no protocol-level sessions in 2026-07-28, and every request carries its own protocol version and client capabilities. If a tool needs state across calls, return an explicit handle and take it back as an argument.
5. **MUST** treat state handles as data, not credentials: generate them randomly, expire them, bind them server-side to the authenticated user, and reject a handle presented by anyone else.
6. **MUST NOT** build new servers on deprecated features (the HTTP+SSE transport; Roots, Sampling and Logging, deprecated in 2026-07-28). Use Streamable HTTP for remote servers.

### Design tools for models

7. **MUST** offer a few task-shaped tools rather than one tool per API endpoint, named `verb_noun`, each with a description that says what it does, when to use it and when not to.
8. **MUST** declare strict input schemas (types, enums, bounds, formats, defaults) and an output schema, and return structured content that matches it alongside a text form.
9. **MUST** return bad input as a tool error with a message that says what to change, so the model can correct itself. Reserve protocol errors for protocol failures.
10. **MUST** bound results: default limits, pagination, summaries, or a resource link for large content.
11. **MUST** set tool annotations truthfully (read-only, destructive, idempotent). They are hints for clients and approval prompts, not security controls; enforce access in the server.
12. **SHOULD** evaluate tool use with real models: given realistic tasks, does the model pick the right tool and fill the arguments correctly? Fix the description or schema when it does not.

### Secure it

13. **MUST** treat every tool argument as untrusted: validate paths against an allowed root, never build shell commands from arguments, and protect any URL fetch against server-side request forgery. Mark content from outside sources as untrusted in results ([BP-0005](/security-safety/prompt-injection-untrusted-input/treat-observed-content-as-data/)).
14. **MUST**, for remote servers, follow the MCP authorization specification: accept only tokens issued for this server, never pass a client's token through to a downstream API, require per-client consent in proxy servers, and start with minimal scopes, stepping up when a privileged tool is first used.
15. **MUST** keep downstream credentials in a vault or the environment, never in tool results, logs or descriptions ([BP-0063](/security-safety/least-privilege-secrets/broker-agent-credentials-through-a-vault/)).

### Choose: per-client or daemon

16. **MUST** decide how the server runs, and write the choice down:

    | | Per client (stdio, launched by the client) | Daemon (long-running, Streamable HTTP, local or remote) |
    | --- | --- | --- |
    | Lifetime | Starts and stops with the client session | Runs under a service manager (launchd, systemd, a container) |
    | Exposure | No network port; only the parent client can talk to it | A listening endpoint that other processes, users or hosts can reach |
    | State and warm caches | Rebuilt each launch | Shared and kept warm (code indexes, embeddings, connections) |
    | Clients | One | Many, concurrently |
    | Auth | The OS process boundary | Required: tokens or OAuth; local daemons on a Unix socket or loopback with a token |
    | Upgrades and failure | New version on next launch; a crash affects one session | Rolling restarts, health checks, monitoring; a crash affects every client |
    | Fits | Personal tools, workspace-scoped tools, anything touching local files | Expensive start-up, shared indexes, team or remote services |

17. **MUST**, for any daemon: bind to loopback or a Unix socket unless remote access is intended, require authentication even on localhost (other local processes and DNS rebinding can reach it), validate the Origin header for HTTP, run it as a least-privilege service account, and add health checks, logs and a restart policy.
18. **SHOULD** start per-client and move to a daemon only for a measured reason: start-up time, shared warm state or many clients.

### MCP Apps

19. **SHOULD** add an MCP App only when a person needs to see or act on something a text answer cannot show well (a chart, a form, a review table). Declare the UI as a `ui://` resource referenced from the tool's metadata, and always return a usable text or structured result for hosts that do not render UI.
20. **MUST** route any action the UI triggers back through tools with the same validation, authorization and approval as a model-initiated call, keep secrets out of the UI, and declare the smallest set of external origins it needs.

### Ship it

21. **MUST** test through a real client: an in-memory or stdio client in automated tests, and the MCP Inspector or your target clients by hand.
22. **MUST** version and release like any dependency: changelog, signed or pinned releases, and published metadata (for example a registry entry) so users can verify what they install ([BP-0044](/security-safety/supply-chain/vet-and-pin-agent-dependencies/)).

### Every surface, not only the front ends

23. **MUST** list every surface that exposes the core (CLI, MCP server, API, UI, TUI, documentation), and name the generator or the owner of each. A surface with no owner, or one edited by hand where a generator could produce it, is a defect.
24. **MUST** change the surfaces together, and gate every pair that must stay in step: a contract diff for the API ([BP-0071](/software-engineering/api-interface-design/design-and-evolve-api-surfaces/)), a coverage invariant for two versioned surfaces ([BP-0014](/knowledge-modelling/ontology/close-corpus-coverage-gaps/)), a generated-documentation check ([BP-0090](/software-engineering/cli-design/document-a-cli-on-the-web-in-the-terminal-and-in-man-pages/)) and a CLI compatibility check ([BP-0091](/software-engineering/cli-design/evolve-a-cli-without-breaking-its-callers/)). The gate fails the build rather than relying on someone to remember the pair.

## When to apply

Building a CLI, an MCP server or an MCP App, or exposing an existing library or API to agents. Also applies when a change touches any other surface that exposes the same core: an API, a UI, a TUI or the documentation.

## Examples

One core, two adapters (Bun, MCP TypeScript SDK v2). Core:

```ts
// author: Stephen Eaton
// core.ts — the logic. No CLI or MCP code here; both front ends call this.
export type Note = { id: string; title: string; body: string; updated: string };
const notes: Note[] = [
  { id: 'n1', title: 'Change window', body: 'Saturday 02:00-04:00 AWST', updated: '2026-11-20' },
  { id: 'n2', title: 'Backup check', body: 'Restore test passed', updated: '2026-11-22' },
];

export function searchNotes(query: string, limit = 10): Note[] {
  if (!query.trim()) throw new Error('query must not be empty');
  const q = query.toLowerCase();
  return notes.filter((n) => (n.title + ' ' + n.body).toLowerCase().includes(q)).slice(0, limit);
}
```

MCP adapter, served per client over stdio:

```ts
// author: Stephen Eaton
// mcp.ts — thin MCP adapter over the core (TypeScript SDK v2, MCP 2026-07-28).
import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { searchNotes } from './core';

export function buildServer() {
  const server = new McpServer({ name: 'notes', version: '1.0.0' });
  server.registerTool(
    'search_notes',
    {
      description:
        'Search team notes by keyword in title or body. Use for finding change windows, procedures and status notes. Read-only.',
      inputSchema: z.object({
        query: z.string().min(1).describe('Keyword or phrase, e.g. "change window"'),
        limit: z.number().int().min(1).max(50).default(10),
      }),
      outputSchema: z.object({
        notes: z.array(z.object({ id: z.string(), title: z.string(), updated: z.string() })),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ query, limit }) => {
      const output = { notes: searchNotes(query, limit).map(({ id, title, updated }) => ({ id, title, updated })) };
      return { content: [{ type: 'text', text: JSON.stringify(output) }], structuredContent: output };
    },
  );
  return server;
}

if (import.meta.main) {
  const { serveStdio } = await import('@modelcontextprotocol/server/stdio');
  serveStdio(() => buildServer()); // stdio: launched per client, no network port
}
```

CLI adapter over the same core:

```ts
// author: Stephen Eaton
// cli.ts — thin CLI adapter over the same core (see BP-0001 for CLI rules).
import { parseArgs } from 'node:util';
import { searchNotes } from './core';

const { positionals, values } = parseArgs({
  args: Bun.argv.slice(2), allowPositionals: true,
  options: { limit: { type: 'string', default: '10' }, json: { type: 'boolean' } },
});
try {
  const res = searchNotes(positionals.join(' '), Number(values.limit));
  console.log(values.json ? JSON.stringify(res) : res.map((n) => `${n.id}\t${n.title}`).join('\n'));
} catch (e) {
  console.error(`notes: ${(e as Error).message}`);
  process.exit(2);
}
```

Test through an in-memory client:

```ts
import { test, expect } from 'bun:test';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { buildServer } from './mcp';

async function connect() {
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await buildServer().connect(serverT);
  const client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(clientT);
  return client;
}

test('lists the tool with its annotations', async () => {
  const c = await connect();
  const { tools } = await c.listTools();
  expect(tools.map((t) => t.name)).toEqual(['search_notes']);
  expect(tools[0].annotations?.readOnlyHint).toBe(true);
});
test('returns structured content', async () => {
  const c = await connect();
  const r: any = await c.callTool({ name: 'search_notes', arguments: { query: 'change' } });
  expect(r.structuredContent.notes[0].id).toBe('n1');
});
test('bad input comes back as a tool error the model can fix', async () => {
  const c = await connect();
  const r: any = await c.callTool({ name: 'search_notes', arguments: { query: 'x', limit: 500 } });
  expect(r.isError).toBe(true);
});
```

Tested with Bun 1.4 and `@modelcontextprotocol/server` 2.4.0: the three tests pass, the stdio server answers a real stdio client, and the CLI exits with code 2 on an empty query.

Running the same server as a local daemon (systemd user unit, illustrative):

```ini
# author: Stephen Eaton
[Unit]
Description=notes MCP server (Streamable HTTP on a Unix socket)

[Service]
ExecStart=/usr/local/bin/notes-mcp --http --socket %t/notes-mcp.sock
EnvironmentFile=%h/.config/notes-mcp/env   # token from the vault agent, not committed
Restart=on-failure
NoNewPrivileges=yes

[Install]
WantedBy=default.target
```

## Anti-patterns

- Business logic copied into the CLI and again into the MCP server, then drifting.
- One MCP tool per REST endpoint, with descriptions like "calls GET /items".
- Relying on protocol sessions or server-assigned session IDs in a new server.
- A localhost daemon with no authentication.
- `readOnlyHint: true` on a tool that writes.
- An MCP App whose buttons call the backend directly, bypassing tool approval.
- An API, a UI or a documentation page that no one owns and no gate compares, so it drifts behind the core.

## Checklist

- [ ] Logic in one tested core; CLI, MCP server and MCP App are thin adapters
- [ ] Official SDK, current spec, pinned; stateless design with bound, expiring handles; no deprecated features
- [ ] Few task-shaped tools; strict schemas; structured output; fixable tool errors; bounded results; truthful annotations
- [ ] Inputs untrusted; token audience checked; no token passthrough; minimal scopes; credentials in a vault
- [ ] Per-client vs daemon decided and recorded; daemons authenticated, loopback or socket, monitored
- [ ] MCP Apps with text fallback; UI actions through tools
- [ ] Tested through real clients; versioned, signed or pinned, published
- [ ] Every surface that exposes the core is listed with a generator or an owner, and each pair that must stay in step has a gate that fails the build

## References

- [MCP 2026-07-28 changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- [MCP blog — The 2026-07-28 specification](https://blog.modelcontextprotocol.io/posts/2026-07-28/)
- [MCP — Security best practices](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices)
- [MCP blog — MCP Apps](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/)
- [MCP TypeScript SDK v2 — Tools](https://ts.sdk.modelcontextprotocol.io/v2/servers/tools)
