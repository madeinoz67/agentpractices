---
title: Decompose tasks into independently verifiable units
description: Break work into the smallest units that each carry their own done-check, ordered by dependency, with explicit interfaces between them — no smaller, no larger.
id: BP-0008
domain: D.AGT.WF
type: guideline
roles: [planner, orchestrator]
stage: [plan]
status: draft
version: 1.0.0
updated: 2026-11-24
reviewed: 2026-11-24
review_by: 2027-05-24
related: [BP-0002, BP-0003, BP-0006]
sources:
  - { title: Anthropic — Building effective agents, url: https://www.anthropic.com/research/building-effective-agents }
  - { title: Anthropic — How we built our multi-agent research system, url: https://www.anthropic.com/engineering/multi-agent-research-system }
---

## Rules

1. **MUST** give every unit a checkable done-criterion (a test, a command and its expected output, a file that must exist with stated content). A unit without one is not a unit; merge it into the unit whose check covers it.
2. **MUST** size a unit as the smallest piece that carries its own check and that a reviewer could accept or reject on its own. Fold setup, configuration and documentation into the unit that needs them.
3. **MUST** state each unit's inputs and outputs (files, function signatures, data shapes) so a unit can be done without reading its neighbours' work.
4. **MUST** order units by dependency, and record which units consume another unit's outputs.
5. **MUST** trace every unit back to a requirement in the request; a unit that traces to nothing is scope creep and is dropped.
6. **MUST NOT** split one decision across units (for example, half a data model in each of two units). Decisions that change together stay together.
7. **SHOULD** slice vertically: each unit delivers a thin end-to-end result rather than one layer (all models, then all APIs, then all UI).
8. **SHOULD** front-load the riskiest or most uncertain unit, so a wrong assumption is found before work is built on it.
9. **SHOULD** mark units with no shared state or ordering as parallelisable; run them in parallel only if their outputs do not touch the same files or resources.
10. **SHOULD** re-decompose when a unit fails twice or grows past its brief, instead of pushing through.
11. **MAY** skip formal decomposition when the whole task is one unit by rule 2.

## When to apply

Before building anything with more than a couple of steps: features, migrations, research questions, documents with several sections, and any work an orchestrator will hand to other agents. It is also the step that produces the task list in [plan, execute, verify](/agent-engineering/workflow/plan-execute-verify/).

Not needed for a single-step change whose check is obvious (a typo fix, a one-line config change).

## Procedure

1. **Restate the outcome** and list the requirements it must meet.
2. **List the decisions** the work needs (names, interfaces, data shapes, file locations). These are fixed in the plan, not left to each unit.
3. **Draft units**, each one: name, requirement(s) it serves, inputs, outputs, done-check.
4. **Test each unit against rules 1–6.** Merge units with no check; split units whose check needs several unrelated things to pass.
5. **Order by dependency**, mark parallel groups, and move the riskiest unit as early as its dependencies allow.
6. **Check coverage:** every requirement maps to at least one unit; every unit maps to a requirement.
7. **Hand off** each unit with a brief ([handoff contracts](/multi-agent-systems/coordination-handoff/handoff-contracts/)) when another agent will do it.

Unit template:

```yaml
- id: U3
  name: Emit catalog.json
  serves: [R2 agents can filter practices]
  consumes: [U2 loadPractices(dir) -> Practice[]]
  produces: [buildCatalog(ps, t, opts) -> Catalog, dist/catalog.json]
  done_when: ["bun test tests/emit.test.ts passes", "dist/catalog.json has count == number of practices"]
  parallel_with: []
```

## Examples

Request: "Add `--json` output to the `parts` CLI."

Good decomposition:

| Unit | Done when |
| --- | --- |
| U1 Define the JSON schema for `list` and `show` | Schema file exists; a fixture validates against it |
| U2 `parts list --json` | Test: output parses and validates against U1 schema |
| U3 `parts show --json` (parallel with U2) | Same, for `show` |
| U4 Exit codes and `--help` text | Test: bad input exits 2; `--help` lists `--json` |

Bad decomposition:

| Unit | Problem |
| --- | --- |
| "Research JSON libraries" | No done-check; serves no requirement directly |
| "Write all the code" | Too large: cannot be accepted or rejected in parts |
| "Write tests" | Split from the code it tests; neither half is checkable alone |
| "Update README" | Should be folded into the unit whose behaviour it documents |

## Anti-patterns

- **Layer cake:** all schemas, then all handlers, then all tests. Nothing works end to end until the last unit.
- **Confetti:** dozens of trivial units, each with more handoff cost than work.
- **Monolith with a checklist:** one unit with ten sub-bullets and a single "it works" check at the end.
- **Hidden coupling:** two "independent" units that both edit the same file or rely on an undecided name.
- **Research units with no output:** "investigate X" with no stated deliverable or decision to make.

## Checklist

- [ ] Every unit has a checkable done-criterion
- [ ] Every unit traces to a requirement, and every requirement has a unit
- [ ] Inputs and outputs stated; shared names and interfaces decided up front
- [ ] Dependency order and parallel groups marked
- [ ] Riskiest unit scheduled early

## References

- [Anthropic — Building effective agents](https://www.anthropic.com/research/building-effective-agents) (orchestrator-workers pattern)
- [Anthropic — How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) (delegation briefs and task sizing)
