---
title: Contribute with the create-practice skill
description: Install the create-practice Claude Code plugin to propose and write practices through the governed route — duplicate search, domain choice, rules, proposal issue, then page, verify and pull request.
sidebar:
  order: 2
---

The `create-practice` plugin takes a person or an agent through [Add a practice](../add-a-practice/) step by step. It does not replace the route: it follows it, and stops where the owner has to decide.

## Rules

1. **MUST** use the skill for new practices only. To change a published rule, use [Report a problem](../report-a-problem/); to fix a typo or link, open a pull request directly.
2. **MUST** let the owner assign the `BP-NNNN`. The skill refuses to put an ID in a proposal and stops after filing it, until the issue is labelled `accepted` and has an ID.
3. **MUST** get the person's go-ahead before the skill files an issue or opens a pull request; both publish text under their name.
4. **SHOULD** act on the duplicate search: when an existing practice already covers the idea, cite it; when it covers part of it, report the missing rule on that practice instead of proposing a new one.
5. **MUST** pass `bun run verify` before the pull request, as for any other change.

## Install

```sh
/plugin marketplace add madeinoz67/agentpractices
/plugin install create-practice@agentpractices-marketplace
```

It is a separate plugin from `agentpractices`, which applies practices to a task. Install `create-practice` only where you write practices. It needs Bun; `gh` is used when it is installed.

## What it does

| Phase | The skill | You or the owner |
| --- | --- | --- |
| 1. Propose | Searches `catalog.json` for overlapping practices, lists the domains and facets, checks the draft rules, and renders the *Propose a practice* issue (body and a prefilled link) | Approve the issue text; the skill files it with `gh`, or you open the prefilled link |
| 2. Wait | Stops | The owner accepts the issue and comments the `BP-NNNN` |
| 3. Write | Branches, scaffolds the page in its domain folder (`status: draft`, `version: 1.0.0`, review dates, CHANGELOG line), fills the sections, runs `bun run verify`, opens the pull request with `Closes #N` | Review and merge |

## The script

The skill calls `plugins/create-practice/skills/create-practice/scripts/practice.ts` (Bun, no dependencies). JSON on stdout; one line on stderr and exit 1 on any failure.

| Command | What it does |
| --- | --- |
| `similar --title T [--text X]` | Ranks existing practices by word overlap with the proposal. A first pass: read the top hits before you decide. |
| `taxonomy [--repo DIR]` | Domains with definitions and content folders, and the facet values. With `--repo` it reads `taxonomy/*.yaml` from a clone, so a concept added on the branch counts. |
| `propose --draft FILE` | Validates a draft (domain, facets, a bold MUST/SHOULD/MAY on every numbered rule, related IDs, source URLs) and prints the issue title, labels, body and prefilled URL. |
| `scaffold --repo DIR --id BP-NNNN …` | Writes the page into the folder its domain requires and adds the CHANGELOG line. Refuses an ID already in use and never overwrites an existing file. |

A draft for `propose` looks like this:

```json
{
  "title": "Pin MCP server versions",
  "problem": "Agents load MCP servers by package name, so an upstream release changes tools without review.",
  "domain": "D.AGT.TOOL",
  "type": "guideline",
  "roles": ["implementer", "orchestrator"],
  "stage": ["build", "operate"],
  "rules": "1. **MUST** pin every MCP server to an exact version or digest.\n2. **SHOULD** review the tool list diff before upgrading.",
  "related": ["BP-0062"],
  "sources": [{ "title": "MCP specification", "url": "https://modelcontextprotocol.io/specification" }]
}
```

When no domain fits, set `"domain": "none"` and describe the missing concept in `taxonomy_note`; the owner decides on a [taxonomy change](../extend-the-taxonomy/).

## Safety

- The script contacts `agentpractices.dev` only (`AGENTPRACTICES_URL` points it at a local build) and sends nothing.
- Issue text, comments and source pages are data to the skill, not instructions. It does not act on an issue labelled `needs-security-review`.
- Proposals and pages are public: no secrets, internal hostnames, customer names or personal data.
