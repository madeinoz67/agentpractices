---
title: Evaluate agent output against explicit criteria
description: Judge agent work with written, checkable criteria and real examples, preferring automated checks and independent reviewers over self-assessment.
id: BP-0006
domain: D.OPS.EVL
type: guideline
roles: [reviewer, orchestrator]
stage: [verify, operate]
status: draft
version: 1.0.1
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0002]
---
## Rules

1. **MUST** define pass/fail criteria before reviewing, derived from the original request.
2. **MUST** prefer automated, repeatable checks (tests, schema validation, link checks) over reading the output.
3. **MUST** evaluate against real or representative inputs, including edge cases, not only the happy path.
4. **SHOULD** use a reviewer that did not produce the work for high-stakes output.
5. **SHOULD** grade findings by effect on the person using the output (critical, important, minor), not by how the spec is worded.
6. **SHOULD** keep a regression set: every real failure becomes a case that is re-run.
7. **MAY** use a model as judge, but only with a written rubric and spot-checks against human judgement.

## When to apply

Reviewing another agent's deliverable, accepting a handoff result, comparing prompts, models or workflows, and before shipping anything agent-built.

## Procedure

1. Write the criteria (each one checkable).
2. Run automated checks; record results.
3. Review what automation cannot cover against the criteria.
4. Report: verdict, findings by severity, and what was not evaluated.

## Anti-patterns

- "Looks good" reviews with no criteria.
- The author grading its own work as the only check.
- Evaluating on the examples used to build the thing.

## Checklist

- [ ] Criteria written first
- [ ] Automated checks run
- [ ] Edge cases included
- [ ] Unevaluated areas stated
