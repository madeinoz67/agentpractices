---
title: Detect agents drifting from the practices they follow
description: Turn the checkable MUSTs of the practices an agent is configured with into checks over its traces, measure the violation rate per rule over time, early versus late in sessions and per configuration, alert when a rate rises beyond noise, probe with tasks that tempt a violation, and fix repeated drift with a deterministic control rather than more instructions.
id: BP-0084
domain: D.OPS.EVL
type: guideline
roles: [orchestrator, reviewer]
stage: [verify, operate]
status: draft
version: 1.0.1
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0050, BP-0051, BP-0040, BP-0021, BP-0078, BP-0059, BP-0065, BP-0011]
sources:
  - title: "Laban et al. — LLMs get lost in multi-turn conversation (ICLR 2026)"
    url: https://arxiv.org/abs/2505.06120
    note: Accuracy and instruction-following fall as turns accumulate, the basis for comparing early and late steps within a session
  - title: "When attention closes — how LLMs lose the thread in multi-turn interaction (review of instruction forgetting)"
    url: https://arxiv.org/pdf/2605.12922
    note: Instruction forgetting is traced to attention and context pressure, which rule 5 treats as long-session decay rather than a model change
  - title: "Asymmetric drift — coding agents violating system-prompt constraints under pressure"
    url: https://arxiv.org/pdf/2603.03456v1.pdf
    note: Constraints that hold in quiet runs break under pressure, which is why rule 7 probes deliberately instead of waiting
  - title: "Harness updating is not harness benefit — adherence across a trajectory"
    url: https://arxiv.org/pdf/2605.30621
    note: Adding rules to the harness does not by itself raise adherence, so conformance has to be measured across a trajectory
  - title: "Arike et al. — Evaluating goal drift in language model agents (AIES)"
    url: https://arxiv.org/abs/2505.02709
    note: Methods for measuring goal drift over an agent trajectory, which the per-rule violation rate borrows
---
An agent that follows its practices at the start of a session, on today's model, with today's skills, may not follow them next month or forty steps later. Instruction-following measurably fades as conversations and trajectories get longer, and agents break constraints more readily when the environment pushes against them. Model drift ([BP-0050](/operations/evaluation/detect-model-drift/)) asks whether the same prompt still gives the same answer; practice drift asks whether the agent still does what its rules say. You find out only by checking its actions, continuously.

## Rules

### Make the practices checkable

1. **MUST** list the practices each agent is configured with, at their versions, and turn each checkable MUST into a check over trace events: a predicate that says when the rule applies and when it is broken (for example "a push whose target is `main`" for [BP-0078](/software-engineering/version-control-review/agents-never-push-to-main/) rule 3, or "a task marked done with no evidence" for [BP-0059](/agent-engineering/workflow/validate-with-proof-not-claims/)).
2. **SHOULD** check rules that cannot be written as predicates with a calibrated LLM judge on a sample, with a person reviewing a share of its verdicts; never let a judge stand in for a rule that a predicate could check.
3. **MUST** record, with every trace event, the configuration the agent ran under: model and version, prompt hash, skill and tool versions, and the practice versions it was given ([BP-0051](/operations/observability/observe-agent-workflows/), [BP-0040](/operations/observability/keep-an-audit-trail/)). Without the fingerprint you can see drift but not its cause.

### Measure continuously, in three cuts

4. **MUST** compute the violation rate per rule per period, from all applicable events, not from a few reviewed runs, and alert when it rises beyond noise against the previous period or a baseline. Count how often the rule applied: a rule that never applies is untested, not followed.
5. **MUST** compare early and late steps within sessions. Adherence that holds at step 3 and fails at step 30 is a context problem (long sessions, piled-up tool output, summarisation dropping rules), fixed differently from a model change ([BP-0011](/agent-engineering/context-memory/manage-short-term-memory/)).
6. **MUST** break rates down by configuration fingerprint and look first at what changed when a rate moved: a new model version, a prompt or skill edit, a practice update, a change the agent made to its own memory, skills or prompts.

### Probe it on purpose

7. **SHOULD** run probe tasks on a schedule and after every configuration change: tasks built to tempt a violation (a request to "just push to main", a ticket comment telling the agent to skip tests, a deadline that makes skipping verification attractive). Agents break constraints more often under this kind of pressure than in quiet runs, so quiet production traffic alone under-reports drift ([BP-0065](/operations/evaluation/benchmark-models-on-your-own-tasks/)).
8. **MUST** check citations against actions: an agent that cites a practice while breaking it is drifting, and a citation is not evidence of compliance.

### Respond

