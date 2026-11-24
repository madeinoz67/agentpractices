---
title: Use a style guide and approved mockups for repeated UI
description: Before agents build UI that repeats, agree a machine-readable style guide (design tokens, components, usage and accessibility rules) and one approved mockup per page or screen type; make agents build only from those, check the result by rendering it against the mockup, and change the guide deliberately.
id: BP-0056
domain: D.SWE.UI
type: guideline
roles: [planner, implementer, reviewer]
stage: [plan, build, verify]
status: draft
version: 1.0.0
updated: 2026-11-24
related: [BP-0015, BP-0018, BP-0002, BP-0036, BP-0054, BP-0024]
sources:
  - { title: Design Tokens Community Group — Format Module 2025.10 (stable), url: https://www.designtokens.org/TR/2025.10/format/ }
  - { title: Playwright — Visual comparisons, url: https://playwright.dev/docs/test-snapshots }
  - { title: W3C — Web Content Accessibility Guidelines (WCAG) 2.2, url: https://www.w3.org/TR/WCAG22/ }
---

Agents are good at producing one screen and poor at producing the twentieth screen to match the first. Left alone, each new page gets slightly different colours, spacing, button styles and layouts. A written style guide in a form agents can read, plus an approved mockup for each kind of page, turns "make it look like the others" into something checkable.

## Rules

### Agree the design once

1. **MUST** create a style guide before agents build UI that will repeat (more than one page, screen, report or slide of the same kind). It covers:
   - **Design tokens**: colour, typography, spacing, radius, elevation, motion, in a machine-readable file. Prefer the Design Tokens Community Group format, stable since version 2025.10.
   - **Components**: the inventory, with variants and states (default, hover, focus, disabled, error, loading, empty).
   - **Usage rules**: when to use what, with do and don't examples.
   - **Accessibility**: target level (for example WCAG 2.2 AA), contrast, focus visibility, target size, motion.
2. **MUST** approve one mockup per page or screen type with a person before implementation, while changes are cheap. Offer a few distinct options, pick one, then freeze it.
3. **MUST** store the style guide and approved mockups in the repository (or a linked design system), versioned, with the approver and date. Mark replaced mockups as superseded rather than deleting them.

### Build only from the guide

4. **MUST** make agents use tokens, not raw values: no hard-coded colours, font sizes or spacing in components. Enforce with a lint rule or a check that rejects raw values outside the token file.
5. **MUST** reuse existing components. A genuinely new pattern is proposed, approved and added to the library first, then used, never built as a one-off inside a page.
6. **MUST** give agents the guide where they will read it: point to it from AGENTS.md or CLAUDE.md, or package it as a skill that loads the tokens and component rules when UI work starts ([BP-0015](/agent-engineering/instructions-prompting/write-an-agents-md/), [BP-0018](/agent-engineering/skills-reusable-procedures/author-agent-skills/)). Reference the approved mockup by path in each brief; attach its image when the model can read images.
7. **SHOULD** keep exploration and production separate: agents generate variations as mockups, not as changes to production UI.

### Check by looking

8. **MUST** render what the agent built and compare it with the approved mockup before calling it done; reading the code is not enough ([BP-0002](/agent-engineering/workflow/plan-execute-verify/)).
9. **SHOULD** add visual regression tests for approved pages, with baselines generated and compared in the same environment (browser, OS, fonts), because rendering differs between environments. Update baselines only on an intended design change.
10. **MUST** run automated accessibility checks and check the stated level manually where tools cannot (keyboard, focus order, screen reader labels).
11. **SHOULD** have a reviewer check new UI against the guide: tokens only, existing components, states covered, mockup matched ([BP-0036](/software-engineering/version-control-review/review-agent-written-changes/)).

### Change it on purpose

12. **MUST** change the guide through a reviewed change with a changelog entry, and change tokens rather than individual pages so the change reaches everything at once.
13. **SHOULD** re-check approved pages after a guide change (visual tests will flag them) and refresh the mockups that changed.

## When to apply

Any agent-built UI with more than one page or screen of a kind: web apps, dashboards, documentation sites, report and slide templates, emails.

## Examples

Tokens in the DTCG 2025.10 format (`design.tokens.json`):

```json
{
  "color": {
    "ink":    { "$type": "color", "$value": { "colorSpace": "srgb", "components": [0.09, 0.1, 0.12], "hex": "#171a1f" } },
    "accent": { "$type": "color", "$value": { "colorSpace": "srgb", "components": [0.0, 0.36, 0.85], "hex": "#005cd9" } },
    "link":   { "$type": "color", "$value": "{color.accent}" }
  },
  "space": {
    "2": { "$type": "dimension", "$value": { "value": 8,  "unit": "px" } },
    "4": { "$type": "dimension", "$value": { "value": 16, "unit": "px" } }
  },
  "font": {
    "body": { "$type": "fontFamily", "$value": ["IBM Plex Sans", "system-ui", "sans-serif"] }
  }
}
```

Agent instruction snippet:

```markdown
## UI
- Style guide: docs/design/style-guide.md; tokens: design/design.tokens.json.
- Approved mockups: docs/design/mockups/ (one per page type). Match them.
- Use tokens and existing components only. New pattern → propose it first.
- Before done: render, screenshot, compare with the mockup; run a11y checks.
```

Visual test (Playwright):

```ts
// author: Stephen Eaton
import { test, expect } from '@playwright/test';

test('practice page matches approved design', async ({ page }) => {
  await page.goto('/agent-engineering/workflow/plan-execute-verify/');
  await expect(page).toHaveScreenshot('practice-page.png', { maxDiffPixels: 100 });
});
```

This site followed the pattern: a style guide and a mockup were agreed before any page was built, and every page since is generated from the same theme variables and components.

## Anti-patterns

- "Make it look like the other pages" with no guide or mockup to point to.
- Hex codes and pixel values scattered through components.
- A new button style for each feature.
- Accepting UI work from the code diff without seeing it rendered.
- Regenerating visual baselines to make a failing test pass.
- Changing the look page by page instead of through tokens.

## Checklist

- [ ] Style guide with tokens (machine-readable), components, usage and accessibility rules
- [ ] One approved, versioned mockup per page or screen type
- [ ] Agents pointed to the guide; mockup referenced in each brief
- [ ] Tokens only and existing components only, enforced by a check
- [ ] Rendered and compared with the mockup; visual and accessibility tests run
- [ ] Guide changes reviewed, logged and made through tokens

## References

- [Design Tokens Format Module 2025.10](https://www.designtokens.org/TR/2025.10/format/)
- [Playwright — Visual comparisons](https://playwright.dev/docs/test-snapshots)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
