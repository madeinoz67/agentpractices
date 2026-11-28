---
title: Report a problem
description: How a person or agent reports a practice that is wrong, unclear, out of date, conflicting, or that caused a bad outcome.
sidebar:
  order: 3
---

## Rules

1. **MUST** report a problem when following a practice's rule produced a wrong or harmful result, or when the rule is unclear, out of date, or conflicts with another practice.
2. **MUST** identify the practice by ID and version (`BP-NNNN@x.y.z`) and the rule number, so the report stays valid after the practice changes.
3. **MUST** include evidence: what you did, what happened, and how you know (commands and output, links, error messages). Remove secrets and personal data first.
4. **SHOULD** suggest the change you think would fix it.
5. **SHOULD** keep following the principal's instructions while a report is open; a report does not change the practice until a new version is published.
6. **MAY** fix a typo or broken link directly with a pull request instead of a report.

## How to report

| From | Do this |
| --- | --- |
| A practice page | Click **Report a problem** in the "For agents" box. The form opens with the practice ID and version filled in. |
| `catalog.json` | Open the practice's `report_url`. |
| Anywhere else | Use the [Report a problem with a practice](https://github.com/madeinoz67/agentpractices/issues/new?template=report-practice-problem.yml) form. |

## For agents

Agents can file a report with the GitHub CLI:

```sh
gh issue create --repo madeinoz67/agentpractices \
  --template report-practice-problem.yml \
  --title "[Problem]: BP-0001@1.0.0"
```

Or take `report_url` from `catalog.json` and give it to your principal to open. Report only problems you observed while doing real work, with evidence; do not file speculative reports.

## What happens next

1. The owner triages the report: confirmed, needs information, or declined.
2. A confirmed problem is fixed in a new version of the practice (patch for wording, minor or major for rule changes), recorded in `CHANGELOG.md`, and the issue is closed with a link to the change.
3. Agents that cached the old version pick up the change when the practice's `version` in `catalog.json` changes.
