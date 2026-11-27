---
title: Amend the agent environment when the same failure repeats
description: "Turn repeated agent mistakes into environment changes: log each intervention, fix the cheapest deterministic control first, verify against the original failure, measure recurrence, and give the environment an owner."
id: BP-0103
domain: D.AGT.WF
type: pattern
roles: [orchestrator, implementer, reviewer]
stage: [build, operate]
status: draft
version: 1.0.0
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0015, BP-0017, BP-0018, BP-0020, BP-0037, BP-0038, BP-0084]
superseded_by: null
sources:
  - title: "Ai insider — Lauren Tan reveals how 30+ AI agents ship PRs while you sleep"
    url: https://www.youtube.com/watch?v=6hxp0SpGxz8
    note: The kitchen and knives metaphor, the instruction to amend the environment (skills, constraints, lints, type systems) rather than the individual dish, and one environment serving many projects; behind rules 1, 3, 8 and 9.
  - title: "Google SRE Book — Postmortem Culture: Learning from Failure"
    url: https://sre.google/sre-book/postmortem-culture/
    note: Blameless postmortems that fix systems and processes rather than people, which is the same move as treating a repeated agent error as an environment defect; behind rules 1 and 7.
  - title: "Anthropic — Claude Code best practices"
    url: https://www.anthropic.com/engineering/claude-code-best-practices
    note: Tuning the instruction file, hooks, permissions and allowed tools, and iterating on them, as the concrete places an environment change lands; behind rule 3.
---

An agent makes the same mistake across runs. The reviewer fixes that instance: edits the output, re-prompts, hand-corrects the commit. The next agent repeats the mistake, because nothing around it changed. The correction was paid for once and taught the environment nothing, so the same review comment comes back next week, and the week after.

This practice turns a repeated failure into a change to the environment: the instruction file, a skill, a lint or type rule, a test, a hook, a permission. Deterministic controls come first because they cannot be forgotten or argued with; prose is the last resort, not the first. Each change is verified against the failure that prompted it and measured afterwards. The kitchen metaphor and the list of places to amend come from Lauren Tan's talk (first source); the deterministic-first order and the recurrence measure are additions grounded in the sources below.

## Rules

1. **MUST** treat a repeated failure as an environment defect: the same mistake in two or more runs, or the same correction made twice, opens an environment change.
2. **MUST** record each intervention with the run, the symptom, and the rule, tool or check that was missing.
3. **MUST** encode the fix in the cheapest deterministic place that prevents recurrence: a lint or type rule, a test, a hook or a permission first; a skill or instruction change only when no deterministic control fits ([BP-0020](/agent-engineering/tool-use/author-agent-hooks/), [BP-0037](/software-engineering/testing/test-first-with-agents/)).
4. **MUST** verify the fix against the original failing case and a sample of earlier runs; a change that does not reproduce the failure is not a fix.
5. **MUST** keep the environment in version control and review changes to it like code ([BP-0015](/agent-engineering/instructions-prompting/write-an-agents-md/), [BP-0017](/agent-engineering/instructions-prompting/one-source-of-truth-for-agent-instructions/)).
6. **MUST** add an instruction rule only for a failure that recurred, and remove a rule when the model or tooling no longer needs it.
7. **MUST** measure recurrence before and after the change: count the same failure per hundred runs or per completed unit.
8. **MUST NOT** stop at fixing the single run; the next run is the test of the environment.
9. **SHOULD** share one environment across projects that do the same work, with project-specific deltas kept small and named.
10. **MUST** give the environment an owner and a review cadence, and record who approved each change.

## When to apply

Use it whenever agents repeat work: a coding fleet, a support desk, a content line, a triage loop. The signal is a correction you have made before, or a review comment that names the same class of mistake. It applies to the instruction file, the skills, the hooks, the lints, the type system, the tests and the permissions, because all of them are part of what the agent works inside.

Do not use it to paper over a single accident: one odd failure may teach nothing and a rule added for it is noise ([BP-0084](/operations/evaluation/detect-agents-drifting-from-practice/) covers detecting drift from the practices already in place). Do not use prose for a rule a machine can enforce; an instruction the model may ignore is weaker than a lint that fails the build. And do not let the environment grow without pruning: rules kept after their cause is gone slow every future run.

## Procedure

1. Keep an intervention log beside the work: the run, the symptom, the correction, and what was missing.
2. On the second occurrence of the same class, open an environment change instead of a third correction.
3. Choose the control: lint or type rule, test, hook, permission or check script first; then a skill; then an instruction line.
4. Reproduce the original failure against the changed environment. If it does not reproduce, the change is not a fix.
5. Measure recurrence over a fixed window before and after the change; record both numbers.
6. Review the change like code, with an owner and a date.
7. Put the change in one place that every agent in the scope loads, not in a per-run prompt ([BP-0017](/agent-engineering/instructions-prompting/one-source-of-truth-for-agent-instructions/)).
8. On the review cadence, remove rules and controls whose failure no longer occurs, and record the removal.

## Examples

A coding fleet keeps leaving commented-out code. The reviewer deletes it twice, then turns the pattern into a lint rule that fails the build. The next run cannot leave it behind. The rule is verified by restoring an old branch and watching the lint fail.

An agent writes tautological tests that assert a mock returns what the mock was told to return. After the second correction, the team adds a review checklist item and a test-lint that rejects an assertion whose expected value is the mock's own return. The recurrence count drops from six in twenty runs to zero in forty.

A support agent keeps promising refunds it cannot grant. The fix is not a stronger instruction but a permission change: the refund tool is removed from the agent's tool list, and a person handles it. The instruction line is added only if a second failure appears after the tool is gone.

## Anti-patterns

- Fixing the instance and moving on, so the same correction recurs every week.
- Adding a paragraph to the instruction file for a failure a lint could have caught.
- Adding a rule for a one-off accident and never removing it.
- Claiming the environment is fixed without reproducing the original failure.
- Changing the environment without measuring whether the failure became rarer.
- Editing one agent's session prompt instead of the shared environment every agent loads.
- Letting the environment grow with no owner, no review and no pruning.

## Checklist

- [ ] A repeated failure was treated as an environment defect, not a single run to patch
- [ ] Each intervention is logged with the run, symptom and missing control
- [ ] The fix sits in the cheapest deterministic control that prevents recurrence
- [ ] The fix reproduces the original failure and passes afterwards
- [ ] The environment change is in version control and reviewed like code
- [ ] Instruction rules are added only for recurrences, and removed when unneeded
- [ ] Recurrence is measured before and after the change
- [ ] The fix is in the shared environment, not a single run
- [ ] The environment has an owner and a review cadence
