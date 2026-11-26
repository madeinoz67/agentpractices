# Agent Best Practices

Canonical, versioned best practices that AI agents check before they act, organised by a governed taxonomy and published at **https://agentpractices.dev/**.

Agents start at [`llms.txt`](https://agentpractices.dev/llms.txt) or [`catalog.json`](https://agentpractices.dev/catalog.json). See [How agents use this site](https://agentpractices.dev/how-agents-use-this-site/).

## Install the Claude Code plugin

The plugin ships from this repository. It gives an agent the corpus without per-project wiring: fetch `catalog.json`, select by domain, role and stage, read the Rules, cite `BP-NNNN@x.y.z`.

```sh
/plugin marketplace add madeinoz67/agentpractices
/plugin install agentpractices@agentpractices-marketplace
```

The skill calls `skills/agentpractices/scripts/practices.ts` (Bun, no dependencies). It contacts `agentpractices.dev` only, sends nothing, and caches public content in `~/.cache/agentpractices`.

### Contribute practices: `create-practice`

A second plugin walks a person or agent through adding a practice the governed way: search for duplicates, pick the domain, draft MUST/SHOULD/MAY rules, file the *Propose a practice* issue, and — once the owner assigns a `BP-NNNN` — scaffold the page in its domain folder, add the CHANGELOG line, run `bun run verify` and open the pull request.

```sh
/plugin install create-practice@agentpractices-marketplace
```

It calls `plugins/create-practice/skills/create-practice/scripts/practice.ts` (Bun, no dependencies) and contacts `agentpractices.dev` only.

## Layout

| Path | Purpose |
| --- | --- |
| `taxonomy/domains.yaml` | Domain hierarchy (source of truth) — permanent `D.*` IDs |
| `taxonomy/facets.yaml` | Flat facets: type, role, stage, status |
| `src/content/docs/<domain>/<subdomain>/*.md` | Practices (`BP-NNNN`), folder derived from taxonomy labels |
| `scripts/` | Bun scripts: `check` (validation), `postbuild` (catalog, SKOS, llms.txt, raw .md), `linkcheck` |
| `.claude-plugin/`, `skills/agentpractices/` | Claude Code plugin `agentpractices` and the marketplace: manifests, `SKILL.md`, and the fetch, filter and citation script |
| `plugins/create-practice/` | Claude Code plugin `create-practice`: propose, scaffold and verify new practices |
| `docs/superpowers/` | Design spec and implementation plan |

## Develop

```sh
bun install
bun run dev        # local site
bun run verify     # test + check + build + linkcheck (same as CI)
```

## Outputs

`llms.txt`, `llms-full.txt`, `llms-small.txt`, `catalog.json`, `taxonomy.jsonld` (SKOS), `taxonomy.json`, `AGENTS.md`, and `<page>.md` for every page.

## Contributing

See [Add a practice](https://agentpractices.dev/contributing/add-a-practice/) and [Extend the taxonomy](https://agentpractices.dev/contributing/extend-the-taxonomy/). Agents working in this repo: read `AGENTS.md`.

## Licence

Code: MIT (`LICENSE`). Content (`src/content/`, `taxonomy/`): CC BY 4.0 (`LICENSE-CONTENT`).

Author: Stephen Eaton (@madeinoz67)
