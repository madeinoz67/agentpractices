# Agent Best-Practices Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Public Starlight site at `https://madeinoz67.github.io/best-practices/` whose primary consumers are AI agents, structured by a governed taxonomy.

**Architecture:** Markdown practices in Astro content collections, validated against a YAML taxonomy by Bun scripts. Post-build Bun scripts emit `catalog.json`, `taxonomy.jsonld`, `taxonomy.json` and raw `.md` copies into `dist/`; `starlight-llms-txt` emits `llms*.txt`. GitHub Actions validates, builds, deploys Pages.

**Tech Stack:** Bun, Astro 7.4.x, @astrojs/starlight 0.43.x, starlight-llms-txt 0.12.x, `yaml`, `gray-matter`, `jsonld`, `bun:test`.

**Spec:** `docs/superpowers/specs/2026-11-24-best-practices-site-design.md`

## Global Constraints
- `site: https://madeinoz67.github.io`, `base: /best-practices`.
- Every script/code file header: `author: Stephen Eaton`.
- Bun only for scripts (no Python, no npm scripts that need Node-only tooling beyond Astro itself).
- Practice IDs match `^BP-\d{4}$`; domain IDs match `^D(\.[A-Z]{2,4}){1,3}$`.
- Facet enums exactly: type `guideline|pattern|anti-pattern|checklist|procedure|reference`; role `any|orchestrator|planner|implementer|reviewer|researcher`; stage `plan|build|verify|operate`; status `draft|adopted|deprecated`.
- Taxonomy version `0.1.0`; concept URI base `https://madeinoz67.github.io/best-practices/taxonomy/`.
- Content CC BY 4.0, code MIT.

## Review Focus
1. Base path: every URL in `catalog.json`, `llms.txt` and `.md` copies includes `/best-practices/` — test in Task 4.
2. A practice whose `domain` points at a deprecated concept must fail validation, not silently publish — test in Task 3.
3. `status: deprecated` without `superseded_by` (or pointing at a missing ID) fails — Task 3.
4. Titles/definitions with quotes, `&`, or non-ASCII survive into valid JSON-LD — Task 4 fixture.
5. A Markdown file under `src/content/docs/` that is not a practice (index, guides) must not be required to carry practice frontmatter — schema makes practice fields optional, validator only checks files with `id` — Task 3.

---

## File Structure
```
astro.config.mjs                 Starlight + llms-txt config
src/content.config.ts            docs collection schema (extends Starlight)
src/content/docs/index.mdx       home + agent usage contract
src/content/docs/<domain>/<sub>/<slug>.md   practices
src/content/docs/contributing/*.md          how to add practice / taxonomy term
taxonomy/domains.yaml            domain scheme (source of truth)
taxonomy/facets.yaml             facet vocabularies
scripts/lib/taxonomy.ts          load + validate taxonomy
scripts/lib/practices.ts         load + validate practices
scripts/check.ts                 CLI: run all validation, exit 1 on error
scripts/postbuild.ts             emit catalog/taxonomy/md into dist
scripts/lib/emit.ts              pure builders for catalog + JSON-LD
tests/*.test.ts                  bun tests + fixtures
public/AGENTS.md                 agent usage contract (served at /best-practices/AGENTS.md)
AGENTS.md, README.md, CHANGELOG.md, LICENSE, LICENSE-CONTENT
.github/workflows/deploy.yml
```

### Task 1: Scaffold Starlight with Bun
**Files:** `package.json`, `astro.config.mjs`, `src/content.config.ts`, `src/content/docs/index.mdx`, `tsconfig.json`, `.gitignore`
**Produces:** `bun run build` → `dist/`; schema fields `id?, domain?, type?, roles?, stage?, status?, version?, updated?, related?, superseded_by?, sources?`.
- [ ] Create project; deps pinned to versions in Tech Stack. Scripts: `dev`, `build` (`astro build && bun scripts/postbuild.ts`), `check` (`bun scripts/check.ts`), `test` (`bun test`).
- [ ] Config: sidebar autogenerate per top-level domain dir; `starlightLlmsTxt({ customSets: one per domain })`.
- [ ] Run `bunx astro build` → expect `dist/best-practices/`? (Astro writes to `dist/` with base applied in links) and `dist/llms.txt` exists.
- [ ] Commit `chore: scaffold starlight site`.

