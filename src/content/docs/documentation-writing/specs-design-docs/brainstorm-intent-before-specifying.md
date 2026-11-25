---
title: Brainstorm to find intent before writing a spec
description: When a request leaves something important open, the agent asks one open question at a time about why and what success looks like, reads what already exists first, plays its understanding back, lays out two or three approaches with trade-offs and a recommendation, and builds nothing until the person approves a written design.
id: BP-0057
domain: D.DOC.SPC
type: procedure
roles: [planner, orchestrator]
stage: [plan]
status: draft
version: 1.0.0
updated: 2026-11-24
reviewed: 2026-11-24
review_by: 2027-05-24
related: [BP-0058, BP-0048, BP-0008, BP-0002, BP-0056]
sources:
  - { title: obra/superpowers — brainstorming skill, url: https://github.com/obra/superpowers/blob/main/skills/brainstorming/SKILL.md }
  - { title: GitHub Spec Kit — spec-driven development, url: https://github.com/github/spec-kit }
---

Agents build what they believe the person wants, and that belief is usually thinner than it feels. A short, structured conversation before any spec or code surfaces the *why*, which is what lets the agent make the hundred small decisions nobody wrote down the way the person would have.

## Rules

### Decide whether to brainstorm

1. **MUST** first check what is actually known. If the request already says everything that matters, do the task and say what was assumed. If something that would change what gets built is missing, start the conversation.
2. **MUST** let the person skip it: offer to "just start" with stated assumptions instead.
3. **SHOULD** size the work and say so: quick task (just do it), small change (short written design), project (full design, then a plan). Split several independent projects and take them one at a time.

### Look, then ask

4. **MUST** read what already exists before asking: the code, the documents and decisions the person pointed at, earlier conversation. Never ask what the project already answers, and never reopen what is already decided.
5. **MUST** ask one question per message, open rather than multiple-choice, in the person's own words, and say what the answer would change. Offer a short menu only when the person is stuck; if they say "you decide", propose something concrete.
6. **MUST** cover the ground over the conversation, not as a questionnaire: why now, what success looks like, goals, non-goals and anti-goals (what would make it a failure even if it works), constraints, prior art, current state, and the details the person cares about.
7. **SHOULD** build each question on the last answer or on something found, so it helps the person think through a consequence or a case they may have missed.
8. **MUST** state defaults out loud: a default the person never heard is one they could not reject.

### Play back and choose

9. **MUST** play understanding back in short chunks as soon as one part is clear: what the person said, clearly separated from what the agent filled in, and ask what is wrong or missing.
10. **MUST** lay out two or three real approaches before writing the design, each with what it trades off, a recommendation and the reason, and let the person choose. If there is truly only one sensible way, say so and why the others do not fit.
11. **SHOULD** show rather than tell for anything visual: a mockup, a sketch or a throwaway prototype. Label spikes as throwaway; keeping one is a new decision ([BP-0056](/software-engineering/ui-design-systems/use-style-guides-and-mockups-for-repeated-ui/)).

### Write it down and gate

12. **MUST** write a design (or PRD, [BP-0058](/documentation-writing/specs-design-docs/write-prds-agents-can-build-from/)) a capable builder could plan from without going back to the person: intent and why, goals, non-goals, anti-goals, constraints, the chosen approach and the rejected ones, and what is left to the builder.
13. **SHOULD** for a project, have a fresh agent read the design as the builder would and list its questions; answer what is already settled, decide the minor ones (marked as the agent's call), and take only the real open questions back to the person, together.
14. **MUST NOT** build anything (product code, scaffolding, dependencies) until the person approves the written design. "Sounds good" to an idea is not approval of a document they have not seen.

## When to apply

New features, new tools, redesigns, and any request where a wrong guess about intent would be expensive to undo.

## Examples

Good first message for "build a website for my bakery":

> "If it's mostly for people deciding whether to stop by, I'd lead with hours and what's in the case today; taking orders online is a different site. What do you want someone to do when they land on it? Or if you'd rather I just start, say so."

Playback chunk:

> "So far: the site is for walk-in customers on their phones (yours), opening hours and today's cakes are the main things (yours), I'm assuming no online ordering for now (my call — wrong?)."

## Anti-patterns

- A ten-question form in the first message.
- Multiple-choice options before the person has described what they want.
- Silent defaults: picking a framework or audience without saying so.
- Starting to scaffold after "sounds good" to a one-line idea.
- Asking what the repository or the attached spec already answers.

## Checklist

- [ ] Checked what is known; offered to skip
- [ ] Read existing material before asking
- [ ] One open question at a time; defaults stated
- [ ] Understanding played back; approaches compared with a recommendation
- [ ] Written design or PRD; builder check for projects
- [ ] Nothing built before approval

## References

- [obra/superpowers — brainstorming skill](https://github.com/obra/superpowers/blob/main/skills/brainstorming/SKILL.md)
- [GitHub Spec Kit](https://github.com/github/spec-kit)