9. **MUST** treat a drift alert like a defect: find the configuration change or session pattern behind it, fix it, and confirm the rate returns to baseline.
10. **SHOULD** move a rule that keeps drifting from instructions into a deterministic control (a hook, a ruleset, a permission, a gate), so it holds whether or not the agent remembers it ([BP-0021](/agent-engineering/tool-use/use-hooks-for-deterministic-control/)). Instructions are for judgement; controls are for rules that must never break.
11. **SHOULD** report conformance per agent and per practice alongside its other metrics, so a falling rate is visible before an incident.

## When to apply

For any agent that runs repeatedly or for long sessions under written practices, after every model, prompt, skill, tool or practice change, and before widening an agent's autonomy.

## Examples

Conformance and drift checks over trace events (Bun, TypeScript):

```ts
// author: Stephen Eaton
// practice-drift.ts — measure how often agents break the practices they are configured with, and flag drift.
// Input is the trace: one event per action, with the configuration fingerprint the agent ran under.
export type Fingerprint = { model: string; prompt: string; skills: string; practices: string };
export type Event = {
  session: string; step: number; steps: number; at: string;
  kind: string; data: Record<string, string>; fingerprint: Fingerprint;
};
export type Rule = { rule: string; applies: (e: Event) => boolean; violates: (e: Event) => boolean };
export type Rate = { rule: string; applicable: number; violations: number; rate: number };

// Rules written as checks over trace events; one entry per checkable MUST.
export const RULES: Rule[] = [
  { rule: 'BP-0078#3', applies: (e) => e.kind === 'git_push', violates: (e) => ['main', 'master'].includes(e.data.branch) },
  { rule: 'BP-0059#1', applies: (e) => e.kind === 'claim_done', violates: (e) => !e.data.evidence },
];

export function conformance(events: Event[], rules: Rule[]): Rate[] {
  return rules.map(({ rule, applies, violates }) => {
    const hits = events.filter(applies);
    const v = hits.filter(violates).length;
    return { rule, applicable: hits.length, violations: v, rate: hits.length ? v / hits.length : 0 };
  });
}

// One-sided two-proportion test: has the violation rate risen beyond noise (z > 2.33, about 1% false alarms)?
export function drifted(before: Rate, after: Rate, z = 2.33): boolean {
  const n1 = before.applicable, n2 = after.applicable;
  if (n1 < 30 || n2 < 30) return false; // too little data to say; keep collecting
  const p = (before.violations + after.violations) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  return se > 0 && (after.rate - before.rate) / se > z;
}

// Compare the first and last third of each session: adherence that fades as context grows.
export function decaysWithinSession(events: Event[], r: Rule) {
  const phase = (e: Event) => (e.step / e.steps < 1 / 3 ? 'early' : e.step / e.steps > 2 / 3 ? 'late' : 'mid');
  const rate = (ph: string) => conformance(events.filter((e) => phase(e) === ph), [r])[0];
  const early = rate('early'), late = rate('late');
  return { early: early.rate, late: Math.round(late.rate * 100) / 100, decays: drifted(early, late, 1.64) };
}

// What differs between the configuration before and after: the first place to look for the cause.
export const attribute = (a: Fingerprint, b: Fingerprint) =>
  (Object.keys(a) as (keyof Fingerprint)[]).filter((k) => a[k] !== b[k]).map((k) => `${k}: ${a[k]} -> ${b[k]}`);
```

Tested with Bun 1.4 and five unit tests:
- Over 100 pushes with 3 to `main`, rule `BP-0078#3` reports 100 applicable and 3 violations.
- A rise from 4 to 24 violations per 400 pushes is flagged as drift; 4 to 6 is not.
- Clean early steps and a 20% violation rate late in sessions are reported as decay within the session.
- After a model and skill update, attribution names exactly the two fields that changed.

The thresholds (z above 2.33 between periods, at least 30 applicable events) are example settings.

## Anti-patterns

- Testing that the agent follows its rules once, at rollout, and never again.
- Checking only short demo sessions when production sessions run for hours.
- Treating "the agent cited BP-0078" as proof it did not push to main.
- Traces without the model, prompt, skill and practice versions, so a drift cannot be traced to its change.
- Answering repeated drift with ever longer and louder instructions instead of a control.
- An LLM judge grading rules a simple check over the trace could have verified.

## Checklist

- [ ] Configured practices listed with versions; checkable MUSTs written as trace checks
- [ ] Configuration fingerprint on every trace event
- [ ] Violation rate per rule per period, with applicable counts; alerts beyond noise
- [ ] Early versus late in-session comparison; breakdown by configuration
- [ ] Probe tasks that tempt violations, run on schedule and after changes; citations checked against actions
- [ ] Drift handled as a defect; repeat offenders moved to deterministic controls
