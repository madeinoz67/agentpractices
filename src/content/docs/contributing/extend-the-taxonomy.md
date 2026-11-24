---
title: Extend the taxonomy
description: How to add, rename or retire a domain concept without breaking agents that reference it.
sidebar:
  order: 2
---

## Rules

1. **MUST** edit `taxonomy/domains.yaml`; it is the only source of truth. `taxonomy.jsonld` and `taxonomy.json` are generated.
2. **MUST** give each new concept a permanent ID (`D.XXX` or `D.XXX.YYY`), a label and a definition in genus + differentia form ("A Software Engineering practice governing …").
3. **MUST** split siblings on one principle (subject area of practice); a different principle (role, stage, type) is a facet, not a level.
4. **MUST** rename by changing the label only; the ID stays.
5. **MUST** retire by setting `status: deprecated` and `replaced_by`; never delete an ID.
6. **SHOULD** avoid parents with a single child (the check warns); add siblings or flatten.
7. **SHOULD** keep depth to three levels at most.
8. **MUST** bump `version` in `domains.yaml` (minor for additions, major for retirements) and note it in `CHANGELOG.md`.

## Procedure

1. Write the competency question the new concept answers ("which practices govern X?").
2. Check an existing concept does not already cover it (read definitions and scope notes).
3. Add the concept; run `bun run check`.
4. Moving practices after a rename of a label changes their folder: move the files and keep their IDs.
