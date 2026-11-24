---
title: Write docs agents can act on
description: Structure documentation so an agent can fetch one page, find the rule, and act — stable IDs, rules first, fixed sections, raw Markdown and an llms.txt index.
id: BP-0007
domain: D.DOC.AGR
type: guideline
roles: [any]
stage: [build]
status: draft
version: 1.0.0
updated: 2026-11-24
related: [BP-0001, BP-0004]
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

## When to apply

Any documentation an agent will read: practices, runbooks, API docs, skills, READMEs, `AGENTS.md` files.

## Examples

This site: every practice follows Rules → When to apply → Procedure → Examples → Anti-patterns → Checklist → References, has a `BP-NNNN` ID and semver, and is served as `.md`.

## Anti-patterns

- Long narrative pages where the rule is in paragraph six.
- Content only available as rendered HTML or images.
- Renaming pages without keeping the old ID resolvable.

## Checklist

- [ ] Rules first, RFC 2119 keywords
- [ ] Stable ID + version
- [ ] Raw `.md` and `llms.txt` published

## References

- [The /llms.txt file](https://llmstxt.org/)
- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)
