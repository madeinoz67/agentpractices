# Changelog

## Unreleased

- Header: GitHub Star button with star count fetched at build time (no client script); daily scheduled rebuild refreshes the count.
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
