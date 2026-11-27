---
title: Feed inner-loop agents with a separate outer-loop context agent
description: "Separate context gathering from code work: an outer-loop agent watches external sources and hands the inner loop a filtered, ranked, freshness-stamped brief, with declared triggers, read-only access and a stated failure path."
id: BP-0101
domain: D.MAS.HND
type: pattern
roles: [orchestrator, researcher, implementer]
stage: [build, operate]
status: draft
version: 1.0.0
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0003, BP-0005, BP-0042, BP-0048, BP-0051, BP-0069, BP-0096]
superseded_by: null
sources:
  - title: "Ai insider — Lauren Tan reveals how 30+ AI agents ship PRs while you sleep"
    url: https://www.youtube.com/watch?v=6hxp0SpGxz8
    note: The inner loop (agents changing code toward a snapshot of intent) and outer loop (connector agents watching Slack, X, email and Linear and passing context in) framing, the stale-snapshot problem, the human-as-proxy pattern, and the coordinator that groups a burst of related reports into one piece of work. Behind rules 2, 3, 9 and 12; every other rule is an addition.
  - title: "Anthropic — Effective context engineering for AI agents"
    url: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
    note: Context as a finite attention budget, just-in-time retrieval, compaction and sub-agents that return condensed summaries; behind the filter, the brief and the state-outside-context rules (8, 12 and 13).
  - title: "Anthropic — How we built our multi-agent research system"
    url: https://www.anthropic.com/engineering/multi-agent-research-system
    note: Orchestrator-worker design, sub-agents with their own context windows, the 4x and 15x token multiples, and the finding that vague task descriptions cause duplicated work; behind rules 4, 9 and 12.
  - title: "Google SRE Book — Monitoring Distributed Systems"
    url: https://sre.google/sre-book/monitoring-distributed-systems/
    note: Every page must be actionable and noisy alerts get ignored, so signal must stay scarce; behind the filter, the ranking and the silence signal (rules 8, 10 and 17).
  - title: "OWASP Top 10 for LLM Applications — LLM01 Prompt Injection"
    url: https://genai.owasp.org/llmrisk/llm01-prompt-injection/
    note: Indirect prompt injection through content a model reads, including documents, email and issue text; behind rule 7.
  - title: "RFC 9111 — HTTP Caching, Section 4.2 Freshness"
    url: https://www.rfc-editor.org/rfc/rfc9111.html
    note: The definitions of freshness lifetime and of a stale response, which the freshness stamp and re-check in rule 11 borrow.
  - title: "Anthropic — Building effective agents"
    url: https://www.anthropic.com/engineering/building-effective-agents
    note: Find the simplest solution and add complexity only when it demonstrably improves outcomes, plus pausing for human feedback; behind the simpler-start rule (1) and the approval in rule 15.
---

An agent working a feature or a bug works to a snapshot of intent. The reports that would change that snapshot land somewhere else: a bug report in Slack, a customer email, an alert, a comment on the tracker. Nothing connects those systems to the working loop, so a person becomes the proxy, reading the sources and ferrying context by hand. Pointing the working agent at every source is worse: its context fills with duplicates, noise and text written by strangers, and it acts on stale or injected information.

This practice separates the two jobs. An outer loop watches named sources, filters and ranks what it finds, stamps each item with its provenance and freshness, and hands the inner loop one structured brief per cycle. The inner loop keeps its attention on changing the work product and decides what each item means. The inner/outer loop framing and the stale-snapshot problem come from Lauren Tan's talk (first source). The freshness limits, noise budget, permissions, run record and failure rules are additions, grounded in the sources below.

## Rules

### Choose the shape

1. **SHOULD** start with a fixed scheduled digest that a person reads, and build the outer-loop agent only once the same collect-and-ferry work has repeated often enough that its sources, filter and priority order can be written down; a digest and a human are cheaper than a loop nobody trusts.
2. **MUST** write both role definitions before the first run: the inner loop (the agents that change the work product) and the outer loop (the agents that watch external sources and deliver context). Each names its goal, inputs, outputs, tools, permissions and what it must not do ([BP-0042](/multi-agent-systems/team-topologies-roles/choose-the-simplest-agent-topology/)).
3. **MUST** keep the boundary: the outer loop never edits the work product or the inner loop's files, and the inner loop never reads the raw external sources itself; context crosses only as a delivered brief.
4. **SHOULD** give each external source exactly one outer-loop owner, so two loops never triage the same source and send conflicting briefs.

