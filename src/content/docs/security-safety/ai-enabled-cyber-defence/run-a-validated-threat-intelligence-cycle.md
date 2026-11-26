---
title: Run a validated threat intelligence cycle with agents
description: Use agents across the threat intelligence cycle — direction, collection, processing, analysis, dissemination and feedback — with intelligence requirements driving collection, rules extracting indicators and people validating them, every item carrying provenance, an Admiralty rating, a TLP marking and an expiry, TLP enforced in code before anything leaves, and products judged by whether they changed a decision or a detection.
id: BP-0082
domain: D.SEC.CYD
type: guideline
roles: [planner, implementer, reviewer, orchestrator]
stage: [plan, build, operate]
status: draft
version: 1.0.0
updated: 2026-11-26
reviewed: 2026-11-26
review_by: 2027-05-26
related: [BP-0080, BP-0081, BP-0077, BP-0005, BP-0052, BP-0067, BP-0033, BP-0064, BP-0040, BP-0059]
sources:
  - { title: FIRST — Traffic Light Protocol (TLP) 2.0, url: https://www.first.org/tlp/ }
  - { title: CISA — TLP 2.0 user guide, url: https://www.cisa.gov/sites/default/files/2023-02/tlp-2-0-user-guide_508c.pdf }
  - { title: OASIS — STIX 2.1 and TAXII 2.1 (CTI TC), url: https://oasis-open.github.io/cti-documentation/ }
  - { title: SANS — Enhance your cyber threat intelligence with the Admiralty System, url: https://sans.org/blog/enhance-your-cyber-threat-intelligence-with-the-admiralty-system }
  - { title: MISP — warninglists (known false positives), url: https://www.github.com/MISP/misp-warninglists }
  - { title: A SoK for SoCs — AI for cyber threat intelligence generation and sharing, url: https://arxiv.org/pdf/2609.01174 }
  - { title: LANCE and PRISM — understanding and improving IoC extraction from threat reports, url: https://arxiv.org/pdf/2506.11325 }
  - { title: MITRE ATT&CK, url: https://attack.mitre.org/ }
---

Threat intelligence is only useful if it is relevant, accurate, timely and reaches the person or system that acts on it. Agents are good at the volume work in the middle of the cycle: reading reports, extracting and enriching indicators, mapping to ATT&CK, drafting products. They are not reliable enough to decide alone what is true, what is relevant, or who may see it, and much of what they read is adversary-written.

## Rules

### Direction: know what you need

1. **MUST** write intelligence requirements before collecting: the decisions the intelligence supports and the questions it answers (for example "which actors target our sector's OT vendors", "is this vulnerability exploited in the wild"), each with an owner and a review date. Collection that answers no requirement is cut.
2. **MUST** keep a register of sources: what each one covers, its terms of use, its TLP and licence limits, and a source reliability grade (Admiralty A–F) reviewed as its track record grows.

### Collection: gather it safely

3. **MUST** treat every report, feed, paste, forum post and sample as hostile input to the agents that read it: they are written by or about adversaries and can carry instructions or malicious content ([BP-0005](/security-safety/prompt-injection-untrusted-input/treat-observed-content-as-data/)). Handle samples and live infrastructure only in isolated environments, never from an agent with production credentials.
4. **MUST** respect each source's TLP and terms at the point of collection: data marked above what a processing step may see does not go to that step. TLP:AMBER and above do not go to a model or service outside your control unless the source permits it ([BP-0067](/security-safety/data-sovereignty-privacy/keep-agent-data-where-it-is-allowed/), [BP-0033](/security-safety/least-privilege-secrets/keep-secrets-out-of-agent-context/)).

### Processing: extract and dissect with rules first

5. **MUST** extract indicators with deterministic rules (patterns, refanging of `hxxp` and `[.]`, deduplication) and use models for context: whether a value is attacker infrastructure, victim infrastructure or noise, which ATT&CK techniques the behaviour shows, and a summary. Measured on labelled reports, rules recover nearly every indicator but over-report, while models alone miss most of them; neither is good enough without a person.
6. **MUST** filter known-benign values before anything else sees them (public DNS resolvers, private address ranges, major CDN and cloud ranges, empty-file hashes, test signatures), using maintained lists such as MISP warninglists, and record why each value was dropped.
7. **MUST** attach to every item: the source report and location, the source reliability and information credibility (Admiralty, for example B2), the TLP marking, first and last seen dates, and an expiry. Infrastructure indicators expire quickly unless re-confirmed; file hashes last longer.
8. **SHOULD** normalise to STIX 2.1 objects and exchange over TAXII or MISP, so markings, relationships and provenance travel with the data.

### Analysis: validate before it counts

9. **MUST** have a person validate indicators and assessments before they drive blocking, detection or a product. Rate information credibility per claim (1–6), count corroboration only from independent collection (two vendors repeating one source is one source), and record what contradicts it.
10. **MUST** check every fact an agent states against the source: CVE IDs, exploitation status, ATT&CK technique IDs, actor names and dates are looked up, not taken from the model ([BP-0052](/agent-engineering/workflow/prevent-and-catch-hallucinations/)).
11. **MUST** state assessments with confidence (low, moderate, high) and separate them from observed facts; attribution to an actor needs more than shared indicators.

### Dissemination: right audience, right marking

12. **MUST** enforce TLP in code at every exit: a gate checks each item's marking against each destination (SIEM, managed-service clients, sharing community, public, external model APIs) and refuses unknown markings and destinations. An agent cannot relabel a marking downward; only the originator can.
13. **MUST** shape products for the reader: indicators and detections for tools, technical reports for analysts, a short statement of risk and decision for executives. Each product says what it means for this organisation, what to do, and by when.
14. **SHOULD** turn validated intelligence into detections and hunts through the normal change path, with test data and a pull request ([BP-0080](/security-safety/ai-enabled-cyber-defence/apply-ai-across-the-six-csf-functions/)); an indicator that never becomes a detection, block or decision is a cost.

### Feedback: prove it was useful

15. **MUST** collect feedback on each product and measure use: detections created, true and false positive hits from each indicator, decisions informed, and requirements answered. Retire sources and feeds that do not contribute, and expire indicators that never hit.
16. **SHOULD** share back what you validate, through your ISAC or community with the right marking, including corrections and false positives you found.

## When to apply

When setting up or reviewing a threat intelligence function, adding agents to report processing or indicator management, connecting a new feed or sharing community, or when indicators are feeding blocks and detections without review.

## Examples

Processing step (Bun, TypeScript): rules extract and refang, known-benign values are dropped with a reason, and each indicator carries provenance, rating, TLP and expiry into a review queue. The TLP gate decides where an item may go:

```ts
// author: Stephen Eaton
// ioc-pipeline.ts — extract indicators from a threat report with rules, drop known-benign values,
// and attach provenance, Admiralty rating, TLP and expiry. Output is a review queue, not a blocklist.
export type Report = { id: string; source: string; reliability: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'; tlp: string; published: string; text: string };
export type Indicator = {
  type: 'ipv4' | 'domain' | 'url' | 'sha256'; value: string; report: string; source: string;
  rating: string; tlp: string; status: 'needs-review'; valid_until: string; dropped?: string;
};

// Days an indicator stays active unless re-confirmed: infrastructure churns faster than file hashes.
const TTL_DAYS = { ipv4: 30, url: 60, domain: 90, sha256: 365 } as const;

const refang = (s: string) => s.replace(/hxxp/gi, 'http').replace(/\[\.\]|\(\.\)|\{\.\}/g, '.').replace(/\[:\]/g, ':');
const PATTERNS: [Indicator['type'], RegExp][] = [
  ['url', /\bhttps?:\/\/[^\s"'<>]+/gi],
  ['sha256', /\b[a-f0-9]{64}\b/gi],
  ['ipv4', /\b(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}\b/g],
  ['domain', /\b(?:[a-z0-9-]+\.)+(?:net|com|org|io|ru|cn|info|top|xyz)\b/gi],
];

// Small stand-in for MISP warninglists: keep the real lists current in production.
const BENIGN: [string, (v: string) => boolean][] = [
  ['rfc1918', (v) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(v)],
  ['public-dns', (v) => ['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1', '9.9.9.9'].includes(v)],
  ['empty-file-hash', (v) => v === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
];

const addDays = (iso: string, d: number) => new Date(Date.parse(iso) + d * 86_400_000).toISOString().slice(0, 10);

export function extract(r: Report, today: string, opts: { keepDropped?: boolean } = {}): Indicator[] {
  const text = refang(r.text);
  const seen = new Set<string>();
  const out: Indicator[] = [];
  const inUrl: string[] = [];
  for (const [type, re] of PATTERNS)
    for (const m of text.matchAll(re)) {
      const value = type === 'sha256' || type === 'domain' ? m[0].toLowerCase() : m[0].replace(/[.,;)]+$/, '');
      if (type === 'url') inUrl.push(value);
      if (type === 'domain' && inUrl.some((u) => u.includes(value))) continue; // already covered by its URL
      if (seen.has(value)) continue;
      seen.add(value);
      const dropped = BENIGN.find(([, test]) => test(value))?.[0];
      if (dropped && !opts.keepDropped) continue;
      out.push({
        type, value, report: r.id, source: r.source,
        rating: `${r.reliability}6`, // credibility 6 (cannot be judged) until corroborated by an independent source
        tlp: r.tlp, status: 'needs-review', valid_until: addDays(today, TTL_DAYS[type]), ...(dropped ? { dropped } : {}),
      });
    }
  return out;
}

// Where each TLP 2.0 marking may go. Unknown markings and destinations are refused.
const ALLOWED: Record<string, string[]> = {
  'TLP:CLEAR': ['internal-siem', 'managed-service-client', 'community-isac', 'public-blog', 'external-llm-api'],
  'TLP:GREEN': ['internal-siem', 'managed-service-client', 'community-isac'],
  'TLP:AMBER': ['internal-siem', 'managed-service-client'],
  'TLP:AMBER+STRICT': ['internal-siem'],
  'TLP:RED': [], // named recipients only, never into shared systems
};
export const mayShare = (tlp: string, destination: string) => (ALLOWED[tlp] ?? []).includes(destination);
```

Tested with Bun 1.4 and four unit tests:
- A report with `hxxps://update-check[.]example-bad[.]net/api` yields the refanged URL, and a repeated IP address once.
- `8.8.8.8`, `10.1.2.3` and the empty-file SHA-256 are dropped with the reasons `public-dns`, `rfc1918` and `empty-file-hash`.
- Each kept indicator carries the report ID, rating `B6`, `TLP:AMBER`, status `needs-review` and an expiry: 30 days for an IP address, a year for a hash.
- The TLP gate:
  - sends `TLP:AMBER` to the internal SIEM, and refuses it for an external model API;
  - refuses `TLP:AMBER+STRICT` to managed-service clients;
  - refuses `TLP:RED` to any shared system, and an unknown marking anywhere.

The destinations in the gate are an example policy; set your own, including whether a contracted model service counts as inside your organisation for TLP:AMBER.

## Anti-patterns

- Feeds piped straight into blocking with no review, expiry or benign filtering, until a CDN range or a public resolver is blocked.
- An LLM asked to "list the IOCs in this report", its answer loaded as-is.
- TLP:AMBER reports pasted into a public chatbot to summarise.
- Two vendor blogs quoting the same original counted as corroboration.
- Indicators kept forever, so detections fire on reassigned addresses.
- Products that describe the threat but not what this organisation should do.
- Collecting every feed available, with no requirement it answers.

## Checklist

- [ ] Intelligence requirements written, owned and reviewed; sources registered with reliability, terms and TLP
- [ ] Collected material treated as hostile; samples handled in isolation
- [ ] Rules extract, models add context, known-benign values dropped with reasons
- [ ] Every item has provenance, Admiralty rating, TLP, dates and expiry
- [ ] Person validates before blocking, detection or publication; facts checked against sources
- [ ] TLP enforced in code at every exit; no downward relabelling by agents
- [ ] Products shaped per audience with actions; feedback and hit rates measured; useless feeds retired
