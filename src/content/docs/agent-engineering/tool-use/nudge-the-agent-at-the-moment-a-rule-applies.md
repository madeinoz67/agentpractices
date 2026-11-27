---
title: Nudge the agent at the moment a rule applies
description: Deliver a rule that applies only in one situation as a hook that injects it at that moment, non-blocking and small, so the always-loaded instruction file stays short and the agent gets the instruction where it can act on it.
id: BP-0108
domain: D.AGT.TOOL
type: guideline
roles: [implementer, orchestrator]
stage: [build, operate]
status: draft
version: 1.0.0
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0021, BP-0020, BP-0074, BP-0084, BP-0017, BP-0015]
superseded_by: null
sources:
  - title: "Claude Code docs — Hooks reference"
    url: https://code.claude.com/docs/en/hooks
    note: The events that add text to the agent's context (`additionalContext`, and plain stdout on `UserPromptSubmit`, `SessionStart` and `PostModelSwitch`), where each reminder lands, the 10,000-character cap per injection, and the replay of saved context on resume; behind rules 3, 7, 8 and 10.
  - title: "Anthropic Engineering — Effective context engineering for AI agents"
    url: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
    note: Context as a finite attention budget, context rot, just-in-time retrieval, and system prompts at the right altitude rather than lists of hardcoded rules; behind the intro and rules 1, 3 and 7.
  - title: "Liu et al. — Lost in the Middle: How Language Models Use Long Contexts (TACL 2023)"
    url: https://arxiv.org/abs/2307.03172
    note: Accuracy is highest when the relevant information sits at the start or end of a long context and falls for information in the middle; behind rule 1.
  - title: "Laban et al. — LLMs Get Lost In Multi-Turn Conversation (arXiv:2505.06120, 2025)"
    url: https://arxiv.org/abs/2505.06120
    note: Accuracy falls across multi-turn exchanges even when the same information is supplied, with a large rise in unreliability; behind rule 1 and the intro.
  - title: "Google SRE Book — Monitoring Distributed Systems"
    url: https://sre.google/sre-book/monitoring-distributed-systems/
    note: 'When pages occur too frequently, employees second-guess, skim, or even ignore incoming alerts; every page should be actionable. Behind rules 5, 10 and 12.'
---
Most rules an agent is given apply to every task, and belong in the always-loaded instruction file. A large minority do not. "Never edit the generated schema; change the source and regenerate" applies only when the agent touches that file. "Use the client helper, not the raw HTTP call" applies only inside one module. Written into `AGENTS.md` or `CLAUDE.md`, each one costs tokens on every turn, sits deep in a context where models read the middle least reliably, and fades across a long session: the agent agrees at step 3 and violates it at step 40.

The alternative is usually a hard block, and often that is the wrong tool too. A block stops the agent. Many of these rules need judgement instead: the agent must pick the other file, call the helper, keep going. What fits is a nudge: a hook that watches for the situation, recognises it, and injects the rule at that moment, as a short, non-blocking piece of context next to the action it governs. The instruction file stays short, the rule arrives when it can be acted on, and nothing stops.

Nudges are cheap to write and easy to write badly. A badly written one fires on every event, echoes file contents into the prompt, blocks the agent when its own script crashes, or repeats the same sentence until the agent skims it. The rules below are the difference between a nudge that steers and one that is noise.

## Rules

### Decide whether a nudge is right

1. **MUST** deliver a rule that applies only in one situation (one tool, path, command or event) as a hook nudge, and not as a line in the always-loaded instruction file.
2. **MUST NOT** use a nudge where the agent must never do the thing: deny it in the permission system, or block it in the hook with a reason ([BP-0021](/agent-engineering/tool-use/use-hooks-for-deterministic-control/), [BP-0020](/agent-engineering/tool-use/author-agent-hooks/)). A nudge is for rules that need judgement to comply.
3. **MUST** gate each nudge on an explicit predicate over the event (a path glob, a command pattern, a branch name) and fire only when it matches. A nudge that fires on nearly every event is an instruction-file line with extra latency.
4. **MUST** keep one copy of the rule: remove its text from the instruction file once the nudge lands, leaving only the hook listed there ([BP-0017](/agent-engineering/instructions-prompting/one-source-of-truth-for-agent-instructions/)).

### Write the nudge

5. **MUST** state the alternative action and its reason, naming the file, command or field: "This file is generated. Edit `src/schema.ts` and run `bun generate` instead.", not "Be careful with generated files."
6. **MUST** build the text from a fixed template and interpolate at most a specific identifier from the event (a path, a command name). Never interpolate file contents, tool output or the raw prompt.
7. **SHOULD** keep each nudge to a few lines. Injected context is capped and truncated (Claude Code keeps 10,000 characters per injection and replaces the rest with a file path the agent is not asked to read), and long reminders get skimmed.

### Deliver it without harm

8. **MUST** deliver the nudge non-blocking: exit `0` with `additionalContext`, or print to stdout on the events that add stdout as context. Never exit non-zero from a nudge; exit code `2` is a block, and it must be reviewed as one.
9. **MUST** make the nudge fail open. On error, timeout or malformed input it prints nothing and exits `0`, so a broken nudge never stops the agent.
10. **SHOULD** fire each nudge at most once per condition per session, then stay quiet. The agent has had the instruction; repeating it only teaches the agent to skim the channel, the same desensitisation that makes people ignore a noisy pager.

### Prove it works

11. **MUST** test each nudge on a task built to tempt the wrong behaviour, and record whether the agent complied. A nudge that prints but is ignored is a defect in the predicate or the wording: fix it, or replace it with a block.
12. **SHOULD** count how often each nudge fires. One that fires on most events belongs in the instruction file; one that never fires is dead and should be removed.

