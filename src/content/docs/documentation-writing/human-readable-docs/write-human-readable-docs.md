---
title: Write human-readable docs in plain language and Simplified Technical English
description: Write docs people act on (procedures, runbooks, guides) to ISO 24495-1 plain-language principles, and write procedures and warnings to ASD-STE100 Simplified Technical English rules.
id: BP-0009
domain: D.DOC.HUM
type: guideline
roles: [implementer, reviewer]
stage: [build, verify]
status: draft
version: 1.0.0
updated: 2026-11-24
related: [BP-0007]
sources:
  - { title: ASD-STE100 Simplified Technical English (Issue 9, 2025), url: https://www.asd-ste100.org/ }
  - { title: 'ISO 24495-1:2023 Plain language — Part 1: Governing principles and guidelines', url: https://www.iso.org/standard/78907.html }
---

## Rules

### All human-readable docs (plain language, ISO 24495-1)

1. **MUST** name the reader and the task the doc serves before writing. Write for that reader only.
2. **MUST** put the most important information first: the outcome, the action, or the decision.
3. **MUST** use headings that say what the section tells or asks the reader to do ("Restart the service", not "Service").
4. **MUST** define each term, acronym and abbreviation at first use, and then use the same term every time. Do not use synonyms for variety.
5. **SHOULD** use short sentences, short paragraphs (one topic each), and the active voice.
6. **SHOULD** use lists for steps and items, and tables for comparisons.
7. **SHOULD** test the doc with a real reader, or a reviewer who did not write it, doing the real task.

### Procedures, runbooks and warnings (STE, ASD-STE100)

8. **MUST** write each step as an instruction in the imperative ("Close the valve."), with one instruction per sentence. Put two actions in one step only when they happen at the same time.
9. **MUST** keep sentences in a procedure to 20 words or fewer, and descriptive sentences to 25 words or fewer.
10. **MUST** use each word with one meaning only. Prefer simple, common verbs ("start" not "initiate", "use" not "utilise").
11. **MUST** give a warning or caution before the step it applies to. Start with a clear command, then give the reason or the risk.
12. **MUST** put a condition before the instruction it controls ("If the light is red, stop the pump.").
13. **SHOULD** avoid phrasal verbs ("set up", "carry out"), -ing verb forms used as nouns, and long noun clusters ("server log file retention policy configuration").
14. **SHOULD** write descriptive paragraphs of no more than six sentences, with a topic sentence first.
15. **MAY** apply full ASD-STE100 (approved dictionary and all writing rules) where docs are safety-critical, regulated, translated, or read by non-native English speakers.

## When to apply

Any doc that a person reads to do something: runbooks, SOPs, install and upgrade guides, incident procedures, user guides, change plans, READMEs and error messages.

Apply rules 8–15 to every procedure and warning. Full STE (rule 15) is most valuable in OT and safety work, maintenance documentation, and content that will be translated.

Not intended for persuasive writing, essays or marketing copy. Docs written mainly for agents to fetch and act on follow [BP-0007](/documentation-writing/agent-readable-docs/write-agent-readable-docs/). The two sets of rules agree, so a doc can meet both.

## Procedure

1. **Plan.** Write one line each: who the reader is, what task they are doing, and what they need to know first.
2. **Structure.** Order the content by when the reader needs it: prerequisites, warnings, steps, verification, rollback.
3. **Draft.** Write procedures to rules 8–13. Write explanations to rules 1–6.
4. **Check.** Measure sentence length, remove synonyms, change passive voice to active, and check every warning comes before its step. Where possible, use a prose linter such as [Vale](https://vale.sh/) with rules for these checks.
5. **Test.** Have a reader follow the doc without help. Fix every place where they stop, guess or ask.

## Examples

Before:

> In order to facilitate the upgrade, it is recommended that the existing service should be stopped by the operator prior to the initiation of the installer, otherwise data loss may potentially be experienced.

After:

> **CAUTION:** Stop the service before you start the installer. If the service runs during the upgrade, you can lose data.
>
> 1. Stop the service: `systemctl stop parts`.
> 2. Make sure that the service is stopped: `systemctl is-active parts` shows `inactive`.
> 3. Start the installer.

Why it is better: the caution comes before the step, each step has one instruction in the imperative, sentences are short, and "facilitate", "initiation" and "potentially be experienced" are gone.

| Avoid | Use |
| --- | --- |
| initiate, commence | start |
| utilise | use |
| ensure | make sure |
| prior to | before |
| in the event that | if |
| set up (phrasal verb) | install, configure |
| should be stopped (passive) | stop |

## Anti-patterns

- Warnings after the step they apply to, or hidden inside a paragraph.
- Steps that combine several actions and a check in one long sentence.
- Using "server", "host", "node" and "box" for the same thing.
- Headings that are labels ("Overview", "Misc") instead of what the reader will find or do.
- A wall of background before the first instruction.

## Checklist

- [ ] Reader and task stated; most important information first
- [ ] Headings say what the reader does or learns
- [ ] Terms defined once and used consistently
- [ ] Every step: imperative, one instruction, 20 words or fewer
- [ ] Every warning: before its step, command first, then the risk
- [ ] Conditions before the instruction they control
- [ ] Tested by someone who did not write it

## References

- [ASD-STE100 Simplified Technical English](https://www.asd-ste100.org/) — Issue 9 (January 2025); free copy available from ASD.
- [ISO 24495-1:2023 Plain language — Part 1: Governing principles and guidelines](https://www.iso.org/standard/78907.html) — principles: relevant, findable, understandable, usable.
- [Vale prose linter](https://vale.sh/)
