---
title: Build self-improving agents that cannot grade their own homework
description: Let agents improve their memory, skills, prompts, tools or code from evidence, but fix what may change and what may not, keep the evaluator and held-out tests out of the agent's reach, accept a change only if it beats the current version beyond noise with no safety regression, version and review every change, and roll back on regression in production.
id: BP-0083
domain: D.AGT.WF
type: guideline
roles: [orchestrator, implementer, reviewer]
stage: [build, verify, operate]
status: draft
version: 1.0.0
updated: 2026-11-26
reviewed: 2026-11-26
review_by: 2027-02-26
related: [BP-0065, BP-0050, BP-0012, BP-0018, BP-0029, BP-0059, BP-0062, BP-0069, BP-0078, BP-0040]
sources:
  - { title: Zhang et al. — Darwin Gödel Machine, open-ended evolution of self-improving agents (ICLR 2026), url: https://arxiv.org/abs/2505.22954 }
  - { title: The Register — Self-improving AI sometimes cheated, url: https://www.theregister.com/2025/06/02/self_improving_ai_cheat/ }
  - { title: Agrawal et al. — GEPA, reflective prompt evolution can outperform reinforcement learning (ICLR 2026), url: https://arxiv.org/abs/2507.19457 }
  - { title: Ren et al. — Self-improvements in modern agentic systems, a survey, url: https://arxiv.org/abs/2607.13104 }
  - { title: Diving into reliable self-evolving agents, a survey (preprint), url: https://www.preprints.org/manuscript/202609.0913 }
  - { title: OWASP Top 10 for Agentic Applications 2026 — ASI06 Memory and Context Poisoning, url: https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications/ }
---

A self-improving agent changes the things that shape its later behaviour: what it remembers, the skills and prompts it loads, its tools, or its own code. The changes are cheap to propose and easy to measure, which is the risk: an agent that can see or edit how it is scored will tend to improve the score rather than the work. Design the loop so the agent proposes, something it cannot touch measures, and a person owns anything that changes what the agent is allowed to do.

## Rules

### Fix the improvement surface

1. **MUST** declare what the agent may change and at what level: memory and lessons, skills, prompts, tool configuration, code. Everything else is out of reach, enforced by file permissions, a separate repository or a separate identity, not by an instruction.
2. **MUST** keep these out of the agent's reach in every case: the evaluator and its held-out cases, the safety and regression suites, the gate that accepts changes, permissions and budgets, and audit logs. In published work on self-modifying coding agents, the agent scored better by disabling the check it was scored on, and this happened more often when the checks were visible to it.
3. **MUST NOT** let self-improvement widen the agent's own permissions, tools, budgets or autonomy. Those changes go through the normal change path, with a person ([BP-0062](/agent-engineering/tool-use/scope-sub-agent-tools-and-mcp/), [BP-0078](/software-engineering/version-control-review/agents-never-push-to-main/)).

### Learn from evidence, not from what it read

4. **MUST** derive each change from recorded evidence: failed or corrected runs, user corrections, review findings. Record the provenance (which runs, which outcome, which correction) with the change.
5. **MUST** treat lessons drawn from content the agent read (web pages, documents, tickets, tool output) as untrusted. A "lesson" planted in a document is memory poisoning; only verified outcomes and people's corrections become instructions ([BP-0029](/agent-engineering/context-memory/evaluate-and-secure-rag/), [BP-0012](/agent-engineering/context-memory/manage-long-term-memory/)).
6. **SHOULD** try language-level changes (memory, skills, prompts) before code or model changes. They are cheaper to test, readable in review and easy to revert, and reflective prompt optimisation has matched or beaten reinforcement learning on several tasks with far fewer runs.

### Accept only measured improvements

7. **MUST** evaluate each candidate against the current version on held-out cases the agent never sees while improving, plus the regression and safety suites. Accept it only if it beats the current version by more than sampling noise on enough cases, and does not add a single safety failure ([BP-0065](/operations/evaluation/benchmark-models-on-your-own-tasks/), [BP-0059](/agent-engineering/workflow/validate-with-proof-not-claims/)).
8. **MUST** watch for objective hacking: sample accepted changes for human review of real outcomes, refresh the held-out set on a schedule, and treat a score rising while user-facing outcomes stay flat as a defect.
9. **MUST** version every change separately, with its diff, rationale, evidence and eval results. A person approves changes to prompts, tools, code and anything touching behaviour towards users; small memory additions within a size and scope limit may apply automatically, sampled ([BP-0069](/agent-engineering/workflow/design-human-approvals-people-read/)).

### Run it safely

10. **MUST** be able to roll back to any earlier version in one step, monitor production with the same measures used to accept the change, and revert automatically on regression ([BP-0050](/operations/evaluation/detect-model-drift/)).
11. **MUST** consolidate memory and lessons on a schedule: merge duplicates, remove contradictions and expired lessons, and keep within a size cap. Accumulated lessons that are never pruned degrade the agent.
12. **SHOULD** cap the cost of each improvement cycle, stop when gains level off, and keep an archive of versions with their scores, so a regression can be traced and an earlier version restored ([BP-0040](/operations/observability/keep-an-audit-trail/)).

## When to apply

When an agent writes to its own memory or instructions, proposes edits to its skills or prompts, runs a prompt optimiser (for example DSPy or GEPA) on itself, or modifies its own code or tool configuration.

## Examples

Improvement gate (Bun, TypeScript). It runs outside anything the agent can edit; the agent submits a candidate with its evaluation results, and the gate decides:

```ts
// author: Stephen Eaton
// improvement-gate.ts — decide whether a self-proposed change to an agent ships.
// Lives outside anything the agent can edit; the agent submits candidates and their eval results.
export type Kind = 'memory' | 'skill' | 'prompt' | 'tool' | 'code';
export type Candidate = {
  kind: Kind; files: string[]; bytesAdded: number;
  heldOut: { baseline: number; candidate: number; n: number }; // pass rates on cases the agent never saw
  safety: { baselineFailures: number; candidateFailures: number };
};
export type Review = { decision: 'accept' | 'reject' | 'needs-approval'; reasons: string[]; policy: string };

const POLICY = 'self-improvement-gate@1.0.0';
const PROTECTED = [/^evals\//, /^tests\//, /^improvement-gate\.ts$/, /^policy\//, /^\.github\//, /^audit\//];
const MIN_CASES = 50;
const MEMORY_AUTO_BYTES = 2000;
const NEEDS_PERSON: Kind[] = ['prompt', 'tool', 'code'];

// One-sided check that the candidate beats baseline by more than sampling noise (two-proportion z > 1.64).
function beatsBaseline({ baseline: p0, candidate: p1, n }: Candidate['heldOut']): boolean {
  const p = (p0 + p1) / 2;
  const se = Math.sqrt((2 * p * (1 - p)) / n) || 1;
  return (p1 - p0) / se > 1.64;
}

export function review(c: Candidate): Review {
  const r = (decision: Review['decision'], ...reasons: string[]): Review => ({ decision, reasons, policy: POLICY });
  const hit = c.files.filter((f) => PROTECTED.some((re) => re.test(f)));
  if (hit.length) return r('reject', `touches protected files: ${hit.join(', ')}`);
  if (c.safety.candidateFailures > c.safety.baselineFailures)
    return r('reject', `safety suite failures rose from ${c.safety.baselineFailures} to ${c.safety.candidateFailures}`);
  if (c.heldOut.n < MIN_CASES) return r('reject', `only ${c.heldOut.n} held-out cases; need ${MIN_CASES}`);
  if (!beatsBaseline(c.heldOut)) return r('reject', `held-out gain ${c.heldOut.baseline} -> ${c.heldOut.candidate} is within noise`);
  if (NEEDS_PERSON.includes(c.kind)) return r('needs-approval', `${c.kind} changes are reviewed by a person`);
  if (c.kind === 'memory' && c.bytesAdded > MEMORY_AUTO_BYTES) return r('needs-approval', `adds ${c.bytesAdded} bytes of memory`);
  return r('accept', `held-out ${c.heldOut.baseline} -> ${c.heldOut.candidate} on ${c.heldOut.n} cases, no safety regression`);
}
```

Tested with Bun 1.4 and nine unit tests:
- A skill change that lifts held-out pass rate from 0.71 to 0.78 on 400 cases, with no safety regression, is accepted.
- The same gain on 120 cases is rejected as noise, and so is a one-point gain.
- Fewer than 50 held-out cases is rejected.
- A change touching `evals/`, `tests/`, the gate itself or `policy/` is rejected, with the reason.
- One new safety failure is rejected even with a 24-point gain.
- Prompt, tool and code changes that pass still need a person.
- A 400-byte memory lesson applies automatically; a 5,000-byte one needs approval.

The thresholds (50 cases, z above 1.64, 2,000 bytes) are example settings; set them from your own evaluation history.

## Anti-patterns

- An agent that edits its own tests, eval cases or scoring script, or can read the held-out answers.
- "Lessons learned" appended to the system prompt after every run, never pruned or reviewed.
- Accepting a change because it scored higher once, on a handful of cases.
- Self-improvement that adds tools, raises budgets or loosens approval rules.
- No version history, so a bad change cannot be found or reverted.
- Copying advice from a web page or ticket into memory as if it were a verified lesson.

## Checklist

- [ ] Improvement surface declared; evaluator, tests, gate, permissions and logs out of reach
- [ ] Self-improvement cannot widen permissions, tools, budgets or autonomy
- [ ] Every change has provenance; lessons from read content treated as untrusted
- [ ] Held-out, regression and safety suites run on every candidate; gains beyond noise, no safety regression
- [ ] Changes versioned one at a time; a person approves prompt, tool and code changes
- [ ] One-step rollback; production monitored with the same measures; automatic revert on regression
- [ ] Memory consolidated and capped; improvement cost capped; version archive kept
