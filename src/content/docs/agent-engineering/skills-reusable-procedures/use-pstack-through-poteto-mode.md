---
title: Use pstack through poteto-mode
description: Run engineering work through pstack's poteto-mode orchestrator, its named playbooks and specialists, with every principle read before it is applied.
id: BP-0100
domain: D.AGT.SKL
type: guideline
roles: [orchestrator, planner, implementer, reviewer]
stage: [plan, build, verify]
status: draft
version: 1.0.0
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0019, BP-0030, BP-0049, BP-0044]
superseded_by: null
sources:
  - title: "pstack — README"
    url: https://github.com/cursor/plugins/blob/main/pstack/README.md
    note: The shape of the suite (55 skills, 22 playbooks), how work enters through /poteto-mode, and the Claude Code adapter that renames commands and skips Cursor-only steps
  - title: "pstack — poteto-mode/SKILL.md"
    url: https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/SKILL.md
    note: The non-negotiables and routing triggers behind rules 3, 4, 9 and 10, and the read-then-cite requirement behind rules 6 and 7
  - title: "pstack — poteto-mode/worker.md"
    url: https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-mode/worker.md
    note: The kickoff line every worker must see, and the four acts that are the only reason a worker stops, behind rules 5 and 12
  - title: "pstack — setup-pstack/SKILL.md"
    url: https://github.com/cursor/plugins/blob/main/pstack/skills/setup-pstack/SKILL.md
    note: The three budget labels, the per-role model mapping, and the rule that no model slug is written unless this session proved it is available
  - title: "pstack — poteto-help/SKILL.md"
    url: https://github.com/cursor/plugins/blob/main/pstack/skills/poteto-help/SKILL.md
    note: That a file you route to outranks the index that points at it, which is the basis of rule 6
  - title: "pstack — architect/SKILL.md"
    url: https://github.com/cursor/plugins/blob/main/pstack/skills/architect/SKILL.md
    note: The specialist trigger for design across a function boundary, and the hand-off to arena when the design is large or contested
---

pstack ships 55 skills in one plugin: one orchestrator, `poteto-mode`, that selects from 22 playbooks, 25 single-principle leaves, and specialists such as `architect`, `swarm`, `arena` and `interrogate`. Used as a list of prompts, most of it never runs. An agent calls `tdd` or `architect` because the description matched, never selects `/poteto-mode`, so no playbook is picked and the routing triggers never fire. It quotes a principle from the index line in `poteto-mode/SKILL.md` and never opens `principle-foundational-thinking`. It briefs a worker without `worker.md` and gets back a pull request against a bar nobody set.

These rules make the suite run as the system it is. Work enters through the orchestrator, so the playbook is chosen before code is touched. Each step goes to the specialist reserved for it. A principle is read before it is applied and named in the report together with the choice it changed. The point is not more process: it is that every citation in a report is one a reader can open, and the principal is asked only what a run cannot settle.

## Rules

### Set up

1. **MUST** run `/setup-pstack` (Claude Code: `/pstack:setup-pstack`) before the first task, choosing one of its three budgets — `large — xhigh reasoning`, `medium — high reasoning`, `small — medium reasoning` — and a model for each role, so pstack runs on your choices and not on the skill defaults.
2. **MUST NOT** write a model slug into pstack's rules file (`~/.cursor/rules/pstack-models.mdc` in Cursor, `~/.claude/rules/pstack-models.md` in Claude Code) that you have not confirmed is available to subagents in this session; `inherit-parent` and `auto` are always valid.

### Enter and route

3. **MUST** select `/poteto-mode` from the `/` menu before typing the task, so the harness attaches the skill to the message, and let it pick the playbook for the task type from its 22; do not call the leaf skills one at a time off their descriptions.
4. **SHOULD** route each step to the skill pstack reserves for it: name the data shape before writing code; design across a function boundary to `architect`; fan-out to `swarm`; a bake-off between candidates to `arena`; a contested design to `interrogate`.
5. **MUST** open every subagent kickoff with `Read <path>/worker.md before anything else.` (where `<path>` is the folder holding `poteto-mode/worker.md`), then the goal and the task; the operator's rules reach a worker no other way.

### Grounding and attribution

6. **MUST** read a pstack file in full before you quote or apply it — the `principle-*` leaf behind a principle, the playbook behind a step — and trust that file when it disagrees with the index that points to it.
7. **MUST** name in your reply each principle that shaped a decision and the specific choice it changed, and cite only principles whose `SKILL.md` you read this session.
8. **MUST** run `benchmark-checklist` before you measure a number, and before you trust, report or act on one you measured.

### Working discipline

