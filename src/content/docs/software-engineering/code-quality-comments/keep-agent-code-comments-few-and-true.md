---
title: Keep agent-written code comments few, true and about why
description: Agents write code that explains itself through names, types and structure; they comment only to record what code cannot say (external constraints, public API contracts, licence and provenance headers, links to the reason); never narrate, never leave change notes or dead code; and keep every surviving comment true, because a wrong comment misleads the next agent more than a missing one.
id: BP-0054
domain: D.SWE.QLT
type: guideline
roles: [implementer, reviewer]
stage: [build, verify]
status: draft
version: 1.0.0
updated: 2026-11-24
reviewed: 2026-11-24
review_by: 2027-05-24
related: [BP-0036, BP-0034, BP-0052, BP-0018, BP-0037]
sources:
  - { title: pstack (Cursor plugins) — no-comments skill and comment-sicko agent, url: https://github.com/cursor/plugins/tree/main/pstack }
  - { title: 'Macke & Doyle — Testing the Effect of Code Documentation on LLM Code Understanding (2024)', url: https://arxiv.org/abs/2404.03114 }
  - { title: 'On the Impact of Code Comments for Automated Bug-Fixing: An Empirical Study (2026)', url: https://arxiv.org/abs/2601.23059 }
  - { title: 'Inside Out: Uncovering How Comment Internalization Steers LLMs for Better or Worse (2025)', url: https://arxiv.org/abs/2512.16790 }
---

**Position:** few comments, every one true, each saying *why* or *what must not change*. Not zero.

pstack's `no-comments` skill takes the strict end: a reviewer agent deletes comments by default and keeps only a short list of exceptions (licence headers, behaviour forced by something outside your control, public API doc comments, justified lint suppressions, links to an issue or RFC). A comment explaining a surprise in *your own* code is treated as a sign the code should be renamed, typed or restructured instead.

The research is mixed but points the same way on the part that matters:

- **Wrong comments hurt.** Incorrect documentation greatly reduced LLM code understanding, while missing or incomplete documentation had little effect (Macke & Doyle, 2024). Comments generated from buggy code did not help bug-fixing models and could mislead them.
- **Accurate, informative comments can help.** In one bug-fixing study, comments raised fix accuracy up to about threefold; comments explaining *how* a method is implemented helped most, comments restating *what* it does helped least.
- **Effect depends on task and model.** Probing work found models treat comments as distinct concepts, with effects that helped some tasks and hurt others.

So the risk is not comments; it is comments that are stale, redundant or wrong. Agents produce those at volume.

## Rules

1. **MUST** make the code carry its own meaning first: names, types, small functions, tests. If a comment is needed to explain your own code, first try to rename, extract, type or restructure so it is not.
2. **MUST NOT** write narration comments that restate the code (`// increment counter`, `// loop over users`), section banners, or commented-out code.
3. **MUST NOT** put change history in comments (`// updated to fix bug`, `// added by agent`, `// previously used X`). That belongs in the commit message and PR ([BP-0034](/software-engineering/version-control-review/make-agent-commits-reviewable/)).
4. **MAY** keep comments in these cases only:

   | Keep | Example |
   | --- | --- |
   | Licence and provenance headers your project requires | `// SPDX-License-Identifier: MIT`, `// author: …` |
   | Behaviour forced by something you cannot change | Vendor API quirk, protocol rule, platform bug, with a link |
   | Public API contracts | Docstrings/JSDoc for exported functions: inputs, outputs, errors, invariants |
   | The reason for a non-obvious decision | Why this algorithm, why this limit, with a link to the issue, ADR or RFC |
   | Justified lint or type suppressions | With the rule name and why it does not apply here |

5. **SHOULD** encode a "do not change" constraint as a type, a runtime check, a test or a lint rule where that is cheap; a test fails when the constraint is broken, a comment does not ([BP-0037](/software-engineering/testing/test-first-with-agents/)).
6. **MUST** keep comments true: when an agent changes code, it updates or deletes every comment and docstring that describes it, in the same change. A stale comment is a defect.
7. **MUST NOT** delete a comment you did not write without finding out why it is there: read the code around it, trace the named symbol, check history and linked issues. Delete only once the reason is gone or is now expressed in code.
8. **SHOULD** have the reviewer, not the author, judge comments: authors defend their own comments. A fresh-context reviewer checks each comment against the keep list and against the code it describes ([BP-0036](/software-engineering/version-control-review/review-agent-written-changes/)).
9. **SHOULD** state the comment policy in the repository's agent instructions (AGENTS.md / CLAUDE.md) so every agent follows the same rule, and enforce what can be enforced with lint (for example, ban commented-out code or `@ts-ignore` without a reason).

## When to apply

Every change an agent writes or reviews in source code.

## Examples

Before (typical agent output):

```ts
// Function to get the user
// Updated: now handles null
async function getUser(id: string) {
  // Check if id is empty
  if (!id) return null;
  // Retry 3 times because the API is flaky
  return retry(() => api.users.get(id), 3);
}
```

After:

```ts
// author: Stephen Eaton
const USERS_API_MAX_ATTEMPTS = 3; // Vendor returns transient 502s under load: https://status.example.com/incidents/1234

async function findUser(id: string): Promise<User | null> {
  if (!id) return null;
  return retry(() => api.users.get(id), USERS_API_MAX_ATTEMPTS);
}
```

The narration and change note are gone; the name and return type say what the function does; the one comment left records a reason the code cannot express, with a link.

Agent-instruction snippet:

```markdown
## Comments
- Prefer names, types and tests to comments.
- Keep only: licence/author headers, external constraints (with link), public API docs, reasons for non-obvious decisions, justified suppressions.
- No narration, change notes, banners or commented-out code.
- Update or delete comments in the same change as the code they describe.
```

## Anti-patterns

- A comment on every line, restating the code.
- `// Changed by Claude to fix the null bug` in source.
- Deleting every comment in a legacy file, including the one explaining a vendor bug.
- A comment saying "do not change this" with no reason and no test.
- Comments that describe what the code did two versions ago.

## Checklist

- [ ] Code made self-explanatory before any comment added
- [ ] No narration, banners, change notes or commented-out code
- [ ] Remaining comments fit the keep list and are true
- [ ] Constraints encoded in types, tests or lint where cheap
- [ ] Comments of unknown purpose investigated before deletion
- [ ] Policy in AGENTS.md / CLAUDE.md; reviewer checks comments

## References

- [pstack — no-comments skill and comment-sicko agent](https://github.com/cursor/plugins/tree/main/pstack)
- [Macke & Doyle — Testing the Effect of Code Documentation on LLM Code Understanding](https://arxiv.org/abs/2404.03114)
- [On the Impact of Code Comments for Automated Bug-Fixing](https://arxiv.org/abs/2601.23059)
- [Inside Out: How Comment Internalization Steers LLMs](https://arxiv.org/abs/2512.16790)
