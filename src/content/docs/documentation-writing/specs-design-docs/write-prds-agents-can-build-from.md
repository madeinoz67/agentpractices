---
title: Write PRDs that agents can build and test against
description: Write a product requirements document with a stated problem and why, measurable success, explicit non-goals, numbered requirements with testable acceptance criteria (EARS style), constraints, open questions and an owner; review it for gaps and contradictions before planning; and keep it as the reference every plan, task and test traces back to.
id: BP-0058
domain: D.DOC.SPC
type: guideline
roles: [planner, orchestrator, reviewer]
stage: [plan, verify]
status: draft
version: 1.0.1
updated: 2026-11-26
reviewed: 2026-11-26
review_by: 2027-05-26
related: [BP-0057, BP-0048, BP-0008, BP-0037, BP-0006, BP-0024, BP-0009, BP-0085]
sources:
  - { title: GitHub Spec Kit — spec-driven development, url: https://github.com/github/spec-kit }
  - { title: Kiro docs — Specs (requirements in EARS notation), url: https://kiro.dev/docs/specs/concepts }
  - { title: Easy Approach to Requirements Syntax (EARS), url: https://en.wikipedia.org/wiki/Easy_Approach_to_Requirements_Syntax }
---

A product requirements document (PRD) says **what** to build and **why**, not how. For agents it is the contract: plans are argued from it, tasks trace to it, tests prove it, and reviewers grade against it. Spec-driven tools such as GitHub Spec Kit and Kiro make the same split: requirements first, then design or plan, then tasks, then code, with review between steps.

## Rules

### Content

1. **MUST** include these sections:

   | Section | Contains |
   | --- | --- |
   | Problem and why | Who has the problem, what it costs them, why now |
   | Users | Who uses it and in what situation |
   | Success | Measurable outcomes, with how they will be measured |
   | Goals / non-goals / anti-goals | What is in, what is deliberately out, what would make it a failure even if it works |
   | Requirements | Numbered, each with acceptance criteria |
   | Non-functional requirements | Security, privacy, performance, accessibility, operations, cost |
   | Constraints | Platforms, versions, dependencies, budgets, policies, deadlines (exact values) |
   | Assumptions and open questions | Each with an owner |
   | Owner, status, version, date | Who decides; draft / approved |

2. **MUST** keep the *how* out, except where a decision is a real constraint; record it as a constraint with its reason.
3. **MUST** give each requirement a stable ID (`R-012`) that never changes or gets reused, so plans, tasks, tests and commits can cite it.

### Testable requirements

4. **MUST** write acceptance criteria that can be checked, one behaviour each. Use EARS-style patterns:

   | Pattern | Form |
   | --- | --- |
   | Always | THE SYSTEM SHALL … |
   | Event | WHEN … THE SYSTEM SHALL … |
   | State | WHILE … THE SYSTEM SHALL … |
   | Unwanted | IF … THEN THE SYSTEM SHALL … |
   | Optional feature | WHERE … THE SYSTEM SHALL … |

5. **MUST** cover error, empty and edge cases, not only the happy path, and define every term that could be read two ways ([BP-0024](/knowledge-modelling/semantics-metadata/define-terms-once/)).
6. **MUST NOT** use words that cannot be tested ("fast", "user-friendly", "robust", "as appropriate"); replace them with numbers or observable behaviour.

### Review before planning

7. **MUST** review the PRD before any plan is written: a fresh agent or person checks for gaps (a goal with no requirement), contradictions (two criteria no implementation can satisfy together), ambiguity (criteria with more than one reasonable reading), and untestable wording. Fix or record each as an open question.
8. **MUST** get the owner's approval and record it; the PRD is then the reference until changed through review ([BP-0057](/documentation-writing/specs-design-docs/brainstorm-intent-before-specifying/)).

### Use it

9. **MUST** trace work to it: every planned unit names the requirement IDs it delivers, every requirement maps to at least one unit and one test, and the final review checks each criterion ([BP-0008](/agent-engineering/workflow/decompose-tasks/), [BP-0048](/multi-agent-systems/coordination-handoff/orchestrate-agent-workflows/)).
10. **SHOULD** write acceptance tests from the criteria before implementation ([BP-0037](/software-engineering/testing/test-first-with-agents/)).
11. **MUST** change the PRD when the requirement changes, through review with a version bump and change note. If code and PRD disagree, decide which is right and fix the other; never leave both. Find where they have drifted apart with [BP-0085](/documentation-writing/specs-design-docs/detect-prd-drift/).
12. **SHOULD** store PRDs in the repository as Markdown in plain language, where agents and people read the same file ([BP-0009](/documentation-writing/human-readable-docs/write-human-readable-docs/)).

## When to apply

Features and projects big enough to need a plan; anything where several agents or people must build to the same understanding.

## Examples

Requirement with EARS acceptance criteria:

```markdown
### R-007 Report a problem on a practice page
User story: As a reader, I want to report a problem with a practice so that errors get fixed.

Acceptance criteria
1. THE SYSTEM SHALL show a "Report a problem" link on every practice page.
2. WHEN the reader selects the link, THE SYSTEM SHALL open a pre-filled GitHub issue form with the practice ID and version.
3. IF the practice has no ID, THEN THE SYSTEM SHALL fail the site build with error E_NOID.
4. WHERE the site is built without a repository URL, THE SYSTEM SHALL omit the link.
```

Traceability in a plan:

```markdown
Unit 3: report link component — delivers R-007.1, R-007.2; tests: report-link.test.ts
Unit 4: build check for missing IDs — delivers R-007.3; tests: practices.test.ts (E_NOID)
```

## Anti-patterns

- A PRD that is a list of features with no why and no success measure.
- "The page should load fast" instead of a number and a condition.
- Architecture and class names in the requirements.
- Requirements renumbered so commits and tests point at the wrong thing.
- The code changed, the PRD did not.

## Checklist

- [ ] Problem, users, measurable success, goals / non-goals / anti-goals
- [ ] Numbered requirements with stable IDs and testable criteria (EARS-style)
- [ ] Edge and error cases; non-functional requirements; constraints with exact values
- [ ] Reviewed for gaps, contradictions, ambiguity; approved by the owner
- [ ] Units, tests and final review trace to requirement IDs
- [ ] Changed through review when requirements change

## References

- [GitHub Spec Kit](https://github.com/github/spec-kit)
- [Kiro — Specs](https://kiro.dev/docs/specs/concepts)
- [EARS — Easy Approach to Requirements Syntax](https://en.wikipedia.org/wiki/Easy_Approach_to_Requirements_Syntax)
