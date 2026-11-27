---
title: Practice template
description: Copy-paste template for a new practice page.
sidebar:
  order: 5
---

Copy everything in the block below into a new file.

````md
---
title: Imperative title of the practice
description: One sentence; appears in llms.txt and catalog.json.
id: BP-NNNN
domain: D.XXX.YYY
type: guideline        # guideline | pattern | anti-pattern | checklist | procedure | reference
roles: [any]           # any | orchestrator | planner | implementer | reviewer | researcher
stage: [build]         # plan | build | verify | operate
status: draft          # draft | adopted | deprecated
version: 1.0.0
updated: YYYY-MM-DD
reviewed: YYYY-MM-DD   # last checked against sources and current practice; on or after updated
review_by: YYYY-MM-DD  # next review due; at most 12 months after reviewed (3 months for fast-moving topics)
related: []
superseded_by: null
sources:
  - title: Source title
    url: https://example.org
    note: Why this source matters to the rules above
---

## Rules

1. **MUST** …
2. **SHOULD** …
3. **MAY** …

## When to apply

## Procedure

## Examples

## Anti-patterns

## Checklist

- [ ] …
````

Each source needs a `note`: one line that says what that source contributes to the rules above. `bun run check` rejects a source with an empty note or a `TODO` note.

The page renders its **Sources** section from the frontmatter `sources` list, and its **See also** block from `related`. Do not write either one in the body.
