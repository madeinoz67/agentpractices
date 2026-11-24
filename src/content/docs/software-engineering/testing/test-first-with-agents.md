---
title: Work test-first with agents
description: Before an agent changes behaviour, write a test that captures it, run it and watch it fail for the right reason, make the smallest change that passes, then run the full suite — tests are the agent's done-criterion.
id: BP-0037
domain: D.SWE.TST
type: pattern
roles: [implementer, any]
stage: [build, verify]
status: draft
version: 1.0.0
updated: 2026-11-24
related: [BP-0038, BP-0002, BP-0008, BP-0034]
sources:
  - { title: Anthropic — Claude Code best practices, url: https://www.anthropic.com/engineering/claude-code-best-practices }
---

## Rules

1. **MUST** write or update a test that expresses the required behaviour before changing production code for a feature or bug fix.
2. **MUST** run the new test and see it fail, and check it fails for the expected reason (missing behaviour), not because of a typo, import error or broken setup.
3. **MUST** make the smallest change that makes the test pass, then run it again and see it pass.
4. **MUST** run the project's full test suite before claiming the task is done, and report the command and its result; a passing new test is not a passing suite.
5. **MUST** reproduce a reported bug with a failing test before fixing it, and keep that test as a regression test.
6. **SHOULD** write tests against behaviour through public interfaces, with real collaborators where practical; mock only slow, external or non-deterministic dependencies.
7. **SHOULD** include edge cases and error paths in the tests the task implies (empty input, invalid input, boundaries, failures of dependencies).
8. **SHOULD** commit the test and the change together, or the test first, so history shows the behaviour was specified before it was built.
9. **MAY** skip test-first for throwaway spikes, pure configuration or generated code, if the person who asked agrees; a spike's code is not merged as-is.

## When to apply

Any agent change that adds or alters behaviour in code that has, or should have, tests.

## Procedure

1. Write the test for one behaviour.
2. Run it: expect a failure; read the failure message.
3. Implement the minimum to pass.
4. Run it: expect a pass.
5. Run the full suite; fix anything else that broke.
6. Refactor if needed, keeping everything green.
7. Commit; report commands and results.

## Anti-patterns

- Writing code first and tests afterwards that pass on the first run, proving nothing.
- "Tests should pass" without running them.
- Running only the new test file.
- Tests that assert on mocks rather than behaviour.

## Checklist

- [ ] Test written first and seen failing for the right reason
- [ ] Minimal change; test seen passing
- [ ] Full suite run; command and result reported
- [ ] Bugs reproduced by a failing test first
- [ ] Edge cases and error paths covered

## References

- [Anthropic — Claude Code best practices](https://www.anthropic.com/engineering/claude-code-best-practices)
