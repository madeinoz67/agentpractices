---
title: Agent Best-Practices Site — Design
author: Stephen Eaton
date: 2026-11-24
status: draft (awaiting approval)
---

# Agent Best-Practices Site — Design

## 1. Intent

A single, canonical, versioned place that Stephen's AI agents consult before acting:
"how should I do X?" — agent workflows, applying ontology/taxonomy/semantics, agent
teams and communication, writing CLIs, and whatever is learned next.

Agents consume it **over the web** (decided). An MCP server exposing `search` /
`get_practice` is a **later phase** (decided) and must be buildable from the same
outputs without restructuring content.

## 2. Goals / non-goals / anti-goals

**Goals**
- Agent-first outputs: `llms.txt`, `llms-full.txt`, raw `.md` per page, `catalog.json`, `taxonomy.jsonld`.
- Content organised by a governed taxonomy that grows without breaking existing links/IDs.
- Every practice is short, directive (RFC 2119 MUST/SHOULD/MAY), and self-contained enough to be fetched alone.
- Human-readable site with search as a by-product.
- CI validation: a page with a bad taxonomy reference, duplicate ID or missing required field fails the build.

**Non-goals (this phase)**
- MCP server, private/authenticated hosting, multi-language content, comments/feedback UI.

**Anti-goals** (failure even if it "works")
- Long essay pages agents must read end-to-end to find the rule.
- Taxonomy that's just folder names with no IDs/definitions — re-orgs would break agent references.
- Content that duplicates vendor docs instead of stating *our* practice and linking out.

## 3. Constraints
- Public: GitHub Pages at `https://madeinoz67.github.io/best-practices/` (base path `/best-practices`).
- Bun for all scripts. Every script carries `author: Stephen Eaton`.
- Push currently refused for this session — Claude GitHub App must be installed on the repo before Claude can commit/push.

## 4. Approaches considered

| # | Approach | Trade-off |
|---|---|---|
| 1 | **Astro Starlight + `starlight-llms-txt` + Bun scripts** | Standard, supported docs framework (search, sidebar, a11y). Framework upgrades now and then. |
| 2 | Custom Bun SSG (~400 lines) | Total control, no framework churn; we own search/nav/a11y. |
| 3 | MkDocs Material + `mkdocs-llmstxt` | Mature, but Python toolchain against the Bun preference. |

**Picked: 1.** Standardisation + supportability; agent-specific outputs live in our own
scripts so content/taxonomy are portable to option 2 if ever needed.
Versions at time of writing: `astro` 7.4.x, `@astrojs/starlight` 0.43.x, `starlight-llms-txt` 0.12.x.

## 5. Taxonomy design

### 5.1 Competency questions (the taxonomy must answer these)
1. What are the rules for doing *task X* (e.g. "write a CLI", "hand off between agents")?
2. Which practices apply to my **role** (orchestrator, implementer, reviewer…)?
3. Which practices apply at this **lifecycle stage** (plan, build, verify, operate)?
4. What anti-patterns should I avoid in domain Y?
5. Is this practice current, or deprecated — and what replaced it?
6. Which practices relate to / depend on this one?
7. What changed since version N (so a cached agent knows to refetch)?
8. Give me only checklists for domain Y.

### 5.2 Structure: one primary hierarchy + facets
- **Domain** — the primary hierarchy (SKOS `ConceptScheme`), single parent per practice
  (one filing location = one URL). Split on *subject area of practice*. 2 levels to start, max 3.
- **Facets** (flat controlled vocabularies, multi-valued, never hierarchy levels):
  `type`, `role`, `stage`. Status is a property, not a level.

### 5.3 Domain scheme v0.1.0 (IDs stable; labels may change)

| ID | Concept | Narrower |
|---|---|---|
| `D.AGT` | Agent Engineering — practices for a single agent doing work well | `D.AGT.WF` Workflow (plan→execute→verify) · `D.AGT.CTX` Context & Memory · `D.AGT.TOOL` Tool Use · `D.AGT.INS` Instructions & Prompting · `D.AGT.SKL` Skills & Reusable Procedures |
| `D.MAS` | Multi-Agent Systems — practices for agents working together | `D.MAS.TOP` Team Topologies & Roles · `D.MAS.COM` Communication & Protocols (MCP, A2A) · `D.MAS.HND` Coordination & Handoff |
| `D.KNO` | Knowledge Modelling — structuring meaning for people and machines | `D.KNO.TAX` Taxonomy · `D.KNO.ONT` Ontology · `D.KNO.SEM` Semantics & Metadata |
| `D.SWE` | Software Engineering — building software artefacts | `D.SWE.CLI` CLI Design · `D.SWE.API` API & Interface Design · `D.SWE.TST` Testing · `D.SWE.VCS` Version Control & Review |
| `D.SEC` | Security & Safety — protecting systems, data and users from agent actions | `D.SEC.INJ` Prompt Injection & Untrusted Input · `D.SEC.PRV` Least Privilege & Secrets · `D.SEC.SUP` Supply Chain |
| `D.OPS` | Operations — running agents reliably | `D.OPS.OBS` Observability · `D.OPS.EVL` Evaluation · `D.OPS.CST` Cost & Performance |
| `D.DOC` | Documentation & Writing — writing that agents and people consume | `D.DOC.AGR` Agent-Readable Docs · `D.DOC.SPC` Specs & Design Docs |

