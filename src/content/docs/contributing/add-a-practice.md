---
title: Add a practice
description: How a person or agent adds a new practice — file location, frontmatter, sections, validation.
sidebar:
  order: 1
---

## Rules

1. **MUST** file the practice under the folder of its domain: `src/content/docs/<domain path>/<slug>.md`, where the domain path is the taxonomy labels slugified (for example `D.SWE.CLI` → `software-engineering/cli-design/`).
2. **MUST** take the next unused `BP-NNNN` ID; IDs are never reused.
3. **MUST** include all required frontmatter (see the [template](../practice-template/)).
4. **MUST** start the body with `## Rules` and use the standard section order.
5. **MUST** pass `bun test && bun run check && bun run build` before opening a pull request.
6. **SHOULD** start new practices as `status: draft`; the owner promotes them to `adopted`.
7. **SHOULD** bump `version` on any change to Rules — minor for added or relaxed rules, major for changed or removed rules, patch for wording.
8. **MUST NOT** delete a practice; set `status: deprecated` and `superseded_by`.

## Procedure

1. Pick the domain from [`taxonomy.json`](/best-practices/taxonomy.json). If none fits, [extend the taxonomy](../extend-the-taxonomy/) first.
2. Copy the template into the domain folder.
3. Write the Rules first, then the supporting sections.
4. Run the checks; fix every error.
5. Add a line to `CHANGELOG.md`.
