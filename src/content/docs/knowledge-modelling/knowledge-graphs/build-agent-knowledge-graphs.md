---
title: Build knowledge graphs agents can trust
description: Use a graph when questions depend on relationships, give it a schema from an ontology, resolve entities to stable IDs, put provenance, trust and time on every fact, and retrieve by traversal combined with text search.
id: BP-0031
domain: D.KNO.KG
type: guideline
roles: [implementer, researcher, any]
stage: [plan, build, operate]
status: draft
version: 1.0.1
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0014, BP-0024, BP-0025, BP-0026, BP-0012, BP-0028, BP-0029]
sources:
  - title: "Edge et al. — From Local to Global: A GraphRAG Approach to Query-Focused Summarization"
    url: https://arxiv.org/abs/2404.16130
    note: Query-focused summarization over entity communities, the basis for whole-corpus answers that rule 12 requires
  - title: W3C RDF 1.1 Concepts
    url: https://www.w3.org/TR/rdf11-concepts/
    note: The triple model and its terms, IRIs, literals and blank nodes, which the node and relationship schema in rule 3 is written against
  - title: W3C SHACL Shapes Constraint Language
    url: https://www.w3.org/TR/shacl/
    note: "Shape constraints that make the every-load schema validation of rule 4 machine-checkable: required properties, allowed relationships, cardinality"
  - title: W3C PROV-O
    url: https://www.w3.org/TR/prov-o/
    note: Vocabulary for recording which agent extracted a fact, from which source document, and when
---
## Rules

### When

1. **MUST** choose a graph only when the questions depend on relationships: "what depends on X", "who owns what", "what changed and why", multi-hop paths, or summaries across a whole corpus. For "find passages about X", text retrieval ([BP-0028](/agent-engineering/context-memory/retrieve-context-well/)) is simpler and enough.
2. **MUST** write the competency questions the graph must answer before building it, and test the graph against them.

### Schema

3. **MUST** define node and relationship types from an ontology or a small explicit schema ([BP-0014](/knowledge-modelling/ontology/close-corpus-coverage-gaps/), [BP-0024](/knowledge-modelling/semantics-metadata/define-terms-once/)), with each relationship type named, directed and defined. Do not let extraction invent new types freely.
4. **MUST** validate the graph against its schema (SHACL, LinkML, or the graph database's constraints) on every load: required properties, allowed relationship types, cardinality.

### Entities

5. **MUST** resolve every mention to a stable entity ID before it enters the graph: merge spellings, acronyms and aliases of the same thing; keep different things with the same name apart. Record aliases on the entity.
6. **MUST NOT** merge two entities on name alone. Use identifiers, attributes or context, and keep low-confidence merges reversible (a "possibly same as" link for review rather than a merge).

### Facts

7. **MUST** attach provenance to every node and relationship: source document and location, the agent or process that extracted it, when, and a confidence ([BP-0025](/knowledge-modelling/semantics-metadata/use-standard-metadata-vocabularies/)).
8. **MUST** attach a trust level and keep agent-extracted facts below verified facts until checked; let queries exclude untrusted facts.
9. **MUST** record when a fact is true (valid-from and valid-until), separately from when it was written, and supersede rather than overwrite facts that change, so the graph can answer "as of" questions.
10. **SHOULD** store contradictions as contradictions (both facts, linked) for review, not silently keep the last one written.

### Retrieval and operation

11. **SHOULD** retrieve by combining entity lookup and graph traversal with text search over the linked source passages, and cite both the facts and their sources in answers.
12. **SHOULD** use pre-computed summaries of densely connected groups of entities (as in GraphRAG) for whole-corpus questions, and regenerate them when the graph changes significantly.
13. **MUST** apply the same access control to the graph as to its sources, including relationships that reveal sensitive connections, and the same untrusted-data handling to text stored in nodes ([BP-0029](/agent-engineering/context-memory/evaluate-and-secure-rag/)).
14. **SHOULD** monitor graph quality: orphan nodes, duplicate entities, unused relationship types, facts with no source, and growth in untrusted facts.

## When to apply

Building agent memory as a graph, extracting knowledge graphs from documents or code, CMDB or asset relationship models, security knowledge (ATT&CK-style), and GraphRAG.

## Examples

A fact with provenance, trust and time (property-graph style):

```json
{
  "from": "asset:MP01", "rel": "RUNS_ROLE", "to": "role:management-point",
  "valid_from": "2026-11-10", "valid_until": null,
  "source": { "doc": "sop:sccm-upgrade", "section": "2.4" },
  "extracted_by": "agent:kg-builder@1.2", "extracted_at": "2026-11-24T21:00:00+08:00",
  "confidence": 0.92, "trust": "inferred"
}
```

| Question | Graph or text? |
| --- | --- |
| "Which site systems depend on PS01?" | Graph traversal |
| "What does the SOP say about rollback?" | Text retrieval |
| "What are the main risk themes across all incident reports?" | Graph community summaries |
| "Who owned this server last March?" | Graph with valid-time |

## Anti-patterns

- Letting an LLM extract entities and relationship types with no schema, then querying a graph of near-duplicates.
- Merging "Mercury (planet)" and "Mercury (element)" because the names match.
- Facts with no source, date or confidence.
- Overwriting a changed fact so history is lost.
- A graph that bypasses the access controls of the documents it was built from.

## Checklist

- [ ] Competency questions need relationships; graph tested against them
- [ ] Schema from an ontology; validated on load
- [ ] Entities resolved to stable IDs; uncertain merges reversible
- [ ] Every fact has provenance, trust, confidence and valid time
- [ ] Contradictions kept and flagged
- [ ] Retrieval combines traversal and text; access control enforced