## When to apply

When a rule keeps being broken and a block would be wrong; when the always-loaded instruction file has grown past what every task needs; when moving a rule from a prompt into a hook would cost the agent its judgement; or when reviewing a hook that adds text to the agent's context.

Not for rules that must never break (use a deny rule or a blocking hook, [BP-0021](/agent-engineering/tool-use/use-hooks-for-deterministic-control/)) and not for a procedure that a task needs in full (a skill, [BP-0074](/agent-engineering/skills-reusable-procedures/choose-skills-mcp-clis-or-hooks/)).

## Procedure

1. From the instruction file, list the rules that apply only in one situation. Leave the rest.
2. For each, write the predicate: which event, and what over the event decides that the rule applies.
3. Write the text from a template: the alternative action, named concretely, and its reason.
4. Write the hook so that it prints the text as context, exits `0` on every path, and never echoes untrusted content.
5. Give it a once-per-condition-per-session guard if it can fire repeatedly.
6. Test it with a recorded event payload, then with a task that tempts the violation.
7. Delete the rule's text from the instruction file and list the hook there instead ([BP-0021](/agent-engineering/tool-use/use-hooks-for-deterministic-control/) rule 10).

## Examples

A Claude Code hook that nudges before an edit to a generated file (`.claude/settings.json`):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "bun \"${CLAUDE_PROJECT_DIR}/.claude/hooks/nudge-generated-file.ts\""
          }
        ]
      }
    ]
  }
}
```

The hook itself. The predicate is the path test, the text is a fixed template plus the path, and every path exits `0`:

```ts
// author: Stephen Eaton
// nudge-generated-file.ts — tell the agent, at the moment it edits a generated
// file, where the real source is. Non-blocking and fail-open by design (BP-0108).
const GENERATED = /(^|\/)(dist|gen)\/|\.gen\.(ts|js|go)$/;

const file = (await Bun.stdin.json().catch(() => null))?.tool_input?.file_path ?? "";
if (typeof file === "string" && GENERATED.test(file)) {
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext:
        `${file} is generated. Edit its source and run the generator instead; ` +
        `changes made here are overwritten on the next build.`,
    },
  }));
}
process.exit(0);
```

A `UserPromptSubmit` hook can nudge on the prompt itself, where plain stdout already becomes context:

```ts
// Print nothing at all on the ordinary path: an empty hook adds no context.
if (promptMentionsMigration()) {
  console.log("This repo ships database migrations. Add one with `bun run migrate:new`; never edit an applied migration.");
}
```

Nudges worth writing, and the block that should replace them:

| Situation | Nudge text | If it must never happen |
| --- | --- | --- |
| Edit to a vendored path | "`vendor/` is upstream code. Put the change in `patch/` and run `make vendor`." | Deny `Edit` on `vendor/**` |
| Raw HTTP call inside one module | "Use `client.request()` from `src/api/client.ts`; it applies retries and auth." | Nothing: this is judgement |
| Push to a protected branch | "`main` takes pull requests. Push to a branch and open one." | Branch protection ruleset ([BP-0078](/software-engineering/version-control-review/agents-never-push-to-main/)) |

## Anti-patterns

- **The wall of text.** A `PostToolUse` hook on every tool call that prints the project's conventions. It costs context on every step and the agent stops reading it by turn five.
- **The echo.** Interpolating the edited file's contents, or the command's output, into the nudge. It floods the context and lets untrusted text reach the prompt as if the hook had said it.
- **The accidental block.** A nudge script that throws on a missing field, exits `1`, or sets `"onFailure": "block"`. A reminder must never be able to stop the work.
- **The nag.** The same nudge on every matching edit. After the first, it is a tax.
- **The vague nudge.** "Follow the project conventions" at the moment conventions matter. It gives the agent nothing it did not already have.
- **The untested nudge.** Shipping because the string appeared in a transcript. Whether the agent changed what it did is the only evidence that counts.
- **The duplicate.** The rule kept in `AGENTS.md` and also nudged, so a later edit to one leaves the other wrong.

## Checklist

- [ ] Every contextual rule lives in a nudge, not the instruction file
- [ ] Nothing that must never happen is a nudge; those are deny rules or blocking hooks
- [ ] Each nudge has an explicit predicate and fires only when it matches
- [ ] The rule's text was removed from the instruction file, which now lists the hook
- [ ] Each nudge names the alternative action and why, concretely
- [ ] The text is a fixed template with at most one identifier interpolated
- [ ] Every path exits `0` with `additionalContext`; nothing blocks or throws
- [ ] A failing, timing-out or malformed-input run prints nothing and exits `0`
- [ ] A probe task showed the agent complying, and the result is recorded

## References

- [Claude Code docs — Hooks reference](https://code.claude.com/docs/en/hooks): the events, `additionalContext`, where each reminder lands, the injection cap and what happens on resume.
- [Anthropic Engineering — Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents): why context is a budget and why rules belong at the right altitude.
- [Liu et al., Lost in the Middle (TACL 2023)](https://arxiv.org/abs/2307.03172): position in a long context changes whether the model uses the information.
- [Laban et al., LLMs Get Lost In Multi-Turn Conversation (2025)](https://arxiv.org/abs/2505.06120): instruction-following degrades as turns accumulate.
- [Google SRE Book — Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/): alerts that fire too often get skimmed or ignored, and every alert should be actionable.
- Related practices: [BP-0021](/agent-engineering/tool-use/use-hooks-for-deterministic-control/), [BP-0020](/agent-engineering/tool-use/author-agent-hooks/), [BP-0074](/agent-engineering/skills-reusable-procedures/choose-skills-mcp-clis-or-hooks/), [BP-0084](/operations/evaluation/detect-agents-drifting-from-practice/).
