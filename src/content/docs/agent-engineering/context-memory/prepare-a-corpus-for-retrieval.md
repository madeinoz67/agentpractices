---
title: Prepare a corpus for retrieval
description: Ingest only trusted, current sources; chunk by document structure; give every chunk its context, metadata, provenance and access labels; deduplicate; and re-index when sources change.
id: BP-0027
domain: D.AGT.CTX
type: guideline
roles: [implementer, any]
stage: [build, operate]
status: draft
version: 1.0.1
updated: 2026-11-25
reviewed: 2026-11-25
review_by: 2027-05-25
related: [BP-0028, BP-0029, BP-0025, BP-0024]
sources:
  - { title: Anthropic — Introducing Contextual Retrieval, url: https://www.anthropic.com/news/contextual-retrieval }
  - { title: OWASP LLM09:2026 Vector and Embedding Weaknesses, url: https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/ }
---

## Rules

1. **MUST** ingest only sources with a known owner and trust level, and record that trust level on every chunk. Validate and authenticate content before it is embedded; what goes into the index is what the agent will later believe.
2. **MUST** carry access-control labels (tenant, classification, groups allowed) from the source onto every chunk at ingest, so retrieval can enforce them.
3. **MUST** chunk along the document's structure (headings, sections, functions, table rows), not at fixed character counts that cut sentences, code or tables in half.
4. **MUST** give each chunk enough context to stand alone: the document title, section path, and a one-line situating summary, added to both the embedded text and the keyword index.
5. **MUST** store metadata with each chunk using standard properties ([BP-0025](/knowledge-modelling/semantics-metadata/use-standard-metadata-vocabularies/)): source URI, document ID, section, version or modified date, author, language, trust level, access labels, and the embedding model and version used.
6. **MUST** keep the index in step with its sources: re-index on change, delete chunks when the source is deleted or access is revoked, and record when each source was last indexed.
7. **MUST NOT** embed secrets, credentials or personal data that retrieval users are not allowed to see. Embeddings can leak their source text.
8. **SHOULD** deduplicate and remove boilerplate (navigation, footers, repeated disclaimers) before chunking.
9. **SHOULD** keep the original text alongside the vector, so answers can quote and cite the exact source passage.
10. **SHOULD** re-embed the whole corpus when the embedding model changes; never mix vectors from different models in one index.
11. **MAY** normalise vocabulary at ingest (preferred labels from the glossary, [BP-0024](/knowledge-modelling/semantics-metadata/define-terms-once/)) to improve keyword matching.

## When to apply

Building or maintaining any retrieval index an agent uses: document search, knowledge bases, code and runbook search, agent long-term memory.

## Examples

A chunk record:

```json
{
  "id": "doc-412#s3.2-c1",
  "text": "To restart the MP role, stop the SMS_EXECUTIVE service …",
  "context": "SCCM in-place upgrade SOP › 3.2 Management point recovery. Describes restarting the management point after the OS upgrade.",
  "source": "https://sharepoint.example.com/sop/sccm-upgrade.docx",
  "section": ["3 Recovery", "3.2 Management point"],
  "modified": "2026-11-10T09:12:00+08:00",
  "trust": "verified",
  "access": { "tenant": "it-ops", "classification": "internal", "groups": ["endpoint-team"] },
  "embedding_model": "example-embed-v3"
}
```

## Anti-patterns

- Crawling everything reachable and indexing it with no owner or trust level.
- 512-character chunks that split a procedure step from its warning.
- Access checks done only in the prompt ("only answer if the user is allowed").
- Deleted or superseded documents still retrievable months later.

## Checklist

- [ ] Sources owned, validated and trust-labelled
- [ ] Access labels on every chunk
- [ ] Structure-aware chunks with situating context
- [ ] Standard metadata, original text kept
- [ ] Re-index and delete on source change; single embedding model per index
- [ ] No secrets or unauthorised personal data embedded

## References

- [Anthropic — Introducing Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval)
- [OWASP LLM09:2026 Vector and Embedding Weaknesses](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/)
