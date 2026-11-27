---
title: Enforce codebase invariants in the compiler and CI, not in review
description: "Shape the codebase so the shortest path is the correct one: name the nouns, co-locate each feature, enforce every invariant with the compiler, lint, test or CI import check, ban agent footguns, and turn repeated review comments into automation."
id: BP-0105
domain: D.SWE.QLT
type: pattern
roles: [implementer, reviewer]
stage: [build, operate]
status: draft
version: 1.0.0
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0015, BP-0037, BP-0038, BP-0054, BP-0056, BP-0084]
superseded_by: null
sources:
  - title: "Ai insider — Lauren Tan reveals how to build a 21+ agent GrokBot team"
    url: https://www.youtube.com/watch?v=PcO998TSzIz
    note: The shortest path is the best path; named nouns, one directory per feature, import checks in CI, banned footguns and comment styles, layered enforcement with hard CI over soft rules and skills, and every human review comment treated as a code smell to turn into a lint; behind rules 1 to 6 and 8.
  - title: "The Rust Programming Language — Understanding Ownership"
    url: https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html
    note: The concrete case for a compiler that rejects a class of error before review, which is the trust argument in rule 7.
  - title: "Anthropic — Claude Code best practices"
    url: https://www.anthropic.com/engineering/claude-code-best-practices
    note: Hooks, permissions and instruction files as the places a rule is enforced for an agent, which is the ladder in rule 3.
---

A codebase lets agents take the wrong path more cheaply than the right one. A feature's code is spread across layers, imports cross boundaries because nothing stops them, and the conventions live in a style guide a person enforces in review. Agents copy the nearest pattern, so one bad pattern becomes the template, and every review comment that enforces an invariant is paid again on the next change.

This practice shapes the codebase so the shortest path is the correct one, and moves each invariant into a mechanism that cannot forget it: the compiler, a lint, a test, a CI import check. The review then spends its attention on design and correctness, which no tool can check. The noun-and-layout argument, the hard-versus-soft enforcement ladder and the "review comment is a code smell" rule come from Lauren Tan's second talk (first source); the compiler-first ordering and the failure proof are additions grounded in the other sources.

## Rules

1. **MUST** name the codebase's core nouns and write down where each one lives, so the same concept has one place and one conventional way to add it.
2. **MUST** make the shortest path the correct one: adding a feature the conventional way must take fewer steps than any alternative, with all of that feature's code co-located in one directory.
3. **MUST** enforce each invariant with the strongest mechanism available, in this order: compiler and type system, then lint and static analysis, then test, then a CI import check, then a skill or instruction ([BP-0015](/agent-engineering/instructions-prompting/write-an-agents-md/)).
4. **MUST** turn every review comment that enforces an invariant into a compiler rule, lint, test or CI check; a comment that has to be repeated is a tooling gap.
5. **MUST** ban the footguns agents reach for by default (a specific hook, global state, comment style, unsafe block) in a check that fails CI, and record why each ban exists.
6. **MUST** check the import graph in CI, so a module cannot reach into a layer it must not use.
7. **MUST** prefer a stack whose compiler rejects the class of error (types, ownership, exhaustiveness) over one that relies on reviewer attention.
8. **MUST** prove each enforcement can fail: introduce the bad pattern on a branch and confirm CI goes red.
9. **SHOULD** add a lint only for a bad pattern observed in real runs, and remove it when it stops firing.
10. **MUST** treat a prototype with no guardrails as the highest-risk codebase, and add the nouns, layout and CI gates before scaling agents on it.
11. **SHOULD** keep the nouns, layout and hard rules in one `AGENTS.md`, with the CI check as the source of truth when they disagree ([BP-0015](/agent-engineering/instructions-prompting/write-an-agents-md/)).

## When to apply

Apply it to any codebase agents change regularly, and earliest to a fresh prototype that was built quickly with little human reading: that codebase has no guardrails, and it is where agents will copy the worst pattern fastest. A brownfield codebase that already has frameworks, conventions and credential limits is in a better position; it needs the same treatment at the places agents actually touch.

Do not mistake a style guide or an `AGENTS.md` for enforcement. Those are the softest rungs, and the practice is about adding the hard ones. Do not add a lint for a pattern nobody has produced: a rule with no observed failure is noise that slows every change. And do not use this practice to avoid design review; it moves mechanics out of review, it does not remove the review ([BP-0038](/software-engineering/testing/keep-tests-honest/)).

## Procedure

1. List the core nouns, the directory each lives in, and the conventional way to add each.
2. Move a feature's code into one directory where it is not already, so an agent can work in one place.
3. Draw the allowed import directions between layers and write them as a check the build runs.
4. For each invariant, pick the strongest mechanism that can express it: compiler, lint, test, CI check, then prose.
5. Implement the checks and record why each exists next to the rule.
6. Prove each one: add the bad pattern on a branch and confirm the check fails, then revert.
7. Put the nouns, layout and hard rules in `AGENTS.md`; where it disagrees with the CI, fix the file.
8. On every review comment that enforces an invariant, open a change to a check instead of repeating the comment.
9. Review the checks on a cadence; remove the ones that no longer fire and record the removal ([BP-0084](/operations/evaluation/detect-agents-drifting-from-practice/)).

## Examples

Feature layout: everything for the onboarding feature lives in `src/features/onboarding/`, and its entry point is registered in one conventional place. An agent asked to change onboarding has one directory to read and one file to register.

Import boundary: the build fails when a module under `main/` imports from `renderer/`, or the reverse. The check is a small script over the import graph, run in CI, so a wrong-direction import cannot merge.

Banned footgun: the repository bans a hook that agents reach for by default and a comment style that records conversation history. Both fail CI with a message that says what to do instead. The ban is proven by a branch that adds the pattern and watches the check go red.

Review comment to lint: a reviewer writes "do not call the network from this layer" for the third time. The third comment opens a lint rule instead of a fourth comment.

## Anti-patterns

- A style guide that a person enforces in review, with no check behind it.
- Rules that live only in a skill or an instruction file, which agents can forget or argue with.
- A `utils/` or `common/` directory that everything imports, so no boundary exists.
- Adding lints for hypothetical problems, then never removing the ones that stop firing.
- A greenfield prototype with no conventions, scaled to many agents before the guardrails exist.
- Treating a compiler error as an obstacle to route around with an unsafe escape hatch.
- Keeping a review comment as the record of an invariant instead of automating it.

## Checklist

- [ ] Core nouns and their locations are named and written down
- [ ] Each feature's code is co-located, and the conventional path is the shortest
- [ ] Every invariant has the strongest mechanism that can express it
- [ ] Repeated review comments become compiler rules, lints, tests or CI checks
- [ ] Agent footguns are banned in a check that fails CI, with the reason recorded
- [ ] The import graph is checked in CI
- [ ] The stack's compiler rejects a class of error rather than leaving it to review
- [ ] Each enforcement is proven by making it fail on a branch
- [ ] A prototype without guardrails gets conventions and CI gates before agent scale
