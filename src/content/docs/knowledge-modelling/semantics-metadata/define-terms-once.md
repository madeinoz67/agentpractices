---
title: Define each term once and use it with one meaning
description: Keep a controlled glossary with stable IDs, one preferred label, synonyms and a genus-plus-differentia definition per term; disambiguate overloaded words; and use the preferred term consistently in code, data, docs and prompts.
id: BP-0024
domain: D.KNO.SEM
type: guideline
roles: [any, planner, implementer]
stage: [plan, build]
status: draft
version: 1.0.0
updated: 2026-11-24
related: [BP-0025, BP-0026, BP-0004, BP-0009]
sources:
  - { title: W3C SKOS Simple Knowledge Organization System Reference, url: https://www.w3.org/TR/skos-reference/ }
  - { title: 'ISO 704:2022 Terminology work — Principles and methods', url: https://www.iso.org/standard/79077.html }
---

## Rules

1. **MUST** keep one glossary (controlled vocabulary) per project or domain, in version control, as the single place terms are defined.
2. **MUST** give each concept a stable ID, one preferred label per language, and its synonyms, acronyms and legacy names as alternative labels. Refer to concepts by ID in data and code; labels can change.
3. **MUST** define each concept as "a *broader concept* that *distinguishing characteristic*" (genus plus differentia). A definition that restates the label, or uses the term to define itself, does not count.
4. **MUST** split a word that means two things into two concepts with qualified labels ("Tag (metadata)" and "Tag (instrument)"), and say in each definition which one it is.
5. **MUST** use the preferred label consistently: in code identifiers, field names, docs, prompts and agent instruction files. Do not vary terms for style.
6. **MUST NOT** reuse an existing term with a new meaning. Add a new concept, or deprecate the old one with a pointer to its replacement.
7. **SHOULD** give a scope note where a definition alone leaves doubt ("Includes … Excludes …").
8. **SHOULD** check new docs, schemas and prompts against the glossary (a linter or review step that flags non-preferred labels).
9. **SHOULD** publish the glossary machine-readably (SKOS JSON-LD or a plain JSON/YAML with IDs) so agents can resolve terms.
10. **MAY** link glossary terms to standard vocabularies with explicit mappings ([BP-0026](/knowledge-modelling/semantics-metadata/map-between-vocabularies/)).

## When to apply

Any project where people and agents must mean the same thing by the same word: data models, APIs, runbooks, policies, multi-agent handoffs, and prompts. Especially where a word is used differently by different teams ("asset", "incident", "user", "tag").

## Procedure

1. Collect the terms that cause confusion: from tickets, reviews, and places agents guessed wrong.
2. For each, write ID, preferred label, alternative labels, definition, scope note.
3. Resolve clashes: split overloaded terms; choose one preferred label per concept.
4. Replace non-preferred labels in code, docs and prompts; add a check to keep them out.

## Examples

```yaml
- id: G-0007
  pref_label: Asset (OT)
  alt_labels: [plant asset, equipment]
  definition: A physical item installed in an operational process that performs a process function.
  scope_note: Includes pumps, valves, PLCs. Excludes IT endpoints (see G-0008 Asset (IT)).
- id: G-0008
  pref_label: Asset (IT)
  alt_labels: [endpoint, device]
  definition: An information-technology device that is managed by the endpoint-management platform.
```

Before: "Update the asset" in an OT runbook and in an Intune runbook, meaning two different things. After: each runbook uses the qualified term, and agents resolve it by ID.

## Anti-patterns

- Three names for one thing ("host", "server", "node") in the same system.
- Definitions like "Asset: an asset".
- Field names that differ from the glossary term ("devId" for Asset (IT) ID).
- Silent redefinition of a term in a new document.

## Checklist

- [ ] One glossary, versioned, with IDs
- [ ] One preferred label per concept; synonyms recorded
- [ ] Genus-plus-differentia definitions; scope notes where needed
- [ ] Overloaded terms split and qualified
- [ ] Preferred labels used in code, data, docs and prompts

## References

- [W3C SKOS Reference](https://www.w3.org/TR/skos-reference/)
- [ISO 704 Terminology work — Principles and methods](https://www.iso.org/standard/79077.html)