### Collect with provenance

5. **MUST** list every source the outer loop watches and the signal it takes from each (for example: open issues matching a saved query, alerts firing for a service, messages containing a named defect), and refuse to watch a source for which no signal can be named.
6. **MUST** record on every collected item: source, source ID, `observed_at`, a stable link or verbatim excerpt, and a trust class (internal or external).
7. **MUST** treat all collected text as data, never as instructions, and strip or quarantine instruction-like content before forwarding it ([BP-0005](/security-safety/prompt-injection-untrusted-input/treat-observed-content-as-data/)).

### Filter, cap and rank

8. **MUST** pass every item through a written filter before forwarding: relevant to a stated goal or active work item, new (not already delivered or known), and actionable (it names a symptom, a reproduction, a requester or an owner). An item that fails is logged with the reason and not forwarded.
9. **MUST** cap what one run forwards and group related items into one brief, so a burst of similar reports becomes one item rather than one interruption each.
10. **MUST** rank forwarded items by impact on the current intent (blocking, security or data loss, customer-visible, cosmetic) and record the rank and its reason on each item.

### Stay fresh and hand off

11. **MUST** stamp every brief with `observed_at`, a freshness limit and its sources; re-fetch or re-check an item before restating it as current, and mark anything past its limit stale rather than repeating it as fact.
12. **MUST** deliver context as a structured brief to the inner loop's owner or its intake queue, never by injecting text into a run in progress: what is new since the last brief, each item with its evidence link, the suggested action, and the question the inner loop must answer ([BP-0003](/multi-agent-systems/coordination-handoff/handoff-contracts/)).
13. **MUST** keep the outer loop's state (seen IDs, last brief, open questions) outside the inner loop's context, and make delivery idempotent: an item already delivered is not delivered again unless it changed.

### Run it honestly

14. **MUST** declare all triggers in one place: event (a new item matching a query), schedule (a named cadence) and threshold (a burst of N related items), with a dedupe window. A quiet period must produce no output.
15. **MUST** give the outer loop read-only access to its sources, with no write access beyond its own notes and brief channel; any reply, label, assignment, close or message to a person is a separate action with its own approval ([BP-0032](/security-safety/least-privilege-secrets/give-agents-least-privilege/), [BP-0069](/agent-engineering/workflow/design-human-approvals-people-read/)).
16. **MUST** write a run record each cycle: sources polled, items seen, forwarded and suppressed with reasons, briefs delivered, and errors ([BP-0051](/operations/observability/observe-agent-workflows/)).
17. **MUST** raise a signal to the owner when the loop has run but delivered nothing for longer than its expected interval, or when a source has failed repeatedly, so silence is never mistaken for calm.
18. **MUST** fail closed and say so: when a source cannot be read, the brief states it was not checked; the loop never reports nothing found when it did not look.

## When to apply

Use it when the context that changes the work lives outside the inner loop's tools: issue trackers, chat, email, support inboxes, alerts, deploy logs, calendars. It pays when the same collection and ferrying repeats, when the intent snapshot ages faster than a person can refresh it, and when several sources must be reconciled into one decision. One person running several inner loops is the classic case, but the same shape serves a team.

Do not build it for a single source read once, when the context already sits in the repository, or when the daily volume fits in a few minutes of reading: a scheduled digest a person reads is cheaper and easier to trust. Do not let it make the final call where the work cannot be verified (a migration, a payment path, anything irreversible); the outer loop may still gather and rank, but a person approves the action. Do not add it to an inner loop that is not yet reliable — an outer loop feeding a broken inner loop only makes failures arrive faster.

## Procedure

