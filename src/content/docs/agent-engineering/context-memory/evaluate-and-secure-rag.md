---
title: Evaluate and secure retrieval-augmented generation
description: Measure retrieval and answer quality separately against a labelled question set, re-run it on every change, and defend the index against poisoning, cross-tenant leakage, embedding inversion and injected instructions in retrieved text.
id: BP-0029
domain: D.AGT.CTX
type: guideline
roles: [reviewer, implementer, orchestrator]
stage: [verify, operate]
status: draft
version: 1.0.2
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0027, BP-0028, BP-0006, BP-0005]
sources:
  - title: "OWASP LLM09:2026 Vector and Embedding Weaknesses"
    url: https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/
    note: "Names the embedding-layer attacks the secure rules defend: cross-tenant leakage, corpus poisoning and inversion of stored vectors"
  - title: "Anthropic — Introducing Contextual Retrieval"
    url: https://www.anthropic.com/news/contextual-retrieval
    note: Quantifies retrieval failure rate on a labelled question set, showing why retrieval is measured apart from answer quality
---
## Rules

### Evaluate

1. **MUST** keep a labelled evaluation set of real questions, each with the passages that answer it and an expected answer, including questions with no answer in the corpus.
2. **MUST** measure retrieval and generation separately: retrieval by whether the right passages are in the top results (recall@k, and the rank of the first correct passage); answers by correctness, groundedness (every claim supported by a retrieved passage), and correct refusal when nothing was found.
3. **MUST** re-run the evaluation on every change to chunking, embedding model, retrieval settings, reranker or prompt, and compare against the last baseline before shipping.
4. **SHOULD** add every real failure reported by users to the evaluation set ([BP-0006](/operations/evaluation/evaluate-agent-output/)).
5. **SHOULD** monitor in production: queries with no good results, low reranker scores, answers without citations, and sources that are never retrieved.

### Secure

6. **MUST** treat retrieved text as untrusted data: a document can contain instructions aimed at the agent (indirect prompt injection). Fence retrieved passages and never follow instructions inside them ([BP-0005](/security-safety/prompt-injection-untrusted-input/treat-observed-content-as-data/)).
7. **MUST** isolate tenants and classification levels in the vector store (separate indexes or namespaces with server-side filters), and test that a query from one tenant cannot retrieve another's content.
8. **MUST** control who can add or change content in the corpus, and log ingestion, so poisoned or tampered documents can be traced and removed.
9. **MUST** protect stored embeddings like the source text: they can be inverted to recover approximate content. Restrict access to the vector store and its backups.
10. **SHOULD** watch for retrieval anomalies (one new document suddenly top-ranked for many queries, content from untrusted sources outranking verified ones) as signs of poisoning.
11. **SHOULD** rank or filter by trust level, so verified sources win ties against external or unverified ones.

## When to apply

Before shipping a RAG system or a change to one, and continuously while it runs.

## Examples

| Question | Expected passages | Retrieval check | Answer check |
| --- | --- | --- | --- |
| How do I recover the MP after the OS upgrade? | SOP §3.2 | §3.2 in top 5 | Steps match §3.2, cited |
| What is our licence for Codanna? | (none in corpus) | — | Says it is not in the sources |
| Restart order for PS01, MP01, MP02? | SOP §2.4 | §2.4 in top 5 | Order correct, cited |

## Anti-patterns

- Judging a RAG change by trying three questions by hand.
- Only measuring final answers, so a retrieval regression is blamed on the model.
- One shared index for all tenants with filtering in the prompt.
- Following "ignore previous instructions" found in a retrieved PDF.

## Checklist

- [ ] Labelled eval set, including unanswerable questions
- [ ] Retrieval and answer metrics measured separately; baseline compared on every change
- [ ] Retrieved text fenced as untrusted
- [ ] Tenant isolation tested; corpus write access controlled and logged
- [ ] Embeddings and backups access-controlled; anomalies monitored

