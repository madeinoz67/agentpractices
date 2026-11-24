---
title: Stop errors amplifying across agents, memory and retrieval
description: Verify at every handoff, not only at the end; pass claims with provenance and status; never treat agreement between agents as proof; gate what enters memory and retrieval corpora; keep generated content out of sources of truth; and trace and retract an error everywhere it spread.
id: BP-0053
domain: D.MAS.HND
type: guideline
roles: [orchestrator, reviewer, implementer, researcher]
stage: [build, verify, operate]
status: draft
version: 1.0.0
updated: 2026-11-24
related: [BP-0052, BP-0003, BP-0048, BP-0043, BP-0012, BP-0031, BP-0029, BP-0051]
sources:
  - { title: 'Singh & Pawar — The Hallucination Snowball: error propagation in multi-agent LLM pipelines (ICML 2026)', url: https://icml.cc/virtual/2026/77915 }
  - { title: 'Xie et al. — From Spark to Fire: Modeling and Mitigating Error Cascades in LLM-Based Multi-Agent Collaboration (2026)', url: https://arxiv.org/abs/2603.04474 }
  - { title: 'Jamshidi et al. — Hallucination Cascade: Analyzing Error Propagation in Multi-Agent LLM Systems (2026)', url: https://arxiv.org/abs/2606.07937 }
---

Amplification is what happens to one unchecked error after it is produced: the next agent builds on it, a summary turns it into narrative, a reviewer agrees with it, memory stores it, retrieval serves it back, and it now reads as established fact. Research on multi-agent pipelines finds errors get harder to detect at each stage, and that checks at each handoff catch far more than one check at the end.

## Rules

### Gate every boundary

1. **MUST** verify at each handoff, not only at the end of the pipeline: the receiving agent (or a gate between them) checks the incoming claims it will build on against sources before using them ([BP-0003](/multi-agent-systems/coordination-handoff/handoff-contracts/), [BP-0048](/multi-agent-systems/coordination-handoff/orchestrate-agent-workflows/)).
2. **MUST** pass claims with provenance and status in every handoff result: source (URL, document, `file:line`, tool call), and verified / unverified / assumption. A downstream agent **MUST NOT** upgrade an unverified claim to verified without checking it itself.
3. **MUST** keep the link from derived values to their inputs: a number in a summary carries its source figure and the calculation, so a reviewer can check it without re-deriving the whole chain.

### Agreement is not evidence

4. **MUST NOT** count agreement between agents as verification when they share a model, a context or a source; they can reach a confident false consensus. Independent verification uses a different source, tool or test, and ideally a fresh context or a different model.
5. **MUST** cap author–reviewer refinement loops and judge against written criteria, so two agents do not polish an error into a convincing one.
6. **SHOULD** limit who hears what: workers report to the orchestrator, which verifies before sharing a conclusion with other workers. Avoid all-to-all agent chat where one error reaches every agent at once ([BP-0043](/multi-agent-systems/communication-protocols/communicate-between-agents/)).

### Guard memory and retrieval

7. **MUST** gate writes to long-term memory and knowledge graphs: store only claims with provenance, mark agent-generated summaries as generated, and prefer facts a person stated or a source confirmed ([BP-0012](/agent-engineering/context-memory/manage-long-term-memory/), [BP-0031](/knowledge-modelling/knowledge-graphs/build-agent-knowledge-graphs/)).
8. **MUST NOT** feed agent output back into a retrieval corpus or knowledge base as a source of truth. If generated content is indexed, label it, keep it out of authoritative collections, and rank primary sources above it ([BP-0029](/agent-engineering/context-memory/evaluate-and-secure-rag/)).
9. **MUST** be able to retract: when an error is found, use provenance and trace IDs to find every downstream artefact, memory entry and index chunk that used it, and correct or remove them all ([BP-0051](/operations/observability/observe-agent-workflows/)).

### Test the gates

10. **SHOULD** test amplification directly: inject known false claims at an early stage of the workflow in evaluations and measure how many reach the final output, memory or index. Do this before and after changing the workflow.

## When to apply

Any pipeline or team where one agent's output becomes another's input, and any system where agents write to memory, a knowledge graph or a retrieval index.

## Examples

Handoff result with claim status:

```yaml
# author: Stephen Eaton
status: done
claims:
  - text: "API v3 deprecates /orders/search"
    source: https://example.com/api/changelog#v3
    status: verified          # quote checked by this agent
  - text: "Traffic to /orders/search is ~2% of calls"
    source: trace-query q-8812
    derived_from: "1,914 / 96,020 calls, 2026-11-17..23"
    status: verified
  - text: "No internal clients still use it"
    status: unverified        # downstream must check before relying on it
```

Snowball, without and with gates:

```text
researcher: "rate limit is 500/min"  (unverified, actually 50)
  → analyst: "capacity = 30k/hour"   (derived)
  → writer:  "ample headroom for launch" (narrative)
  → reviewer agrees (same sources)    → memory: "rate limit 500/min"

with a gate at analyst: claim checked against API docs → corrected to 50/min before any derivation.
```

## Anti-patterns

- One review at the very end of a five-agent pipeline.
- "Three agents agreed, so it is right."
- Summaries that drop the source of every number.
- Agents writing their own conclusions into long-term memory as fact.
- Indexing agent reports into the same corpus the agents retrieve from.
- Fixing an error in the final report but not in memory or the index.

## Checklist

- [ ] Claims checked at every handoff they are built on
- [ ] Provenance and status carried in every handoff; no silent upgrades
- [ ] Agreement not counted as verification; refinement loops capped
- [ ] Memory and knowledge-graph writes gated; generated content labelled
- [ ] Generated content kept out of authoritative retrieval sources
- [ ] Retraction path via provenance; amplification tested with injected errors

## References

- [The Hallucination Snowball (ICML 2026)](https://icml.cc/virtual/2026/77915)
- [From Spark to Fire: error cascades in LLM multi-agent systems](https://arxiv.org/abs/2603.04474)
- [Hallucination Cascade: error propagation in multi-agent LLM systems](https://arxiv.org/abs/2606.07937)
