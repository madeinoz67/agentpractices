---
title: Add a practice
description: How a person or agent adds a new practice — file location, frontmatter, sections, validation.
sidebar:
  order: 1
---

## Rules

1. **MUST** open a [Propose a practice](https://github.com/madeinoz67/agentpractices/issues/new?template=propose-practice.yml) issue before writing a new practice, and wait for the owner to accept it.
2. **MUST** use the `BP-NNNN` ID the owner assigns on the accepted issue. Never pick your own; IDs are never reused.
3. **MUST** file the practice under the folder of its domain: `src/content/docs/<domain path>/<slug>.md`, where the domain path is the taxonomy labels slugified (for example `D.SWE.CLI` → `software-engineering/cli-design/`).
4. **MUST** include all required frontmatter (see the [template](../practice-template/)).
5. **MUST** start the body with `## Rules` and use the standard section order.
6. **MUST** pass `bun run verify` before opening a pull request, and link the issue in the pull request (`Closes #N`).
7. **SHOULD** start new practices as `status: draft`; the owner promotes them to `adopted`.
8. **MUST** bump `version` on any change to a practice's content — minor for added or relaxed rules, major for changed or removed rules, patch for wording, links and sources. Changing only `updated`, `reviewed` or `review_by` needs no bump. `bun run verify` compares each practice with the published catalog and fails if its content changed without a bump.
9. **MUST NOT** delete a practice; set `status: deprecated` and `superseded_by`.
10. **MUST** set `reviewed` (the date the page was last checked against its sources and current practice) and `review_by` (when it must be checked again, at most 12 months later; 3 months for fast-moving topics such as model choice, pricing and protocol specs). Any change to a page counts as a review, so `reviewed` must be on or after `updated`. `bun run check` warns when a review is overdue.
11. **MAY** send typo, link and wording fixes that do not change a rule's meaning straight to a pull request, without an issue.

## Which route

| You want to | Do this |
| --- | --- |
| Add a new practice | [Propose a practice](https://github.com/madeinoz67/agentpractices/issues/new?template=propose-practice.yml) issue → owner accepts and assigns ID → pull request |
| Add, rename or retire a domain | [Propose a taxonomy change](https://github.com/madeinoz67/agentpractices/issues/new?template=propose-taxonomy-change.yml) issue → [extend the taxonomy](../extend-the-taxonomy/) |
| Report a rule that is wrong, unclear or out of date | [Report a problem](../report-a-problem/) |
| Fix a typo or broken link | Pull request directly |

## Procedure

1. Search existing practices ([`catalog.json`](/catalog.json)) and open issues for duplicates.
2. Open a [Propose a practice](https://github.com/madeinoz67/agentpractices/issues/new?template=propose-practice.yml) issue. Pick the domain from the dropdown; if none fits, choose "None fits" and open a taxonomy change as well.
3. When the owner accepts it, they label it `accepted` and comment the assigned `BP-NNNN`.
4. Copy the template into the domain folder, set the assigned ID, and write the Rules first, then the supporting sections.
5. Run `bun run verify`; fix every error.
6. Add a line to `CHANGELOG.md` and open a pull request with `Closes #N`.

## For agents

Agents may file proposals and problem reports through the same issue forms (for example with `gh issue create --template propose-practice.yml`). Fill every required field, cite sources, and do not start writing the practice until the issue is accepted and has an ID.
