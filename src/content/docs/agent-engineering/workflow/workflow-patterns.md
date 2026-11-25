---
title: Workflow patterns for agents — a catalogue
description: Eleven workflow patterns (prompt chain, routing, parallel sectioning, parallel voting, orchestrator–workers, evaluator–optimiser, loop until done, human checkpoint, event-triggered, plan-then-execute, autonomous agent), each with its shape, when to use and avoid it, cost, failure modes and guardrails. Start with the simplest that works and combine patterns deliberately.
id: BP-0068
domain: D.AGT.WF
type: reference
roles: [planner, orchestrator]
stage: [plan, build]
status: draft
version: 1.0.0
updated: 2026-11-24
reviewed: 2026-11-24
review_by: 2027-05-24
related: [BP-0042, BP-0048, BP-0064, BP-0002, BP-0008, BP-0059, BP-0041, BP-0061, BP-0066]
sources:
  - { title: Anthropic — Building effective agents, url: https://www.anthropic.com/research/building-effective-agents }
  - { title: Geoffrey Huntley — Ralph (loop until done), url: https://ghuntley.com/ralph/ }
  - { title: Thoughtworks Technology Radar — Ralph loop, url: https://www.thoughtworks.com/radar/techniques/ralph-loop }
  - { title: Claude Code docs — Best practices (checks, goals, Stop hooks), url: https://code.claude.com/docs/en/best-practices }
---

A **workflow** runs models and tools through code paths you define; an **agent** lets the model direct its own steps. Most useful systems sit between the two. This catalogue covers the patterns at the level of one workflow; for how to arrange *multiple agents* (team topologies, roles, ownership), see [BP-0042](/multi-agent-systems/team-topologies-roles/choose-the-simplest-agent-topology/), and for running a long piece of work through gated phases, see [BP-0048](/multi-agent-systems/coordination-handoff/orchestrate-agent-workflows/).

## Rules

1. **MUST** start with the simplest pattern that meets the quality bar, measured against a single-call baseline, and add steps, agents or loops only when they measurably improve the result. Every added step costs latency, tokens and a new place to fail.
2. **MUST** put deterministic code between model steps wherever possible: parsing, validation, routing rules, gates ([BP-0064](/agent-engineering/workflow/use-decision-models-for-bounded-decisions/)).
3. **MUST** give every loop, fan-out and autonomous run explicit stop conditions: maximum iterations, budget, time, and a verifiable "done" check ([BP-0059](/agent-engineering/workflow/validate-with-proof-not-claims/), [BP-0041](/operations/cost-performance/budget-and-control-agent-cost/)).
4. **SHOULD** combine patterns deliberately and name them in the design (for example "router → chain per route, with a human checkpoint before send"), so reviewers know which failure modes to look for.
5. **SHOULD** measure each pattern in place: success rate, cost and latency per completed task, and where it fails ([BP-0051](/operations/observability/observe-agent-workflows/)).

## The patterns

### 1. Prompt chain

```text
input → [step 1] → gate → [step 2] → gate → [step 3] → output
```

- **Use when** the task splits into fixed, ordered steps (outline → check → draft; extract → transform → format).
- **Avoid when** the steps depend on the input in ways you cannot predict.
- **Cost:** latency adds up step by step; each step is simpler and more reliable.
- **Fails by** passing an early error down the chain. **Guard** with a programmatic gate after each step, and stop rather than continue on a failed gate.

### 2. Routing

```text
input → [classify] ─┬→ handler A
                    ├→ handler B
                    └→ fallback / human
```

- **Use when** inputs fall into distinct categories handled better separately, including sending easy work to small models and hard work to capable ones.
- **Avoid when** categories overlap heavily or the classifier is not accurate enough.
- **Cost:** one cheap classification call, then the right handler.
- **Fails by** misrouting. **Guard** with a confidence threshold, an explicit fallback route, measured routing accuracy, and position-bias controls ([BP-0066](/agent-engineering/workflow/counter-position-and-middle-bias/)).

### 3. Parallel — sectioning

```text
        ┌→ [part A] ┐
input ──┼→ [part B] ┼→ combine (code)
        └→ [part C] ┘
```

- **Use when** independent sub-tasks can run at once (review security, style and tests separately; screen input while answering it).
- **Avoid when** parts depend on each other or edit the same files.
- **Cost:** more tokens, less wall-clock time.
- **Fails by** inconsistent parts or conflicting edits. **Guard** by giving each part a defined slice and combining in code; isolate writers ([BP-0035](/software-engineering/version-control-review/isolate-parallel-agents-with-worktrees/)).

### 4. Parallel — voting

```text
        ┌→ [attempt 1] ┐
input ──┼→ [attempt 2] ┼→ vote / threshold
        └→ [attempt 3] ┘
```

- **Use when** confidence matters more than cost (vulnerability review, content checks with a threshold).
- **Avoid when** attempts share the same blind spot; agreement is not proof.
- **Cost:** n times the calls.
- **Fails by** correlated errors and false consensus. **Guard** by varying prompts, orders or models, and treating low agreement as a reason to escalate ([BP-0053](/multi-agent-systems/coordination-handoff/prevent-error-amplification/)).

### 5. Orchestrator–workers

```text
input → [orchestrator: plan sub-tasks at run time] → workers… → [orchestrator: synthesise]
```

- **Use when** the sub-tasks cannot be known in advance (multi-file code changes, research across sources).
- **Avoid when** a fixed chain or sectioning would do.
- **Cost:** high; orchestrator context grows with worker results.
- **Fails by** duplicate or conflicting work and a bloated orchestrator context. **Guard** with self-contained briefs, structured results, scoped tools per worker and a ledger ([BP-0003](/multi-agent-systems/coordination-handoff/handoff-contracts/), [BP-0062](/agent-engineering/tool-use/scope-sub-agent-tools-and-mcp/)).

### 6. Evaluator–optimiser

```text
input → [generate] → [evaluate vs criteria] ─pass→ output
             ↑______________feedback_____┘
```

- **Use when** there are clear criteria and refinement measurably helps (translation, search completeness, code against tests).
- **Avoid when** criteria are vague; the loop will polish without converging.
- **Cost:** two calls per round, several rounds.
- **Fails by** endless rounds or polishing an error into something convincing. **Guard** with written criteria, a round cap, and an evaluator that checks against evidence rather than the generator's reasoning.

### 7. Loop until done

```text
while not done(): run agent with the same prompt + state on disk (fresh context each time)
```

- Popularised as the "Ralph" loop: the same prompt fed to an agent repeatedly, with progress kept in files and version control rather than in the context window.
- **Use when** a large, well-specified job can be advanced in small verified increments (build out a spec, migrate a codebase) and a check can say what is left.
- **Avoid when** there is no reliable completion check, or each step has real-world side effects.
- **Cost:** open-ended unless capped.
- **Fails by** looping forever, drifting from the spec, or "finishing" by weakening checks. **Guard** with a verifiable done check, iteration and budget caps, a progress file, honest tests ([BP-0038](/software-engineering/testing/keep-tests-honest/)), and a person reviewing output on a schedule. In Claude Code, a Stop hook or a goal can keep a session going until a check passes.

### 8. Human checkpoint

```text
… → [prepare action + evidence] → approve? ─yes→ act
                                    └─no/timeout→ revise or stop
```

- **Use when** the next step is irreversible, external or high-impact (send, publish, pay, delete, deploy, change production).
- **Avoid** adding it everywhere; people approving everything stop reading.
- **Cost:** human wait time.
- **Fails by** rubber-stamping or stalled runs. **Guard** by showing exactly what will happen and why, with evidence; batching low-risk approvals; a timeout that defaults to *not* acting; and routing approvals to a channel people watch ([BP-0061](/multi-agent-systems/communication-protocols/choose-agent-communication-channels/)).

### 9. Event-triggered

```text
event (webhook, schedule, message, file change) → validate source → workflow → result to channel
```

- **Use when** work should start from something happening (CI failure, alert, new ticket, nightly schedule).
- **Avoid** triggering from sources you cannot authenticate.
- **Cost:** per event; watch for event storms.
- **Fails by** spoofed or duplicate events and runaway triggers. **Guard** with sender authentication, idempotency keys, rate limits and de-duplication; treat event content as data, not instructions.

### 10. Plan-then-execute

```text
request → [clarify] → [spec] → [plan + units] → execute units → [independent review]
```

- **Use when** the work is large enough that a wrong guess about intent is expensive.
- **Avoid** for one-line fixes.
- **Cost:** up-front time; saves rework.
- **Fails by** plans that drift from the spec, or skipping approval. **Guard** with written approval gates and a durable ledger ([BP-0057](/documentation-writing/specs-design-docs/brainstorm-intent-before-specifying/), [BP-0058](/documentation-writing/specs-design-docs/write-prds-agents-can-build-from/), [BP-0048](/multi-agent-systems/coordination-handoff/orchestrate-agent-workflows/)).

### 11. Autonomous agent

```text
goal → loop { decide next step → use tool → observe real result } until done / stopped / needs human
```

- **Use when** the number and kind of steps cannot be known in advance and you trust the model in that environment.
- **Avoid when** a fixed workflow would do the job.
- **Cost:** highest, and errors compound.
- **Fails by** wandering, compounding mistakes, or acting outside its remit. **Guard** with a sandbox, least privilege, stop conditions, checkpoints for risky actions and full tracing ([BP-0032](/security-safety/least-privilege-secrets/give-agents-least-privilege/), [BP-0039](/operations/observability/trace-agent-runs/)).

## Choosing

| If… | Start with |
| --- | --- |
| Steps are fixed and ordered | Prompt chain |
| Inputs are different kinds of thing | Routing |
| Independent parts, need speed | Parallel sectioning |
| Need more confidence on one answer | Parallel voting |
| Sub-tasks only known at run time | Orchestrator–workers |
| Clear criteria, refinement helps | Evaluator–optimiser |
| Big job, verifiable increments | Loop until done |
| Next step is irreversible | Add a human checkpoint |
| Work starts from an event | Event-triggered |
| Intent is unclear or work is large | Plan-then-execute |
| Steps unknowable, environment trusted | Autonomous agent |

## Examples

Combined: a support workflow.

```text
new ticket (event) → route (typed model + rules)
   ├─ billing   → chain: extract → look up account → draft reply → human checkpoint → send
   ├─ technical → orchestrator–workers: search logs, search docs, reproduce → synthesise → human checkpoint
   └─ unsure    → human queue
```

## Anti-patterns

- An autonomous agent for a job a three-step chain would do.
- Loops with no iteration cap or no verifiable done check.
- Voting with three copies of the same prompt and model.
- Human approval on every step, so nobody reads them.
- Patterns combined ad hoc, with nobody able to say which one failed.

## Checklist

- [ ] Simplest pattern chosen and compared with a single-call baseline
- [ ] Code between model steps; gates explicit
- [ ] Stop conditions on every loop, fan-out and autonomous run
- [ ] Pattern named in the design; combinations deliberate
- [ ] Success, cost and latency measured per pattern

## References

- [Anthropic — Building effective agents](https://www.anthropic.com/research/building-effective-agents)
- [Geoffrey Huntley — Ralph](https://ghuntley.com/ralph/)
- [Thoughtworks Radar — Ralph loop](https://www.thoughtworks.com/radar/techniques/ralph-loop)
- [Claude Code — Best practices](https://code.claude.com/docs/en/best-practices)
