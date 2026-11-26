---
title: Detect coordinated disinformation campaigns by behaviour, not viewpoint
description: Use agents to find disinformation and influence campaigns by coordination and deception (synchronised near-duplicate posting, shared infrastructure, fake personas, laundered sources), not by whether a claim is agreeable; grade attribution with stated confidence, weigh reach before responding, leave every label and response to a person, and protect your own agents' sources from campaigns aimed at AI ("LLM grooming").
id: BP-0081
domain: D.SEC.INF
type: guideline
roles: [planner, orchestrator, reviewer]
stage: [plan, build, operate]
status: draft
version: 1.0.0
updated: 2026-11-26
reviewed: 2026-11-26
review_by: 2027-05-26
related: [BP-0080, BP-0005, BP-0029, BP-0027, BP-0052, BP-0069, BP-0040, BP-0067, BP-0077]
sources:
  - { title: Carnegie Endowment (Pamment) — The EU's role in fighting disinformation, ABCDE framework, url: https://carnegieendowment.org/research/2020/09/the-eus-role-in-fighting-disinformation-crafting-a-disinformation-framework }
  - { title: UNHCR Information Integrity Toolkit — ABCDE analysis framework, url: https://www.unhcr.org/handbooks/informationintegrity/practical-tools/analysis-potential-impact/abcde-analysis-framework }
  - { title: DISARM Foundation — FAQs (DISARM Red and Blue frameworks), url: https://www.disarm.foundation/faqs }
  - { title: Luceri et al. — Coordinated inauthentic behavior on TikTok (ICWSM), url: https://www.arxiv.org/abs/2505.10867 }
  - { title: Cross-platform coordinated inauthentic activity in the run-up to the 2024 US election, url: https://arxiv.org/html/2410.22716v4 }
  - { title: Axios — NewsGuard report on the Pravda network and AI chatbots, url: https://www.axios.com/2025/03/06/exclusive-russian-disinfo-floods-ai-chatbots-study-finds }
---

A false claim shared by people who believe it is misinformation; it has no organiser, so it is not a campaign. A campaign has coordination and, usually, deception: fake or hijacked accounts, synchronised posting, laundered sources. That is what can be detected reliably and defended in review, so this practice looks for behaviour, and leaves judgements about claims to sourced fact-checks and people.

## Rules

### Frame it so the detection is defensible

1. **MUST** detect campaigns by actor and behaviour (the A and B of the ABCDE framework: actor, behaviour, content, degree, effect), not by whether a claim or viewpoint is agreeable. Agents **MUST NOT** label a viewpoint, party, community or outlet as disinformation; they report coordination and deception, with evidence.
2. **MUST** set the scope and the basis before collecting: what you monitor and why (your brand, products, executives, incident communications, elections within your remit), which platforms and data, how long it is kept, and who sees it ([BP-0067](/security-safety/data-sovereignty-privacy/keep-agent-data-where-it-is-allowed/)). Do not build profiles of private individuals.

### Detect

3. **MUST** look for coordination signals and combine several: near-duplicate posts from different accounts within minutes, shared links and hashtag sequences, bursts of new accounts, recycled or generated personas, shared infrastructure (domains registered together, common hosting or analytics IDs), and the same push on several platforms. No single signal is proof; organic communities also post alike.
4. **MUST** trace provenance: where and when content first appeared, which sites copy it, domain age and relationships, and Content Credentials (C2PA) where present. Treat claims as true or false only on published, sourced fact-checks or primary records, never on a model's say-so ([BP-0052](/agent-engineering/workflow/prevent-and-catch-hallucinations/)).
5. **SHOULD** tag findings with DISARM techniques (Red framework) and planned countermeasures (Blue framework), so reports compare over time and can be shared with partners in STIX, as ATLAS IDs are for attacks on AI ([BP-0077](/security-safety/ai-security-frameworks-threat-modelling/map-agent-risks-to-ai-security-frameworks/)).
6. **MUST** treat everything collected as hostile input to the agent: campaign content is written to persuade, and may carry instructions aimed at the systems that read it ([BP-0005](/security-safety/prompt-injection-untrusted-input/treat-observed-content-as-data/)).

### Assess before anyone responds

7. **MUST** separate what was observed from what is assessed, and grade attribution with a stated confidence (low, moderate, high) and the evidence behind it. Never attribute a campaign to a state, company or group on one signal, and never let an agent publish an attribution.
8. **MUST** estimate degree and effect (reach, which audiences, any real-world impact) before responding. Many campaigns get little traction, and a loud response can amplify one.
9. **MUST** send every flagged cluster to an analyst. Agents collect, cluster and summarise evidence; people decide on labels, platform reports, takedown requests, partner sharing and public statements ([BP-0069](/agent-engineering/workflow/design-human-approvals-people-read/)). Keep the evidence: archived copies, hashes, timestamps and the queries that found them ([BP-0040](/operations/observability/keep-an-audit-trail/)).
10. **MUST NOT** answer a campaign with inauthentic means: no sock puppets, no undisclosed amplification. Respond through platform reporting channels, partners and your own attributed communications.

### Protect your own agents' sources

11. **MUST** assume the web sources your agents retrieve can be seeded on purpose. Networks of mirror sites have been built to place narratives in search results and AI answers ("LLM grooming"). Keep source allow and deny lists with reasons, down-rank networks of sites that republish the same content, require independent corroboration before an agent states a contested fact, cite sources, and log retrieved URLs ([BP-0029](/agent-engineering/context-memory/evaluate-and-secure-rag/), [BP-0027](/agent-engineering/context-memory/prepare-a-corpus-for-retrieval/)).
12. **SHOULD** test your agents periodically against known campaign narratives, taken from fact-checking organisations, and track how often they repeat or cite them. Re-run after model, retrieval or source-list changes.

## When to apply

When building or running monitoring for campaigns against your organisation, its people, products or communications; when an agent's outputs depend on web search or retrieved news; and before an incident or election period in which you expect manipulation.

## Evidence on campaigns aimed at AI

NewsGuard audited 10 major chatbots against narratives from the Moscow-based "Pravda" network of about 150 sites, and found they repeated the network's false claims about a third of the time. The aim of the network, as reported, was less to persuade people directly than to flood search results and crawlers so AI systems would pick the narratives up. Blocking the network's domains alone does not fix it, because the same narratives also appear in their original sources; corroboration and source weighting (rule 11) matter more than a single deny list.

## Examples

Coordination finder (Bun, TypeScript). It flags groups of accounts that repeatedly post near-identical text within a short window, using 3-word shingles and Jaccard similarity, and returns the matching post pairs as evidence. It says nothing about whether the text is true:

```ts
// author: Stephen Eaton
// find-coordination.ts — flag groups of accounts that repeatedly post near-identical text within a short window.
// It finds behaviour (synchronised near-duplicates), not truth or viewpoint; every cluster goes to an analyst.
export type Post = { account: string; at: string; text: string; url?: string };
export type Options = { windowMin: number; minSimilarity: number; minCoPosts: number };
type Evidence = { a: string; b: string; atA: string; atB: string; similarity: number };
export type Cluster = { accounts: string[]; evidence: Evidence[] };

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
const shingles = (s: string, k = 3) => {
  const w = norm(s), out = new Set<string>();
  for (let i = 0; i + k <= w.length; i++) out.add(w.slice(i, i + k).join(' '));
  return out;
};
const jaccard = (x: Set<string>, y: Set<string>) => {
  let inter = 0;
  for (const v of x) if (y.has(v)) inter++;
  return x.size + y.size - inter ? inter / (x.size + y.size - inter) : 0;
};

export function findCoordination(posts: Post[], o: Options): Cluster[] {
  const p = posts.map((x) => ({ ...x, t: Date.parse(x.at), sh: shingles(x.text) })).sort((a, b) => a.t - b.t);
  const pairs = new Map<string, Evidence[]>(); // "a|b" -> matching post pairs
  for (let i = 0; i < p.length; i++)
    for (let j = i + 1; j < p.length && p[j].t - p[i].t <= o.windowMin * 60_000; j++) {
      if (p[i].account === p[j].account) continue;
      const s = jaccard(p[i].sh, p[j].sh);
      if (s < o.minSimilarity) continue;
      const [a, b] = [p[i].account, p[j].account].sort();
      const key = `${a}|${b}`;
      pairs.set(key, [...(pairs.get(key) ?? []), { a, b, atA: p[i].at, atB: p[j].at, similarity: Math.round(s * 100) / 100 }]);
    }
  // union accounts linked by enough co-posts
  const parent = new Map<string, string>();
  const find = (x: string): string => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x)!)), parent.get(x)!));
  const ev = new Map<string, Evidence[]>();
  for (const [key, list] of pairs) {
    if (list.length < o.minCoPosts) continue;
    const [a, b] = key.split('|');
    for (const x of [a, b]) if (!parent.has(x)) parent.set(x, x);
    parent.set(find(a), find(b));
    ev.set(key, list);
  }
  const groups = new Map<string, Cluster>();
  for (const x of parent.keys()) {
    const r = find(x);
    groups.set(r, groups.get(r) ?? { accounts: [], evidence: [] });
    groups.get(r)!.accounts.push(x);
  }
  for (const [key, list] of ev) groups.get(find(key.split('|')[0]))!.evidence.push(...list);
  return [...groups.values()].map((g) => ({ ...g, accounts: g.accounts.sort() })).filter((g) => g.accounts.length >= 2);
}
```

Usage, with every cluster going to an analyst queue:

```ts
// author: Stephen Eaton
import { findCoordination } from './find-coordination';
const clusters = findCoordination(posts, { windowMin: 10, minSimilarity: 0.7, minCoPosts: 2 });
for (const c of clusters) await queueForAnalyst({ kind: 'possible-coordination', accounts: c.accounts, evidence: c.evidence });
```

Tested with Bun 1.4 and four unit tests:
- Three accounts posting near-identical text minutes apart, twice, are returned as one cluster, with the post pairs and similarity scores as evidence.
- An ordinary user saying something similar hours later is not included.
- Requiring three co-posts instead of two returns nothing: a single coincidence is not coordination.
- The same posts spread an hour apart return nothing.

## Anti-patterns

- A classifier that flags posts as "disinformation" because of their topic or viewpoint.
- Attributing a campaign to a state actor from one shared link or one similar phrase.
- Auto-reporting or auto-replying to flagged accounts without an analyst.
- Counter-campaigns run through fake or undisclosed accounts.
- An agent that answers questions from whatever ranks first in search, with no source weighting or corroboration.
- Collecting everything about everyone "in case", with no scope, retention or access limits.

## Checklist

- [ ] Scope, platforms, data, retention and access agreed before collection
- [ ] Detection on coordination and deception signals, several combined; no viewpoint labels
- [ ] Provenance traced; claims judged only on sourced fact-checks or primary records
- [ ] DISARM tags on findings; evidence archived with hashes and timestamps
- [ ] Attribution graded with confidence; agents never publish attribution
- [ ] Degree and effect assessed before any response; analyst decides every action
- [ ] Agents' sources weighted, corroborated and logged; tested against known campaign narratives