Definitions (genus + differentia) and scope notes live in `taxonomy/domains.yaml`.

### 5.4 Facets v0.1.0
- **type**: `guideline` · `pattern` · `anti-pattern` · `checklist` · `procedure` · `reference`
- **role**: `any` · `orchestrator` · `planner` · `implementer` · `reviewer` · `researcher`
- **stage**: `plan` · `build` · `verify` · `operate`
- **status**: `draft` · `adopted` · `deprecated` (deprecated requires `superseded_by`)

### 5.5 Governance
- Source of truth: `taxonomy/*.yaml` (hand-edited, in Git). Generated: `taxonomy.jsonld` (SKOS), `taxonomy.json`.
- Add concept → PR editing YAML + bump taxonomy minor version. Rename = label change only (ID kept).
  Remove = `status: deprecated` + `replaced_by`; never delete an ID.
- Practice IDs `BP-NNNN`, never reused. Owner: Stephen.
- `CHANGELOG.md` for content and taxonomy.

## 6. Content model

`src/content/docs/<domain>/<subdomain>/<slug>.md`, frontmatter:

```yaml
id: BP-0001                 # stable, unique
title: Design CLIs for agents and humans
description: One-line summary (used in llms.txt and catalog)
domain: D.SWE.CLI           # must exist in taxonomy
type: guideline
roles: [implementer]
stage: [build]
status: adopted
version: 1.0.0              # semver per practice
updated: 2026-11-24
related: [BP-0004]
superseded_by: null
sources: [ {title, url} ]
```

Body template (fixed section order so agents can jump to it):
1. **Rules** — numbered MUST/SHOULD/MAY bullets (the TL;DR an agent can act on).
2. **When to apply** / when not to.
3. **Procedure** (if any).
4. **Examples** — good and bad.
5. **Anti-patterns**.
6. **Checklist**.
7. **References**.

## 7. Agent-facing outputs (all under base path)

| Path | Content | Built by |
|---|---|---|
| `/llms.txt` | Index per llmstxt.org, sections by domain, link + description per practice | `starlight-llms-txt` (custom sets per domain) |
| `/llms-full.txt`, `/llms-small.txt` | Full / condensed corpus | plugin |
| `/<path>.md` | Raw Markdown of each page incl. frontmatter | Bun script post-build |
| `/catalog.json` | Array of practice frontmatter + url + md_url + taxonomy path labels; top-level `version`, `generated` | Bun script |
| `/taxonomy.jsonld` | SKOS concept scheme(s) | Bun script |
| `/AGENTS.md` (root of site) | How an agent should use the site (fetch order, IDs, versions) | static |

Agent usage contract (published on the home page and `/AGENTS.md`):
fetch `llms.txt` → pick practice → fetch its `.md`; or fetch `catalog.json` and filter by
`domain`/`role`/`stage`/`type`; cite practices by `BP-ID@version`.

## 8. Validation (CI, `bun run check`)
- Frontmatter schema (Zod via Astro content collections) — required fields, enum facets.
- Every `domain` resolves to a non-deprecated concept; IDs unique; `related` / `superseded_by` resolve.
- Taxonomy: no orphans, no cycles, every concept has definition, warn on single-child parents.
- Built `taxonomy.jsonld` parses as JSON-LD (via `jsonld` npm) and concept count matches YAML.
- Link check on built site.

## 9. Delivery
- GitHub Actions: on push to `main` → `bun install` → `bun run check` → `astro build` → deploy Pages.
- Seed content: one practice per top-level domain (7), plus the "how to contribute a practice" page,
  so the taxonomy and outputs are exercised end to end. Content is drafted by Claude, `status: draft`,
  for Stephen to review/adopt.

## 10. Later (MCP phase — not built now)
MCP server reads `catalog.json` + `.md` (remote or local clone) and exposes
`list_domains`, `search_practices(query, domain?, role?, stage?, type?)`, `get_practice(id)`.
Nothing in this design needs to change for it.

## 11. Calls made by Claude (correct if wrong)
- Licence: content CC BY 4.0, code MIT.
- No custom domain yet; `site`/`base` in config so one can be added later.
- Seed practices are drafts, not adopted practice.

## 12. Left to the builder
Styling/theme, exact Starlight sidebar config, link-checker choice, seed practice wording.
