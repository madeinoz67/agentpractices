---
title: Write docs agents can act on
description: Structure documentation so an agent can fetch one page, find the rule, and act — stable IDs, rules first, fixed sections, raw Markdown and an llms.txt index.
id: BP-0007
domain: D.DOC.AGR
type: guideline
roles: [any]
stage: [build]
status: draft
version: 1.1.0
updated: 2026-11-25
reviewed: 2026-11-25
review_by: 2027-05-25
related: [BP-0001, BP-0004, BP-0009]
sources:
  - { title: The /llms.txt file, url: https://llmstxt.org/ }
  - { title: 'RFC 2119 — Key words for use in RFCs', url: https://www.rfc-editor.org/rfc/rfc2119 }
---

## Rules

1. **MUST** put the actionable rules first, as a numbered list using RFC 2119 keywords (**MUST**, **SHOULD**, **MAY**).
2. **MUST** make each page self-contained: it can be fetched and used without reading other pages.
3. **MUST** give each page a stable ID and a version so agents can cite and cache it.
4. **MUST** publish raw Markdown alongside HTML, and an `llms.txt` index with one line per page.
5. **SHOULD** use the same section order on every page so agents can jump to a section by name.
6. **SHOULD** state when a rule applies and when it does not.
7. **SHOULD** show a good and a bad example for each non-obvious rule.
8. **SHOULD** link to primary sources instead of restating them.
9. **MAY** provide a machine-readable catalogue (JSON) for filtering.
10. **MUST** publish a `content_hash` for each versioned page in the machine-readable catalogue.
11. **MUST NOT** change a page's version or `content_hash` when only metadata refreshes: a star count, a build timestamp, a generated-at date.
12. **SHOULD** have consumers cache by content identity and refetch on a change to it, never on a clock.

## When to apply

Any documentation an agent will read: practices, runbooks, API docs, skills, READMEs, `AGENTS.md` files.

## Examples

This site: every practice follows Rules → When to apply → Procedure → Examples → Anti-patterns → Checklist → References, has a `BP-NNNN` ID and semver, and is served as `.md`. Its `catalog.json` carries a `content_hash` per practice, computed over the content only, so a scheduled star-count refresh moves `generated` and no hash.

## Anti-patterns

- Long narrative pages where the rule is in paragraph six.
- Content only available as rendered HTML or images.
- Renaming pages without keeping the old ID resolvable.
- A consumer that refetches on a timer, or when a generated-at timestamp moves with no content change behind it.

## Checklist

- [ ] Rules first, RFC 2119 keywords
- [ ] Stable ID + version
- [ ] `content_hash` per page, unchanged by metadata refreshes
- [ ] Raw `.md` and `llms.txt` published

## References

- [The /llms.txt file](https://llmstxt.org/)
- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)
