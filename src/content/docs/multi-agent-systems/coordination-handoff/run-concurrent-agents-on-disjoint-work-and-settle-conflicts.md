---
title: Run concurrent agents on disjoint work and settle conflicts with evidence
description: Cap how many agents run at once, partition write scopes before dispatch, and settle conflicting findings by re-running the check under one named adjudicator.
id: BP-0095
domain: D.MAS.HND
type: guideline
roles: [orchestrator, implementer, reviewer]
stage: [plan, build, verify]
status: draft
version: 1.0.1
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0042, BP-0003, BP-0043, BP-0053, BP-0035, BP-0048]
superseded_by: null
sources:
  - title: "Google SRE Book — Handling Overload"
    url: https://sre.google/sre-book/handling-overload/
    note: admission control and bounded queues when demand exceeds what the system can serve
  - title: "Anthropic — How we built our multi-agent research system"
    url: https://www.anthropic.com/engineering/multi-agent-research-system
    note: "multi-agent systems use about 15× the tokens of chat, so concurrency is a cost decision as well as a coordination one"
  - title: "Du et al. — Improving Factuality and Reasoning in Language Models through Multiagent Debate"
    url: https://arxiv.org/abs/2305.14325
    note: structured exchange of reasoning between instances improves factual validity, which is why a disagreement should be surfaced rather than suppressed
  - title: "Khan et al. — Debating with More Persuasive LLMs Leads to More Truthful Answers"
    url: https://arxiv.org/abs/2402.06782
    note: two advocates arguing before a separate judge outperformed unsupervised agreement, which is why one named adjudicator decides rather than the pair
  - title: "Pro Git — Basic Branching and Merging"
    url: https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging
    note: "Git pauses on a conflict instead of picking a side; the same behaviour is the model for rule 5"
  - title: "Git — git-worktree documentation"
    url: https://git-scm.com/docs/git-worktree
    note: separate working trees for parallel branches
  - title: "A2A Protocol specification — task states"
    url: https://a2a-protocol.org/latest/specification/
    note: the input-required task state, used for a task that needs a person before it can continue
---
Two agents running at once can pick the same task, write the same file, or return contradictory findings about the same artifact. Nothing in the run reports a problem: every agent returns success. The orchestrator then keeps the last write, synthesises a conclusion no artifact supports, or lets the pair argue until the budget runs out. The cost lands later, when the merged result fails a test that no single agent would have failed.

The first half of this practice keeps contention from happening: a ceiling on concurrent agents, disjoint write scopes, and no task dispatched on inputs that do not exist yet. The second half handles what still collides: a disagreement is stated as two checkable claims, settled by running the check that separates them, decided by one named adjudicator when the pair cannot settle it, and escalated to the human when the question is preference, priority or risk rather than fact.

## Rules

### Admit work within a budget

1. **MUST** set an explicit ceiling on how many agents run at once, sized to what the orchestrator can read and verify and to the provider's rate limits, and queue the rest; never start every ready task because it is ready ([BP-0042](/multi-agent-systems/team-topologies-roles/choose-the-simplest-agent-topology/)).
2. **MUST** give each concurrently running task a write scope (files, branch, shared record) that no other in-flight task may write, and run overlapping work in sequence or behind the scope's owner ([BP-0035](/software-engineering/version-control-review/isolate-parallel-agents-with-worktrees/)).
3. **MUST NOT** dispatch a task whose inputs another in-flight agent has not returned; schedule it after the producer's result exists ([BP-0003](/multi-agent-systems/coordination-handoff/handoff-contracts/), [BP-0048](/multi-agent-systems/coordination-handoff/orchestrate-agent-workflows/)).

### Report a conflict, do not absorb it

4. **MUST** report a disagreement as two checkable claims, each with its evidence (the command and its output, `file:line`, source URL, or input) and the exact check that would tell them apart, not as opinions, votes, confidence scores or model names.
5. **MUST NOT** overwrite or discard a conflicting change to make a run proceed; on detecting the conflict, stop work on that artifact and report it.

### Settle it with evidence

6. **MUST** settle a factual disagreement by running the discriminating check against the artifact; the claim the check supports stands, and the other is withdrawn with its evidence recorded.
7. **MUST NOT** settle a disagreement by majority, by model rank or by stated confidence; agreement between agents that share a model, a context or a source is not evidence ([BP-0053](/multi-agent-systems/coordination-handoff/prevent-error-amplification/)).
8. **MUST** bound peer negotiation to one round of rebuttal and route the decision to one named adjudicator, the orchestrator or a designated reviewer, when the round does not settle it.

