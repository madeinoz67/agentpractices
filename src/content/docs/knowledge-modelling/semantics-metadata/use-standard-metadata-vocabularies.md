---
title: Describe resources with standard metadata vocabularies
description: Attach metadata using established vocabularies (DCMI Terms, schema.org, PROV-O, DCAT, SKOS) in valid JSON-LD instead of inventing field names, and record provenance — who or what produced it, from what, when.
id: BP-0025
domain: D.KNO.SEM
type: guideline
roles: [implementer, any]
stage: [build]
status: draft
version: 1.0.0
updated: 2026-11-24
related: [BP-0024, BP-0026, BP-0012, BP-0013]
sources:
  - { title: DCMI Metadata Terms, url: https://www.dublincore.org/specifications/dublin-core/dcmi-terms/ }
  - { title: schema.org, url: https://schema.org/ }
  - { title: W3C PROV-O The PROV Ontology, url: https://www.w3.org/TR/prov-o/ }
  - { title: W3C DCAT Data Catalog Vocabulary, url: https://www.w3.org/TR/vocab-dcat-3/ }
  - { title: W3C JSON-LD 1.1, url: https://www.w3.org/TR/json-ld11/ }
---

## Rules

1. **MUST** look for an existing standard property before inventing a field: title, creator, date, licence, subject, identifier and source all have standard terms.
2. **MUST** choose the vocabulary that fits the resource:

   | Describing | Use |
   | --- | --- |
   | Documents, records, general resources | DCMI Terms (`dcterms:title`, `creator`, `created`, `modified`, `license`, `subject`, `identifier`, `source`) |
   | Web pages, products, people, organisations, events | schema.org |
   | Where data came from, which agent or process produced it | PROV-O (`prov:wasGeneratedBy`, `wasDerivedFrom`, `wasAttributedTo`, `generatedAtTime`) |
   | Datasets and data catalogues | DCAT |
   | Concepts, taxonomies, tag values | SKOS |

3. **MUST** record provenance for anything an agent generates or changes: the agent or tool, its version, the inputs it used, and when. Mark AI-generated content as such.
4. **MUST** use standard formats for values: ISO 8601 dates with time zone, IETF language tags (`en-AU`), SPDX licence identifiers, and resolvable URIs or stable IDs rather than free text for people, organisations and concepts.
5. **MUST** validate JSON-LD by expanding it (for example with a JSON-LD library) and checking the expected triples appear. JSON with an `@context` that nobody expanded often means nothing.
6. **SHOULD** keep one shared `@context` per project, versioned, rather than a different context in each file.
7. **SHOULD** add custom properties only for what no standard covers, in your own namespace, each with a definition in the glossary ([BP-0024](/knowledge-modelling/semantics-metadata/define-terms-once/)).
8. **SHOULD** validate metadata against a schema (JSON Schema or SHACL) where completeness matters; JSON-LD contexts and RDF vocabularies do not enforce required fields.

## When to apply

Catalogues, document stores, knowledge bases, agent memory entries, generated reports and datasets — anything another system, person or agent will search, filter or trust.

## Examples

Provenance for an agent-written summary:

```json
{
  "@context": { "dcterms": "http://purl.org/dc/terms/", "prov": "http://www.w3.org/ns/prov#" },
  "@id": "urn:uuid:4f1c…",
  "dcterms:title": "Weekly CI failure summary",
  "dcterms:created": "2026-11-24T13:05:00+08:00",
  "dcterms:language": "en-AU",
  "prov:wasAttributedTo": { "@id": "urn:agent:ci-triage-orchestrator", "prov:type": "prov:SoftwareAgent" },
  "prov:wasDerivedFrom": [{ "@id": "https://ci.example.com/runs/8812" }],
  "prov:wasGeneratedBy": { "prov:startedAtTime": "2026-11-24T12:58:00+08:00", "prov:used": { "@id": "urn:model:claude-opus-5-5" } }
}
```

## Anti-patterns

- `author_name`, `created_by`, `owner`, `creator` in four systems for the same thing.
- Dates like `24/11/26`.
- An `@context` copied from a blog post and never expanded.
- Agent output with no record of which agent, model or inputs produced it.

## Checklist

- [ ] Standard vocabulary chosen per resource type
- [ ] Provenance recorded for generated content
- [ ] ISO 8601 dates, language tags, SPDX licences, URIs/IDs
- [ ] JSON-LD expanded and checked; one shared context
- [ ] Custom properties namespaced and defined

## References

- [DCMI Metadata Terms](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/)
- [schema.org](https://schema.org/)
- [PROV-O](https://www.w3.org/TR/prov-o/)
- [DCAT 3](https://www.w3.org/TR/vocab-dcat-3/)
- [JSON-LD 1.1](https://www.w3.org/TR/json-ld11/)
