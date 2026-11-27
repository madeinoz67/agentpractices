---
title: Classify against a taxonomy by definition, not label
description: When tagging or filing items, match each item to a concept's definition and scope note, record confidence, and report gaps instead of forcing a fit.
id: BP-0004
domain: D.KNO.TAX
type: guideline
roles: [any]
stage: [build]
status: draft
version: 1.0.2
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0014]
sources:
  - title: W3C SKOS Reference
    url: https://www.w3.org/TR/skos-reference/
    note: Concept IDs, scope notes and deprecation with replacement pointers, which rules 1, 2 and 5 depend on
  - title: "ANSI/NISO Z39.19"
    url: https://www.niso.org/publications/ansiniso-z3919-2005-r2010
    note: "Thesaurus construction rules: preferred terms, broader and narrower relationships, scope notes, and where polyhierarchy is allowed"
---
## Rules

1. **MUST** reference concepts by stable ID, never by label; labels change, IDs do not.
2. **MUST** classify against the concept's definition and scope note, not by matching words in its label.
3. **MUST** use the most specific concept that fits; do not file at a parent when a child applies.
4. **MUST NOT** create new concepts while classifying; record a gap candidate instead.
5. **MUST NOT** use a deprecated concept; follow its replacement.
6. **SHOULD** record a confidence (high, medium, low) and a one-line rationale for each assignment.
7. **SHOULD** keep facets (type, role, stage, status) separate from the hierarchy; never encode them as levels.
8. **MAY** assign secondary concepts only where the scheme allows polyhierarchy or multi-tagging.

## When to apply

Tagging documents or records, filing a new practice on this site, mapping items between systems, cleaning existing tags.

## Procedure

1. Load the scheme (this site: `taxonomy.json` or `taxonomy.jsonld`).
2. For each item, shortlist candidate concepts, then read their definitions.
3. Assign the most specific fit with confidence and rationale.
4. Collect items with no fit, or only low-confidence fits, as gap candidates for the taxonomy owner.

## Examples

| Item | Concept | Confidence | Rationale |
| --- | --- | --- | --- |
| "Exit codes for the deploy CLI" | `D.SWE.CLI` | high | About command-line tools used by agents |
| "Secrets in agent env vars" | `D.SEC.PRV` | high | Credentials an agent holds |
| "Choosing between two LLM vendors" | — | low | No procurement concept: gap candidate |

## Anti-patterns

- A growing "Other" or "General" bucket.
- Encoding status or date as hierarchy levels.
- Near-synonym concepts created because a label did not match exactly.

## Checklist

- [ ] IDs used, not labels
- [ ] Every assignment has confidence + rationale
- [ ] Gap candidates reported, not forced