9. **MUST** settle a fork the work could answer by running it with the `prototype` playbook and showing the result, instead of asking the human to choose.
10. **MUST** run `unslop` on prose, your replies included, and `technical-writing` on docs, PR descriptions and commit messages.
11. **MUST** clear pstack's gates at the two checkpoints: `/deslop` before commit, `no-comments` before review.
12. **MUST NOT** call a tool that shows a person a question from inside a pstack worker run; make any choice you can undo and say what you chose and why, and stop only for a deploy, deleted data, a force-push to a shared branch, or a message to someone outside the run.
13. **SHOULD** skip a step that needs a Cursor-only feature (bugbot, automations) with a one-line note naming the missing capability, instead of improvising an untested substitute for it.

## When to apply

On engineering work where a defect survives: a feature, a bug fix, a performance change, a refactor, a design call, work you land as a pull request, and the prose that ships with it (documentation, PR bodies, commit messages). Use it when you are about to measure a number, and when you would otherwise ask the principal to pick between two approaches a run could settle.

Do not use it for a lookup, a one-line answer, or work the principal has already reduced to a single command. A pstack run spends real tokens.

On Cursor the plugin runs natively. On Claude Code the adapter maps the names and prefixes commands with `/pstack:`, and a step that needs a Cursor-only feature is skipped rather than substituted.

## Procedure

1. Run `/setup-pstack` once. Pick a budget from the three it offers and map a model to each role. Check the slugs it plans to write against what this session can actually pass to a subagent.
2. Select `/poteto-mode` from the `/` menu before you type the task. State the goal and the smallest change that meets it.
3. Read the playbook the orchestrator picked and follow its steps. If no playbook fits, say so and use `/poteto-help`.
4. Hand a step to its reserved skill when the trigger fires: `architect`, `swarm`, `arena`, `interrogate`.
5. Open a `principle-*` leaf and read it in full before you apply it. Do not work from the index line.
6. Before you dispatch a worker, write the `worker.md` line as the first line of its kickoff, then the goal and the task.
7. Before you report a number, run `benchmark-checklist`.
8. Settle a fork a run could answer with the `prototype` playbook instead of asking.
9. Before commit run `/deslop`. Before review run `no-comments`.
10. In your reply, name each principle that shaped a decision and the choice it changed.

## Examples

Good: asked to fix a scroll position that drifts every 750 ms while idle, the agent selects `/poteto-mode` and is routed to `playbooks/bug-fix.md`. It reproduces the defect first. Before changing code it opens `principle-fix-root-causes` in full and moves the fix from an idle-timer guard to the accumulator that was losing ticks. It dispatches two workers, each kickoff starting `Read /Users/dev/.claude/plugins/pstack/skills/poteto-mode/worker.md before anything else.` with the bar stated. Before it writes "1.1 ms, down from 3.2 ms" it runs `benchmark-checklist`. The reply closes: "Fix Root Causes moved the fix from the idle guard to the drift accumulator. Sequence Verifiable Units split the change into two commits, each with its own check."

Bad: the agent greps the skill list, calls `tdd` and `architect` straight off their descriptions, patches the guard because that is where the symptom shows, and closes with "Applied Foundational Thinking and Prove It Works". It opened neither leaf. It measured nothing. The citation is decoration.

## Anti-patterns

- Picking a leaf skill because its description matched, instead of letting `/poteto-mode` choose the playbook.
- Citing a principle from the index line in `poteto-mode/SKILL.md` without opening its leaf.
- Briefing a worker without the `worker.md` line, then judging its output against a bar it never received.
- Asking the principal to choose between two approaches a `prototype` run would settle in a minute.
- Reporting a speedup or a regression before `benchmark-checklist` says what it measured.
- Improvising a substitute for a Cursor-only step (bugbot, automations) instead of noting the gap and moving on.
- Writing a model slug into the pstack rules file that no subagent this session can actually reach.

## Checklist

- [ ] Ran `/setup-pstack` and chose a budget and a model per role
- [ ] Wrote only model slugs confirmed available this session into the rules file
- [ ] Selected `/poteto-mode` before typing the task and followed the playbook it picked
- [ ] Opened every subagent kickoff with `Read <path>/worker.md before anything else.`
- [ ] Read each principle's leaf in full before applying it
- [ ] Named each principle that shaped a decision and the choice it changed
- [ ] Ran `benchmark-checklist` before trusting or reporting a number
- [ ] Settled a runnable fork with `prototype` instead of asking
- [ ] Ran `unslop` on prose and `technical-writing` on docs, PR bodies, commit messages
- [ ] Cleared `/deslop` before commit and `no-comments` before review
- [ ] Asked no question from inside a worker run; stopped only for the four listed acts
