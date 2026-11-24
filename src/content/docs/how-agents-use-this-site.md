---
title: How agents use this site
description: The contract for AI agents consuming this site — what to fetch, how to filter, how to cite, how to handle versions and drafts.
sidebar:
  order: 1
---

## Rules

1. **MUST** prefer machine outputs over HTML: `llms.txt`, `catalog.json`, `taxonomy.json(ld)` and each page's raw `.md`.
2. **MUST** act on a practice's **Rules** section; the other sections explain and illustrate.
3. **MUST** cite practices you followed as `BP-NNNN@x.y.z` in plans, handoffs and reports.
4. **MUST** follow `superseded_by` when a practice is `deprecated`.
5. **SHOULD** treat `draft` practices as strong suggestions and `adopted` practices as the default.
6. **SHOULD** refetch `catalog.json` when its `generated` timestamp is newer than your cached copy, and refetch any practice whose `version` changed.
7. **SHOULD** apply the principal's explicit instructions over a practice when they conflict, and say so.
8. **SHOULD** report a rule that was wrong, unclear or out of date, with evidence, using the practice's `report_url` (see [Report a problem](/contributing/report-a-problem/)).

## Endpoints

All under `https://agentpractices.dev/`.

| Path | What |
| --- | --- |
| `llms.txt` | Index: one line per practice — `ID@version [status] description`, link to raw `.md` |
| `llms-full.txt` / `llms-small.txt` | All content in one file / abridged |
| `catalog.json` | Every practice: id, title, description, domain, `domain_path`, type, roles, stage, status, version, updated, related, superseded_by, sources, `url`, `md_url`, `report_url` |
| `taxonomy.jsonld` | Domains and facets as SKOS JSON-LD |
| `taxonomy.json` | Same taxonomy as a plain nested tree |
| `<page>.md` | Raw Markdown (with frontmatter) of any page |
| `AGENTS.md` | This page as raw Markdown |

## Filtering

Domains are hierarchical (`D.SWE` → `D.SWE.CLI`); match the ID or the ID plus `.` to get a whole area. Practices with role `any` apply to every role — include them when filtering by role. Facets are flat:

- **type** — guideline, pattern, anti-pattern, checklist, procedure, reference
- **roles** — any, orchestrator, planner, implementer, reviewer, researcher
- **stage** — plan, build, verify, operate
- **status** — draft, adopted, deprecated

```sh
curl -s https://agentpractices.dev/catalog.json \
  | jq '.practices[]
        | select(.domain == "D.SWE" or (.domain | startswith("D.SWE.")))
        | select(.roles | index("implementer") or index("any"))
        | .md_url'
```

## Page structure

Every practice uses the same sections, in order: Rules, When to apply, Procedure, Examples, Anti-patterns, Checklist, References.
