---
title: Author agent skills that load at the right time and do one job well
description: Write each skill as one focused capability with a precise description, a short SKILL.md, detail in references, deterministic work in scripts, and tests against real tasks.
id: BP-0018
domain: D.AGT.SKL
type: guideline
roles: [implementer, any]
stage: [plan, build, verify]
status: draft
version: 1.0.1
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0019, BP-0016, BP-0007, BP-0006]
sources:
  - title: Agent Skills specification
    url: https://agentskills.io/specification
    note: Normative directory and frontmatter contract behind the name pattern, the description length cap and the skills-ref validator
  - title: "Claude Code docs — Skills"
    url: https://code.claude.com/docs/en/skills
    note: How Claude Code loads skills by description and the disable-model-invocation flag that keeps deploy and delete skills user-invoked
  - title: "Claude Platform docs — Skill authoring best practices"
    url: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
    note: Progressive disclosure discipline, the under-500-line SKILL.md limit and testing skills on real tasks before relying on them
---
## Rules

1. **MUST** give each skill one capability. If its description needs "and" to join unrelated jobs, split it.
2. **MUST** write a `description` that says what the skill does **and when to use it**, with the words a user or task would actually contain. The description is the only part the agent sees until the skill loads, so it decides whether the skill is ever used. Put the main use case first.
3. **MUST** follow the [Agent Skills format](https://agentskills.io/specification): a directory with `SKILL.md`, YAML frontmatter on the first line, `name` of 1–64 lowercase letters, digits and single hyphens matching the directory name, and a `description` of at most 1,024 characters.
4. **MUST** keep `SKILL.md` to the steps the agent follows (under 500 lines), and move detailed reference material to `references/`, linked one level deep from `SKILL.md` with a line saying when to read each file.
5. **MUST** put deterministic or repeated work (parsing, validation, conversion, API calls) in `scripts/` and have `SKILL.md` run them, rather than asking the agent to re-derive the logic each time. Scripts must document their dependencies and fail with clear messages.
6. **MUST NOT** put secrets, tokens or personal data in a skill, its scripts or its assets. Read credentials from the environment or a secret store at run time.
7. **MUST** write instructions the agent can check: exact commands, file paths, output formats and a done-criterion. Avoid "handle errors appropriately" and similar.
8. **MUST** test a skill on real tasks before relying on it: that it triggers when it should, does not trigger when it should not, and produces the expected output ([BP-0006](/operations/evaluation/evaluate-agent-output/)).
9. **SHOULD** include input and output examples and the edge cases that went wrong before.
10. **SHOULD** declare side effects. A skill that deploys, sends, deletes or spends should be invocable only by a person (in Claude Code, `disable-model-invocation: true`).
11. **SHOULD** version the skill (for example `metadata.version`) and keep a short change log; cite practices by `BP-ID@version` rather than copying them.
12. **SHOULD** validate the skill's format with a validator (for example `skills-ref validate ./my-skill`) in CI.
13. **MAY** add `compatibility` when the skill needs specific tools, packages or network access.

## When to apply

Write a skill when you keep pasting the same instructions, when a procedure is too long or too occasional for `AGENTS.md`/`CLAUDE.md` ([BP-0016](/agent-engineering/instructions-prompting/write-a-claude-md/)), or when a team needs the same workflow done the same way. Do not write a skill for a fact every session needs (put it in the instruction file) or for a rule that must always hold (use a hook or permission rule).

## Procedure

1. Do the task by hand with an agent two or three times; note what you had to explain each time.
2. Write the description first, then the steps; move anything the steps do not always need into `references/`.
3. Turn repeated logic into scripts with tests.
4. Write a few trigger tests (prompts that should and should not load it) and output checks.
5. Validate, version, and publish to the right scope (personal, project, plugin or organisation).

## Examples

```text
records-manager/
├── SKILL.md              # when to use, steps, links
├── references/
│   ├── taxonomy.md       # read when choosing a tag
│   └── retention.md      # read before any delete
├── scripts/
│   └── validate_tags.ts  # run before upload
└── assets/
    └── tag-template.json
```

```yaml
---
name: records-manager
description: File, tag and retain documents in Paperless-ngx using the RecordsManager taxonomy. Use when uploading, tagging, searching, or deleting records, or when asked about retention.
metadata:
  version: "1.3.0"
---
```

Poor description: `description: Helps with documents.` It never says when to use it, so it either never triggers or triggers on everything.

## Anti-patterns

- One "do everything" skill with a 1,500-line `SKILL.md`.
- Descriptions written as marketing ("powerful document assistant").
- Logic described in prose that should be a script.
- Skills that silently deploy or delete when the model decides they are relevant.
- Copying the same practice text into many skills instead of citing it.

## Checklist

- [ ] One capability; description says what and when, key use case first
- [ ] Valid name and frontmatter; validator passes
- [ ] `SKILL.md` under 500 lines; references one level deep with "read when…"
- [ ] Deterministic work in tested scripts
- [ ] No secrets; side-effect skills user-invoked only
- [ ] Trigger and output tests pass; version recorded

