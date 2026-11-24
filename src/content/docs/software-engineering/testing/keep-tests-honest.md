---
title: Keep tests honest — never weaken verification to get a pass
description: An agent must not delete, skip, loosen or mock away a test, assertion, check or threshold to make work pass; a failing test is information about the code (or a genuinely wrong test, changed only with approval and a reason).
id: BP-0038
domain: D.SWE.TST
type: guideline
roles: [implementer, reviewer, any]
stage: [build, verify]
status: draft
version: 1.0.0
updated: 2026-11-24
related: [BP-0037, BP-0036, BP-0006]
sources:
  - { title: Anthropic — Claude Code best practices, url: https://www.anthropic.com/engineering/claude-code-best-practices }
---

## Rules

1. **MUST NOT** delete, skip, disable, or mark as expected-to-fail a test to make a change pass.
2. **MUST NOT** loosen an assertion (wider tolerance, weaker matcher, removed field check), lower a coverage, lint or type-check threshold, or add ignore rules to make a change pass.
3. **MUST NOT** replace the code under test with a mock, stub or hard-coded value, or special-case test inputs in production code.
4. **MUST** treat a failing test as evidence about the code first. Find the cause before changing anything ([BP-0002](/agent-engineering/workflow/plan-execute-verify/)).
5. **MUST**, when a test is genuinely wrong (the requirement changed, or the test asserts the wrong thing), say so, explain why, and get the owner's approval before changing it; record the reason in the commit message.
6. **MUST** report pre-existing failures and flaky tests by name instead of hiding them, and never claim "all tests pass" when some were skipped or failed.
7. **SHOULD** make test integrity checkable: CI fails on newly skipped tests and on lowered thresholds; reviewers check test diffs first ([BP-0036](/software-engineering/version-control-review/review-agent-written-changes/)).
8. **SHOULD** quarantine a confirmed flaky test with an issue link and an owner, not silently retry until it passes.

## When to apply

Any agent working in a codebase with tests, linters, type checks or coverage gates — especially unattended agents measured on "tests green".

## Examples

Bad diff an agent might produce:

```diff
- expect(parseTags('')).toThrow('tag is empty');
+ // TODO: flaky
+ it.skip('rejects empty tags', () => {});
```

Good response: "`parseTags('')` returns `[]` instead of throwing; the test is right. Fixed the parser; full suite 82/82."

## Anti-patterns

- `@pytest.mark.skip`, `it.skip`, `t.Skip()` added in the same change as a feature.
- `coverage: 80` → `coverage: 60` in a "fix tests" commit.
- `if (process.env.NODE_ENV === 'test') return expected;` in production code.
- Retrying CI until a flaky failure goes away.

## Checklist

- [ ] No tests deleted, skipped or loosened to pass
- [ ] No lowered thresholds or new ignore rules
- [ ] No mocks of the code under test or test-only branches in production
- [ ] Wrong tests changed only with approval and a recorded reason
- [ ] Failures and flaky tests reported by name

## References

- [Anthropic — Claude Code best practices](https://www.anthropic.com/engineering/claude-code-best-practices)
