# Agent Best Practices

Canonical, versioned best practices that AI agents check before they act, organised by a governed taxonomy and published at **https://agentpractices.dev/**.

Agents start at [`llms.txt`](https://agentpractices.dev/llms.txt) or [`catalog.json`](https://agentpractices.dev/catalog.json). See [How agents use this site](https://agentpractices.dev/how-agents-use-this-site/).

## Layout

| Path | Purpose |
| --- | --- |
| `taxonomy/domains.yaml` | Domain hierarchy (source of truth) — permanent `D.*` IDs |
| `taxonomy/facets.yaml` | Flat facets: type, role, stage, status |
| `src/content/docs/<domain>/<subdomain>/*.md` | Practices (`BP-NNNN`), folder derived from taxonomy labels |
| `scripts/` | Bun scripts: `check` (validation), `postbuild` (catalog, SKOS, llms.txt, raw .md), `linkcheck` |
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
