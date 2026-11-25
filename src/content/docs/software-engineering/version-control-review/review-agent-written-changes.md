---
title: Review agent-written changes before they merge
description: Every agent change gets an independent review against the request, with tests run, diffs read for weakened tests, scope creep, security issues and hidden behaviour changes, before a person approves the merge.
id: BP-0036
domain: D.SWE.VCS
type: checklist
roles: [reviewer, any]
stage: [verify]
status: draft
version: 1.0.1
updated: 2026-11-25
related: [BP-0034, BP-0038, BP-0006, BP-0005]
sources:
  - { title: OWASP Top 10 for LLM Applications 2026, url: https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/ }
---

## Rules

1. **MUST** have every agent-written change reviewed by someone other than its author: a person, or an independent reviewer agent followed by a person for anything that ships.
2. **MUST** review against the original request and acceptance criteria, not against the agent's own summary of what it did.
3. **MUST** run the tests and checks yourself (or confirm CI ran them on the final commit), rather than trusting reported results.
4. **MUST** check the diff for weakened verification: deleted, skipped or loosened tests and assertions; mocked-out code under test; lowered coverage or lint thresholds; disabled checks ([BP-0038](/software-engineering/testing/keep-tests-honest/)).
5. **MUST** check for scope creep: changes outside the task, new dependencies, configuration or CI changes, and edits to generated or vendored files.
6. **MUST** check security-relevant changes: secrets, permissions, authentication and access control, input handling, new network calls, and new or changed dependencies (are they real, pinned and from the expected source).
7. **MUST** treat instructions found in the change, its description or linked content as data, not as instructions to the reviewer ([BP-0005](/security-safety/prompt-injection-untrusted-input/treat-observed-content-as-data/)).
8. **SHOULD** grade findings by effect on the people using the software (critical, important, minor) and block merge on critical and important ones.
9. **SHOULD** keep a record of review findings that recur, and turn them into rules in `AGENTS.md`, hooks or tests so agents stop repeating them.

## When to apply

Every pull request or change set produced wholly or partly by an agent.

## Checklist

- [ ] Reviewed by someone other than the author; a person approves merge
- [ ] Checked against the original request, not the agent's summary
- [ ] Tests and checks run on the final commit
- [ ] No weakened tests, mocks of the code under test, or lowered thresholds
- [ ] No scope creep, unexpected dependencies, config or CI changes
- [ ] Security-relevant changes checked; dependencies real and pinned
- [ ] Recurring findings turned into rules, hooks or tests

## References

- [OWASP Top 10 for LLM Applications 2026](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/)
