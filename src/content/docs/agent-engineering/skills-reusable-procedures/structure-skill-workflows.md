---
title: Structure multi-step workflows inside skills
description: Route a skill to one workflow per task type, write each workflow as numbered steps with a copyable checklist, put validate-fix-repeat loops and plan-validate-execute gates around risky steps, and match how prescriptive each step is to how fragile it is.
id: BP-0030
domain: D.AGT.SKL
type: pattern
roles: [implementer, any]
stage: [plan, build, verify]
status: draft
version: 1.0.1
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0018, BP-0019, BP-0002, BP-0008]
sources:
  - title: "Claude Platform docs — Skill authoring best practices (workflows and feedback loops)"
    url: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
    note: The validate-fix-repeat loop and plan-validate-execute gate patterns for steps whose output can be checked
  - title: Agent Skills specification
    url: https://agentskills.io/specification
    note: The one-level-deep reference rule that limits how deeply workflow files may chain, forcing a flat router
---
## Rules

### Routing

1. **MUST** make `SKILL.md` a router when a skill handles more than one kind of task: a short decision list ("Uploading a document? → `workflows/upload.md`. Deleting? → `workflows/delete.md`") and nothing the router itself does not need.
2. **MUST** give each workflow its own file when workflows are long or branch, kept **one level deep** from `SKILL.md` (for example `workflows/*.md`, `references/*.md`). Deeply chained references are often only partly read.
3. **MUST** state, in each branch of the router, exactly which file to read and when, so the agent loads one workflow, not all of them.

### Writing a workflow

4. **MUST** write each workflow as numbered, sequential steps, each with its action, its input, its output, and how to tell it succeeded.
5. **MUST** start long workflows with a checklist the agent copies into its working notes or task list and ticks off, so it does not skip steps — especially validation steps.
6. **MUST** match how prescriptive each step is to how fragile it is:

   | Step is | Write it as |
   | --- | --- |
   | Judgement with several valid approaches (review, summarise) | Plain guidance and criteria |
   | A preferred pattern with some variation | Template, pseudocode or a parameterised script |
   | Fragile, order-dependent or destructive (migrate, delete, file a record) | An exact command to run unchanged: "Run `bun scripts/migrate.ts --verify --backup`. Do not change the command." |

7. **MUST** say whether a script is to be **run** (the usual case; only its output enters context) or **read** as a reference for its logic.

### Feedback loops and gates

8. **MUST** add a validate → fix → repeat loop after any step whose output can be checked (a validator script, schema, test, or a checklist file), and proceed only when validation passes.
9. **MUST** use plan → validate → execute → verify for batch, destructive or high-stakes steps: the agent writes the intended changes to a plan file (for example `changes.json`), a script validates it, a person approves it where the action cannot be undone, then the agent executes and verifies.
10. **MUST** make validation errors specific and actionable ("Tag `Finance/Tax/2025` not in taxonomy; nearest: `Finance/Tax/FY2025`"), so the fix step has something to act on.
11. **SHOULD** write intermediate results to files (plans, mappings, extracted fields) so they can be checked, diffed and re-run without repeating earlier steps.
12. **SHOULD** end every workflow with a verification step against the original request and a short report: what was done, what was checked, what was skipped ([BP-0002](/agent-engineering/workflow/plan-execute-verify/)).

### Maintaining

13. **SHOULD** add a table of contents to any workflow or reference file over about 100 lines.
14. **SHOULD** test each workflow on real tasks, including a run where validation fails, and record changes to workflows in the skill's change log ([BP-0018](/agent-engineering/skills-reusable-procedures/author-agent-skills/)).

## When to apply

Any skill whose job takes more than a few steps, has more than one task type, or includes steps that change or delete things.

## Examples

```text
records-manager/
├── SKILL.md                 # router: which workflow for which task
├── workflows/
│   ├── upload.md            # checklist + steps + validate loop
│   ├── retag.md
│   └── delete.md            # plan → validate → approve → execute → verify
├── references/
│   └── taxonomy.md          # read when choosing tags
└── scripts/
    ├── validate_tags.ts     # run; prints specific errors
    └── plan_delete.ts       # run; writes delete-plan.json
```

`SKILL.md` router:

```markdown
## Choose the workflow
- Uploading or filing a document → read `workflows/upload.md`
- Changing tags on existing documents → read `workflows/retag.md`
- Deleting or applying retention → read `workflows/delete.md` (never delete without its approval step)
```

`workflows/delete.md` (excerpt):

```markdown
Copy this checklist and tick it off:
- [ ] 1. Find candidates: run `bun scripts/plan_delete.ts --query "<q>"` → writes `delete-plan.json`
- [ ] 2. Validate: run `bun scripts/validate_plan.ts delete-plan.json`; fix and repeat until it passes
- [ ] 3. Show the plan to the user; stop until they approve
- [ ] 4. Execute: run `bun scripts/apply_plan.ts delete-plan.json` (do not change the command)
- [ ] 5. Verify: run `bun scripts/verify_plan.ts delete-plan.json`; report what was deleted
```

## Anti-patterns

- One `SKILL.md` holding every workflow, loaded in full for every task.
- "Validate the output" with no validator, criteria or stop condition.
- Destructive steps the agent may improvise ("delete the old records").
- Workflows that chain references three files deep.
- Validators that only say "invalid".

## Checklist

- [ ] `SKILL.md` routes to one workflow per task type, one level deep
- [ ] Numbered steps with outputs and success checks; copyable checklist
- [ ] Prescriptiveness matched to fragility; run-vs-read stated for scripts
- [ ] Validate-fix-repeat after checkable steps; plan-validate-execute for risky ones
- [ ] Specific validation errors; intermediate results in files
- [ ] Final verification and report; workflows tested including failures