1. Write the intent the inner loop is working to, and the list of active work items the outer loop filters against. Keep both current; a stale intent produces a noisy filter.
2. List each source and the signal taken from it. Drop any source where no signal can be named.
3. Write the filter and the rank order as a table a reviewer can check: relevance, novelty, actionability; then blocking, security or data loss, customer-visible, cosmetic.
4. Write the brief schema (see Examples) and a freshness limit per source: how long an item stays true without re-checking.
5. Declare the triggers and dedupe window in one config file: event query, cadence, burst threshold.
6. Issue read-only credentials, and list the actions that need approval. The outer loop gets write access only to its own notes and the brief channel.
7. Run in shadow mode for one to two weeks: deliver briefs to a person, not the inner loop. Compare what it forwarded with what the person would have sent, and tune the filter on the misses.
8. Enable delivery. Review the run record weekly: forwarded and suppressed counts, duplicates, stale items, source failures.
9. Retire a source after a set period with no forwarded item, and record the retirement.

## Examples

A bug loop feeds a coding agent. Sources: a tracker saved query (`state=open label=bug updated:>-7d`), the `#support` channel, alerts for the checkout service, and customer email tagged as a defect. Triggers: every 15 minutes, plus a burst of five related reports. The loop groups twelve checkout reports into one item, links the deploy log, and asks whether the regression is in the deploy or the payment provider. The inner loop receives one brief and opens one fix ([BP-0096](/multi-agent-systems/team-topologies-roles/design-repeatable-agent-work-as-a-production-line-with/)).

A support-docs loop feeds a docs agent. Sources: the support inbox and the status page. The filter keeps repeated questions and documented errors, ranks by how many customers hit them, and the brief carries counts and links. The agent drafts the page; a person approves the publish.

A brief template teams can adapt:

```yaml
brief:
  brief_id: B-2026-11-27-01
  observed_at: 2026-11-27T09:15:00+08:00
  freshness_limit: 2026-11-27T13:15:00+08:00
  intent: "Reduce checkout latency for the EU cluster"
  new_since_last: 4
  items:
    - rank: 1
      reason: "Customer-visible; 12 reports since the last release"
      source: tracker
      source_id: ENG-412
      trust: internal
      excerpt: "Checkout takes about 9 seconds for EU customers."
      link: "https://tracker.example/browse/ENG-412"
      suggested_action: "Reproduce on the EU cluster; compare with the 15:02 deploy"
  suppressed:
    - source: chat
      count: 7
      reason: "Duplicate of ENG-412"
  not_checked:
    - source: alerts
      reason: "API returned 503 from 08:40"
  question: "Is the latency regression in the deploy or in the payment provider?"
```

## Anti-patterns

- The human as ferry: answering the same question for the inner loop every week instead of giving the outer loop the source that answers it.
- Pointing the inner agent at every source directly, so its context fills with duplicates and untrusted text.
- Forwarding every item, or one message per item, and calling the resulting interruptions "responsiveness".
- Forwarding without a source link, `observed_at` or trust class, so the inner loop cannot check the claim.
- Letting the outer loop write code, reply to customers, or close tickets because it already has the context.
- Treating a Slack message or an issue body as instructions rather than as data.
- Reading silence as "no news" after a source has been failing for hours.
- A second orchestrator that re-plans the inner loop's work and competes with its owner.
- Polling a source with no named signal, or two loops triaging the same source.
- Auto-merging in a domain where the work cannot be verified.

## Checklist

- [ ] Both loops have written role definitions, including what each must not do
- [ ] The outer loop never edits the work product; the inner loop never reads raw sources
- [ ] Every watched source has a named signal
- [ ] Every collected item records its source, ID, `observed_at`, evidence and trust class
- [ ] Collected text is treated as data and instruction-like content is stripped before forwarding
- [ ] Every forwarded item passed a written filter, with failures logged and reasons recorded
- [ ] One run forwards a capped, grouped set of items
- [ ] Every item carries a rank and the reason for it
- [ ] Every brief carries `observed_at` and a freshness limit, and stale items are marked stale
- [ ] Context reaches the inner loop as a structured brief, not injected into a running task
- [ ] Outer-loop state lives outside the inner loop's context, and delivery is idempotent
- [ ] Triggers, cadence and dedupe window are declared in one place, with a quiet-period no-op
- [ ] The outer loop holds read-only source access, and every external write has its own approval
- [ ] Each cycle writes a run record of what was seen, forwarded, suppressed and failed
- [ ] Silence and repeated source failures raise a signal to the owner
- [ ] A source that cannot be read is reported as not checked, never as no news
