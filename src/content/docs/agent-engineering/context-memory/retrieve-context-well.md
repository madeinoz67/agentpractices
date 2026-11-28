---
title: Retrieve context with hybrid search, filters and reranking, and cite it
description: Combine keyword and semantic search, filter by metadata and access before ranking, rerank a wider candidate set, pass only the best passages, cite every claim to its source, and say so when nothing relevant was found.
id: BP-0028
domain: D.AGT.CTX
type: guideline
roles: [implementer, researcher, any]
stage: [build, operate]
status: draft
version: 1.0.1
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0027, BP-0029, BP-0010, BP-0011]
sources:
  - title: "Anthropic — Introducing Contextual Retrieval"
    url: https://www.anthropic.com/news/contextual-retrieval
    note: Measures hybrid BM25 plus embedding search with reranking, the combination rules 2 and 3 require
  - title: "Claude Cookbook — Enhancing RAG with contextual retrieval"
    url: https://platform.claude.com/cookbook/capabilities-contextual-embeddings-guide
    note: Code for building contextual embeddings and searching them, with an accuracy check you can rerun on your corpus
---
## Rules

1. **MUST** enforce access control in the retrieval layer, before ranking: filter by the caller's tenant, groups and classification server-side. Never retrieve first and ask the model to hide what the user may not see.
2. **MUST** use hybrid retrieval: keyword (BM25) and semantic (embedding) search together. Keyword search finds exact identifiers, error codes and names that embeddings miss; semantic search finds paraphrases.
3. **SHOULD** retrieve a wider candidate set (for example the top 50–150) and rerank it with a reranking model, then pass only the best few passages (for example 5–20) to the model.
4. **MUST** apply metadata filters the question implies (product, version, date range, language, document type) instead of hoping ranking sorts them out.
5. **MUST** cite every claim in the answer to the passage it came from (source and section), and quote exactly where wording matters.
6. **MUST** say when retrieval found nothing relevant, or found conflicting sources, instead of answering from general knowledge as if it were sourced.
7. **SHOULD** prefer the newest version when sources conflict, unless the question asks about a specific version, and say that a conflict existed.
8. **SHOULD** rewrite or decompose vague or multi-part questions into focused queries before retrieving, and retrieve again when the first results do not answer the question.
9. **SHOULD** keep retrieved text compact in context: passages, not whole documents; drop them once the answer is drafted ([BP-0011](/agent-engineering/context-memory/manage-short-term-memory/)).
10. **SHOULD** use a structured index instead of text retrieval where one exists: a code index for symbols ([BP-0010](/agent-engineering/context-memory/use-a-code-index/)), a database query for records.
11. **MAY** skip retrieval and load the whole source when it is small enough to fit comfortably in context; RAG is for corpora that do not.

## When to apply

Any agent answering from a document corpus, knowledge base or memory store.

## Procedure

1. Resolve the caller's identity and access labels.
2. Derive filters and focused queries from the question.
3. Run keyword and semantic search with the access and metadata filters; merge the candidates.
4. Rerank; keep the best passages.
5. Answer with citations; flag gaps and conflicts.

## Examples

Good answer shape: "Restart the SMS_EXECUTIVE service, then check the MP status page [SOP sccm-upgrade §3.2, modified 2026-11-10]. The older runbook says to reboot the server instead [runbook mp-recovery §2, 2024-03-01]; the SOP is newer."

Bad: an answer with no sources, mixing a 2019 procedure with the current one, from a tenant the user cannot access.

## Anti-patterns

- Vector-only search that cannot find "error 0x80070005".
- Stuffing the top 50 chunks into the prompt unranked.
- Access filtering in the prompt.
- Confident answers when nothing relevant was retrieved.

## Checklist

- [ ] Access enforced server-side before ranking
- [ ] Hybrid keyword + semantic search; metadata filters applied
- [ ] Wide candidate set reranked; few passages passed
- [ ] Every claim cited; gaps and conflicts stated