### Task 2: Taxonomy source + validator
**Files:** `taxonomy/domains.yaml`, `taxonomy/facets.yaml`, `scripts/lib/taxonomy.ts`, `tests/taxonomy.test.ts`, fixtures.
**Produces:** `loadTaxonomy(dir: string): Taxonomy`; `validateTaxonomy(t: Taxonomy): Issue[]`; `type Concept = {id,label,definition,scope_note?,alt_labels?,broader?,status,replaced_by?}`; `type Issue = {level:'error'|'warn', code:string, msg:string}`; `t.byId: Map<string,Concept>`; `pathOf(t,id): Concept[]`.
- [ ] Tests: valid repo taxonomy → 0 errors; fixture with orphan `broader` → `E_ORPHAN`; cycle → `E_CYCLE`; missing definition → `E_NODEF`; duplicate id → `E_DUPID`; deprecated without `replaced_by` → `E_DEPREC`; single child → warn `W_SINGLE`; bad id format → `E_IDFMT`.
- [ ] Run, see fail; implement; run, see pass. Populate `domains.yaml` with the 7 top + 24 narrower concepts from spec §5.3, each with genus+differentia definition.
- [ ] Commit `feat: taxonomy source and validator`.

### Task 3: Practice validator + `check` CLI
**Files:** `scripts/lib/practices.ts`, `scripts/check.ts`, `tests/practices.test.ts`, fixtures.
**Consumes:** Task 2. **Produces:** `loadPractices(dir): Practice[]` (only files with `id`), `validatePractices(ps, t): Issue[]`, `type Practice = frontmatter & {file, slug}`.
- [ ] Tests: unknown domain `E_DOMAIN`; deprecated domain `E_DOMAIN_DEPREC`; dup BP id `E_DUPID`; `related` unresolved `E_REL`; deprecated practice w/o valid `superseded_by` `E_SUPER`; bad facet value `E_FACET`; missing `description` `E_REQ`; body missing `## Rules` heading `E_RULES`; non-practice md (no id) ignored.
- [ ] Implement; `check.ts` prints issues, exits 1 on any error. Run `bun run check` on repo → exit 0.
- [ ] Commit `feat: practice validation and check cli`.

### Task 4: Post-build emitters
**Files:** `scripts/lib/emit.ts`, `scripts/postbuild.ts`, `tests/emit.test.ts`.
**Consumes:** Tasks 2–3. **Produces:** `buildCatalog(ps,t,opts): Catalog` (`{version, taxonomy_version, generated, base_url, practices:[{...frontmatter, domain_path:string[], url, md_url}]}`), `buildSkos(t,opts): object` (JSON-LD `@context` + `@graph`, ConceptScheme `domains` + one scheme per facet), `buildTaxonomyJson(t)`.
- [ ] Tests: catalog url/md_url start with `https://madeinoz67.github.io/best-practices/`; `domain_path` labels for `D.SWE.CLI` = `["Software Engineering","CLI Design"]`; SKOS expands via `jsonld.toRDF` to N-Quads with concept count == YAML count; fixture label `Q&A "tests" — naïve` round-trips; deprecated concept carries `owl:deprecated true` and `dct:isReplacedBy`.
- [ ] Implement; postbuild writes `dist/catalog.json`, `dist/taxonomy.jsonld`, `dist/taxonomy.json`, and `dist/<slug>.md` for every docs page (frontmatter + body verbatim).
- [ ] Run `bun run build`; verify files exist and `dist/llms.txt` links carry base path.
- [ ] Commit `feat: agent-facing outputs`.

### Task 5: Content
**Files:** `src/content/docs/index.mdx`, `public/AGENTS.md`, `src/content/docs/contributing/{add-a-practice,extend-the-taxonomy,practice-template}.md`, 7 seed practices `BP-0001..BP-0007` (one per top domain: SWE.CLI CLI design for agents; AGT.WF plan-execute-verify loop; MAS.HND handoff contracts; KNO.TAX applying taxonomy; SEC.INJ untrusted input; OPS.EVL evaluating agent output; DOC.AGR writing agent-readable docs), all `status: draft`, body sections per spec §6.
- [ ] `bun run check` exit 0; `bun run build` ok; catalog has 7 practices.
- [ ] Commit `docs: seed practices and contribution guides`.

### Task 6: Repo docs + CI
**Files:** `README.md`, `AGENTS.md` (repo contributor instructions for agents), `CHANGELOG.md`, `LICENSE` (MIT), `LICENSE-CONTENT` (CC BY 4.0 notice), `.github/workflows/deploy.yml` (checkout → setup-bun → `bun install --frozen-lockfile` → `bun test` → `bun run check` → `bun run build` → upload-pages-artifact `dist` → deploy-pages).
- [ ] Validate workflow YAML parses; full local run of the same command sequence passes.
- [ ] Commit `ci: build and deploy to pages`.
