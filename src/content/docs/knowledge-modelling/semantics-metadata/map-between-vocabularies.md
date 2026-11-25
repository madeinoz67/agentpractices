---
title: Map meaning between vocabularies explicitly
description: When two systems or schemes use different terms, compare definitions not labels, record each correspondence with an explicit match type (exact, close, broader, narrower, related) and its evidence, and never merge concepts with identity links.
id: BP-0026
domain: D.KNO.SEM
type: guideline
roles: [implementer, researcher, any]
stage: [plan, build, verify]
status: draft
version: 1.0.0
updated: 2026-11-24
reviewed: 2026-11-24
review_by: 2027-05-24
related: [BP-0024, BP-0025, BP-0004, BP-0014]
sources:
  - { title: W3C SKOS Reference — Mapping properties, url: https://www.w3.org/TR/skos-reference/#mapping }
  - { title: SSSOM — Simple Standard for Sharing Ontological Mappings, url: https://mapping-commons.github.io/sssom/ }
---

## Rules

1. **MUST** compare the definitions and scope of two terms before mapping them. Matching labels ("Asset" and "Asset") is not evidence that they mean the same thing.
2. **MUST** record every mapping with an explicit type:

   | Type | Meaning | SKOS property |
   | --- | --- | --- |
   | Exact | Interchangeable in all uses | `skos:exactMatch` |
   | Close | Similar enough for some uses, not all | `skos:closeMatch` |
   | Broader | Target is more general | `skos:broadMatch` |
   | Narrower | Target is more specific | `skos:narrowMatch` |
   | Related | Associated, not hierarchical | `skos:relatedMatch` |

3. **MUST NOT** use identity links (`owl:sameAs`) between concepts from different schemes. They merge every statement about both and propagate errors.
4. **MUST** record who or what made each mapping, when, the evidence (quoted definitions), and a confidence. Agent-proposed mappings stay unconfirmed until a person or a check verifies them.
5. **MUST** state what is lost when data moves across a non-exact mapping (for example, "broader: records lose the sub-type").
6. **SHOULD** keep mappings in their own versioned file or table, not inside either vocabulary, so each side can change independently.
7. **SHOULD** use a mapping format others can read (SKOS mapping properties, or an SSSOM table) rather than an ad hoc spreadsheet.
8. **SHOULD** re-check mappings when either vocabulary releases a new version.
9. **MAY** map one concept to several targets when the meaning genuinely splits; record each with its own type.

## When to apply

Integrating systems (CMDB to asset register, Intune groups to an HR taxonomy), aligning a local taxonomy with a standard (ISA-95, MITRE ATT&CK, schema.org), migrating tags between tools, and when agents translate between two teams' terms.

## Procedure

1. List source and target concepts with their definitions.
2. For each source concept, find candidates in the target; read definitions and scope notes.
3. Choose the match type; quote the definitions as evidence; set confidence.
4. Review unconfirmed and low-confidence mappings with an owner of each side.
5. Publish the mapping file; note lossy mappings in the integration's docs.

## Examples

| Source | Target | Type | Evidence | Confidence | By |
| --- | --- | --- | --- | --- | --- |
| `cmdb:Server` | `local:G-0008 Asset (IT)` | broadMatch | Target covers all managed devices, source only servers | high | S. Eaton, 2026-11-24 |
| `hr:Contractor` | `iam:External User` | closeMatch | Contractors include on-site staff with internal accounts | medium | agent (unconfirmed) |
| `local:Pump` | `isa95:Equipment` | broadMatch | ISA-95 equipment covers all physical equipment | high | review 2026-11-24 |

## Anti-patterns

- Joining two datasets on a shared label without checking meaning.
- `owl:sameAs` between a local concept and a standard one.
- Mappings with no type ("maps to"), no evidence and no owner.
- Silent data loss when a narrower concept is pushed into a broader one.

## Checklist

- [ ] Definitions compared, not labels
- [ ] Every mapping typed (exact / close / broader / narrower / related)
- [ ] Evidence, author, date and confidence recorded
- [ ] No cross-scheme identity links
- [ ] Mapping file versioned; lossy mappings documented

## References

- [W3C SKOS Reference — Mapping properties](https://www.w3.org/TR/skos-reference/#mapping)
- [SSSOM](https://mapping-commons.github.io/sssom/)
