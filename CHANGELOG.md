# Changelog

## Unreleased

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