### Escalate and record

9. **MUST** escalate to the human when the disagreement is about preference, priority, scope or acceptable risk rather than a checkable fact, or when no check can settle it, and mark the task blocked or `input-required` instead of guessing.
10. **MUST** record the resolution, the deciding evidence and the task IDs in one durable place the next agent reads, so a settled disagreement is not re-litigated by a later run ([BP-0048](/multi-agent-systems/coordination-handoff/orchestrate-agent-workflows/)).

## When to apply

Any run with two or more agents active at once: orchestrator-worker fleets, parallel implementation lanes in separate worktrees, a review panel returning findings on the same diff, and any orchestrator that compares or merges results from several lanes. It also applies between runs, when a later agent finds a recorded finding it disagrees with.

## Procedure

1. Write the run plan before dispatch: each task's write scope, the task that produces each input, and the ceiling on concurrent agents. Reject a plan where two tasks share a write scope or a dependency sits inside the ceiling.
2. Start tasks in dependency order, up to the ceiling. Keep the remaining tasks queued, not started.
3. When one result contradicts another, do not merge them. Ask both agents for the claim block in the form rule 4 requires.
4. Run the discriminating check yourself at the artifact. Read the file or the raw output, not a summary of it.
5. If the check settles the question, accept the claim it supports and withdraw the other with its evidence.
6. If the check cannot settle it, send both claim blocks and the attempted check to the adjudicator. Allow one rebuttal round, no more.
7. If the question is preference, priority, scope or risk, stop and ask the human. Leave the task blocked or `input-required`.
8. Write the resolution, with the deciding evidence, into the task record or decision log, linked to the task IDs.
9. Return the slot to the queue and start the next task.

## Examples

Two agents disagree about whether `Store.open()` rejects an empty path. Each states its claim, its evidence and the shared check:

```yaml
# author: Stephen Eaton
conflict: does Store.open() reject an empty path?
claims:
  - agent: implementer-a
    claim: "Store.open() ignores an empty path and opens the default database"
    evidence: "src/store.py:88 assigns DEFAULT_DB when path is falsy"
    check: "python -c 'from store import Store; print(Store.open(\"\").path)'"
  - agent: reviewer-b
    claim: "Store.open() rejects an empty path"
    evidence: "docs/api.md:41 says an empty path raises ValueError"
    check: "python -c 'from store import Store; print(Store.open(\"\").path)'"
```

The orchestrator runs the check and reads `src/store.py:88`. The code wins; the doc line is stale. The reviewer withdraws its claim, and a follow-up issue corrects `docs/api.md`.

The resolution record, written where the next agent reads it:

```yaml
# author: Stephen Eaton
resolution:
  conflict: C-14
  settled_by: check-at-artifact
  accepted: implementer-a
  evidence: "src/store.py:88 assigns DEFAULT_DB when path is falsy; docs/api.md:41 is stale"
  withdrawn: reviewer-b
  tasks: [T-31, T-44]
  follow_up: "correct docs/api.md (issue 58)"
```

A disagreement about which of two valid schemas to use has no check that separates them. That is a preference call: record both options, mark the task `input-required`, and ask the human. Do not let the agent with the stronger-sounding argument decide.

## Anti-patterns

- Letting the last writer win: "both agents finished, so I kept the newer file".
- Counting votes: "two of three reviewers said X", when all three share one model, one context and one source.
- Telling the two disagreeing agents to "work it out", with no round cap, no adjudicator and no record.
- Accepting a confident summary as evidence: the agent says the tests pass, but no command output exists.
- Starting every ready task because the queue was full, then treating the resulting merge conflicts as normal work.
- Re-litigating a settled conflict in the next run, because the resolution lived only in a chat transcript.

## Checklist

- [ ] Concurrency ceiling set, and the remainder queued
- [ ] Every concurrent task has a write scope no other in-flight task shares
- [ ] No task dispatched on inputs an in-flight agent has not returned
- [ ] Disagreements stated as two claims, each with evidence and the discriminating check
- [ ] No conflicting change overwritten or discarded to keep the run moving
- [ ] Factual conflicts settled by running the check at the artifact
- [ ] No conflict settled by majority, model rank or confidence
- [ ] One named adjudicator decided after at most one rebuttal round
- [ ] Preference, priority, scope and risk conflicts escalated to the human, with the task blocked or `input-required`
- [ ] Resolution, evidence and task IDs recorded where the next agent reads them

