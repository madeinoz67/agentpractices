# Changelog

## Unreleased

- `catalog.json`'s `generated` is now the source commit's time, not the build's wall clock, and the build job has its own `pages-build-*` concurrency group with `cancel-in-progress: true`. A scheduled build that checked out an older commit can no longer deploy after a newer build, and if it did its old timestamp would lose to the newer cached copy. Agent contract rule 6 now says a metadata-only commit moves `generated` and the daily star-count refresh does not (#27).

- BP-0007 1.1.0: rules 10–12 define the caching contract that rule 3 named but never stated — publish a `content_hash` per page in the machine-readable catalogue (10), never move a version or hash when only metadata refreshes (11), and have consumers cache by content identity rather than on a clock (12). Examples, anti-patterns and checklist follow (#26).
- Agent contract rule 6 now separates the two objects: refetch `catalog.json` at task start or when its `generated` is newer, then refetch a practice only when its `version` or `content_hash` differs. The daily star-count refresh moves `generated` without changing any practice, which made every agent refetch daily for nothing (#21). `content_hash` detects change; it is not a signature.
- Plugin skill 0.2.1: the `sync` guidance no longer says to refetch when `catalog_generated` is older than a day. `sync` now also drops the cached practice bodies, so it really does recover a corrupt cache; practice files are cached as `<ID>@<version>.md` and are otherwise refetched only on a version bump. Cache writes go through a temp file and a rename, so an interrupted fetch cannot leave a truncated body behind.
- Plugin skill 0.2.1 hardening, from the branch review's backlog: a catalogue `version` can no longer name a cache file outside the cache directory; redirects are followed only while every hop stays on the configured origin; and a read-only cache directory no longer discards a value already fetched.
- BP-0078 Agents never push to main — issue, branch, pull request, then clean up the branch and worktree after merge. AGENTS.md rule 1 now requires the same flow for agents working on this repository, and `.githooks/pre-push` refuses pushes to `main` (enable with `git config core.hooksPath .githooks`).
- BP-0014 2.1.0: rule 5 now says where the gap ledger lives — as data in the repository that owns the declaring standard, read by the rule 3 gate, which fails on unrecorded or stale rows (#22).
- Plugin skill 0.2.0: four fixes to `skills/agentpractices`. Every command now runs the script from the skill's base directory, so it works once installed as a plugin (was repo-relative). Repeated `--domain` flags add up like the comma form, and every flag value is validated against `taxonomy.json`, so a typo in a domain, role, stage, type or status exits 1 naming the valid values instead of returning an empty result. `AGENTPRACTICES_URL` now applies to practice pages as well as the catalogue: an absolute `md_url` is resolved onto the configured base. Unknown flags are a usage error. New `domains` subcommand prints the domain tree; `list` and `get` report `review_overdue`; `check` reports `change` (none, patch, minor, major, older) by numeric version comparison.
- Version guard: catalog.json now carries a `content_hash` per practice, and `bun run versions` (in `verify` and the deploy workflow) fails when a published practice's content changed without a version bump, its version went backwards, or it was deleted. Bumping versions is now a MUST for any content change, not only Rules changes.
- BP-0076 1.1.0: version bump for the sensitivity-label rules (13–16) added after 1.0.0 was published.
- Added `reviewed` and `review_by` dates to every practice (required). `bun run check` errors on an invalid date order or a gap of more than 12 months, and warns when a review is overdue; the dates appear on each page and in catalog.json. Backfilled: 3 months for fast-moving pages (BP-0046, BP-0047, BP-0049, BP-0065, BP-0073, BP-0074, BP-0077), 6 months for the rest.
- BP-0077 1.1.0: the risk register records `last_reviewed` as well as `next_review`, and the CI check validates both.
- Updated OWASP Top 10 for LLM Applications references from the 2025 edition to the 2026 edition (IDs renumbered) in BP-0005, BP-0027, BP-0029, BP-0032, BP-0033, BP-0036, BP-0040, BP-0044 and BP-0045.
- BP-0077 Map agent risks to the AI security frameworks (ATLAS, NIST AI RMF, OWASP LLM and Agentic Top 10s, CoSAI); new concept D.SEC.FRM.
- Added BP-0076 Make agent dashboards single, self-contained HTML files (D.SWE.UI, draft).
- Added BP-0075 Keep repositories safe when agents read and act on them (D.SEC.SUP, draft).
- Added BP-0074 Choose skills, MCP servers, CLIs or hooks for each capability (D.AGT.SKL, draft).
- Added BP-0073 Build CLIs and MCP servers from one core, and choose daemon or per-client deliberately (D.AGT.TOOL, draft).
- Security CI: prompt-injection and hidden-content scanner (`bun run security`) gates every deploy, scanning source and built output; reviewed exceptions in `security/injection-allowlist.yaml`. Added Security workflow (gitleaks, zizmor, CodeQL, `bun audit`, dependency review), Dependabot, CODEOWNERS, SECURITY.md and Promptfoo Code Scanner guidance. Deploy workflow: actions SHA-pinned, per-job least-privilege permissions. Added an advisory ML classifier job (ProtectAI DeBERTa v3, pinned revision, isolated package) and an Issue scan workflow that labels issues and comments `needs-security-review` and fails PRs whose description trips the scanner.
- Taxonomy 0.10.0: added D.SWE.REL Release Engineering; issue forms regenerated. Added BP-0072 Batch changes so the release round trip is paid once (draft). BP-0014 2.0.0: release rules moved to BP-0072. BP-0004 1.0.1: added BP-0014 to related.
- Added BP-0071 Design API surfaces contract-first and evolve them without breaking clients (D.SWE.API, draft).
- Taxonomy 0.9.0: added D.SEC.OT OT & Industrial Systems; issue forms regenerated. Added BP-0070 Keep agents out of the OT control path (draft).
- Added BP-0069 Design human approvals that people actually read (D.AGT.WF, draft).
- Added BP-0068 Workflow patterns for agents — a catalogue (D.AGT.WF, draft).
- Taxonomy 0.8.0: added D.SEC.DAT Data Sovereignty & Privacy; issue forms regenerated. Added BP-0067 Keep agent data where it is allowed to be, and personal data to a minimum (draft).
- Added BP-0066 Counter position and middle-option bias in model decisions (D.AGT.WF, draft).
- Added BP-0065 Benchmark models on your own tasks for accuracy, speed, cost and output format (D.OPS.EVL, draft).
- Added BP-0064 Use decision models for repeated, bounded decisions in agent workflows (D.AGT.WF, draft).
- Added BP-0063 Broker agent credentials through a secrets vault (for example OpenBao) (D.SEC.PRV, draft).
- Added BP-0062 Give each sub-agent only the tools and MCP servers its role needs (D.AGT.TOOL, draft).
- Added BP-0061 Choose agent communication channels for durability, audience and trust (D.MAS.COM, draft).
- Taxonomy 0.7.0: added D.OPS.BDR Backup & Recovery; issue forms regenerated. Added BP-0060 Back up agent systems and keep backups out of agents' reach (draft).
- Added BP-0059 Validate agent work with proof, not claims (D.AGT.WF, draft).
- Added BP-0057 Brainstorm to find intent before writing a spec and BP-0058 Write PRDs that agents can build and test against (D.DOC.SPC) — drafts.
- Taxonomy 0.6.0: added D.SWE.UI UI & Design Systems; issue forms regenerated. Added BP-0056 Use a style guide and approved mockups for repeated UI (draft).
- Added BP-0055 Prefer targeted API wrapper scripts to MCP servers for narrow, repeated work (D.AGT.TOOL, draft).
- BP-0047 1.1.0: added rules for expiring, refreshing and reconciling pricing windows and prices, with a price-check script; BP-0046 1.1.0: keep the gateway price table current.
- Taxonomy 0.5.0: added D.SWE.QLT Code Quality & Comments; issue forms regenerated. Added BP-0054 Keep agent-written code comments few, true and about why (draft).
- Added BP-0052 Prevent and catch hallucinations (D.AGT.WF) and BP-0053 Stop errors amplifying across agents, memory and retrieval (D.MAS.HND) — drafts.
- Added BP-0050 Detect and respond to model drift (D.OPS.EVL) and BP-0051 Observe agent workflows, not just single runs (D.OPS.OBS) — drafts.
- BP-0049 1.1.0: added Chinese model equivalents (Kimi, DeepSeek, Qwen, GLM, MiniMax) with their thinking controls and data-handling rules.
- Added BP-0048 Orchestrate agent workflows as gated phases with a durable ledger (D.MAS.HND) and BP-0049 Match model and thinking effort to each role (D.AGT.WF) — drafts.
- Added BP-0047 Cut cost with time-of-day (peak/off-peak) routing.
- Taxonomy 0.4.0: added D.SEC.DEF Defence Against Hostile Agents and D.OPS.GW Model Gateways & Routing; issue forms regenerated.
- Added BP-0042 Choose the simplest agent team topology (D.MAS.TOP), BP-0043 Communicate between agents with structured, authenticated messages (D.MAS.COM), BP-0044 Vet, pin and track every agent dependency (D.SEC.SUP), BP-0045 Defend against hostile AI agents with the 4Ds (D.SEC.DEF), BP-0046 Route agent model traffic through a governed gateway (D.OPS.GW) — drafts.
- Added BP-0039 Trace agent runs end to end and BP-0040 Keep an audit trail of agent actions (drafts, D.OPS.OBS).
- Added BP-0041 Budget and control agent cost and latency (draft, D.OPS.CST).
- Added BP-0034 Make agent commits and PRs reviewable, BP-0035 Isolate parallel agents with worktrees, BP-0036 Review agent-written changes (drafts, D.SWE.VCS).
- Added BP-0037 Work test-first with agents and BP-0038 Keep tests honest (drafts, D.SWE.TST).
- Taxonomy 0.3.0: added D.KNO.KG Knowledge Graphs; issue forms regenerated.
- Added BP-0031 Build knowledge graphs agents can trust (draft, D.KNO.KG).
- Added BP-0032 Give agents least-privilege, short-lived, attributable access and BP-0033 Keep secrets out of agent context, memory, logs and output (drafts, D.SEC.PRV).
- `astro.config.mjs` takes `site`, `base` and the social image URLs from `BASE_URL` in `scripts/lib/site.ts`, so the site origin is defined once.
- Added BP-0030 Structure multi-step workflows inside skills (draft, D.AGT.SKL).
- Added RAG practices BP-0027 Prepare a corpus for retrieval, BP-0028 Retrieve context with hybrid search, filters and reranking, BP-0029 Evaluate and secure RAG (drafts, D.AGT.CTX).
- Added BP-0024 Define each term once, BP-0025 Describe resources with standard metadata vocabularies, BP-0026 Map meaning between vocabularies explicitly (drafts, D.KNO.SEM).
- Added BP-0022 Configure MCP servers at the right scope and BP-0023 Use MCP servers safely and efficiently (drafts, D.AGT.TOOL).
- Added BP-0020 Author agent hooks and BP-0021 Use hooks for deterministic control (drafts, D.AGT.TOOL).
- Added BP-0018 Author agent skills and BP-0019 Use skills deliberately and safely (drafts, D.AGT.SKL).
- Added BP-0015 Write an AGENTS.md, BP-0016 Write CLAUDE.md files that Claude Code follows, BP-0017 Keep one source of truth for agent instruction files (drafts, D.AGT.INS).
- Practice pages now render a "See also" block from `related`, including reverse links.
- Header: "Star on GitHub" button ("Star" on narrow screens) with star count fetched at build time (no client script); daily scheduled rebuild refreshes the count.
- Report a problem: new contributing page; pre-filled "Report a problem" button on every practice page; `report_url` in catalog.json; reporting section in llms.txt; agent rule 8 in How agents use this site.
- GitHub issue forms (propose a practice, propose a taxonomy change, report a problem), generated from the taxonomy by `bun run issue-forms`; tests keep them in step.
- Contributing: issue first for new practices and taxonomy changes; owner assigns BP IDs on acceptance.
- Repository renamed madeinoz67/best-practices → madeinoz67/agentpractices to match the domain; GitHub link, edit links and package name updated.

- Site moved to https://agentpractices.dev/ (custom apex domain, no base path). Taxonomy concept URIs and catalog URLs now use the new origin; old github.io URLs redirect.

- Added BP-0014 Close standards-corpus coverage gaps in one batched release (draft, D.KNO.ONT).
- BP-0013 1.1.0: added provisioning rules (reserved prefix, orchestrator-only minting, retention backstop), lease/compare-and-set/idempotency rules, credential delivery and trust-level rules; added MuninnDB worked example.
- BP-0010 1.0.1: added Tool options table (Codanna, Gortex, codebase-memory-mcp, Serena, Sourcegraph MCP, LSP, ctags, ripgrep/Zoekt) and selection guidance; Rules unchanged.
- Added BP-0013 Use temporary workflow memory — when, how, and how to secure it (draft, D.AGT.CTX).
- BP-0011, BP-0012: added BP-0013 to related.
- Added BP-0011 Manage short-term (working) memory and BP-0012 Manage long-term memory (drafts, D.AGT.CTX).
- BP-0010: added BP-0011 to related.
- Added BP-0010 Use a code index to gather context (draft, D.AGT.CTX).
- BP-0002: added BP-0010 to related.
- Taxonomy 0.2.0: added D.DOC.HUM Human-Readable Docs.
- Added BP-0009 Write human-readable docs in plain language and Simplified Technical English (draft).
- BP-0007: added BP-0009 to related.
- Added BP-0008 Decompose tasks into independently verifiable units (draft, D.AGT.WF).
- BP-0002: added BP-0008 to related.
- Social card (public/og.png, 1280×640) with og:image / twitter:card meta; source in scripts/og/.

## 0.1.0 — 2026-11-24

- Site scaffold (Astro Starlight, Theme A "Spec Sheet").
- Taxonomy 0.1.0: 7 domains, 23 subdomains; facets type, role, stage, status.
- Agent outputs: llms.txt, catalog.json, taxonomy.jsonld, taxonomy.json, raw .md, AGENTS.md.
- Draft practices BP-0001 … BP-0007.
