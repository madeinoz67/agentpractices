---
title: Carry one definition of done from work item to delivery
description: Write the item's definition of done before the line starts, let stations add exit checks but never narrow it, and check the original at the final gate.
id: BP-0097
domain: D.MAS.HND
type: guideline
roles: [orchestrator, reviewer]
stage: [plan, build, verify]
status: draft
version: 1.0.0
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0008, BP-0059, BP-0048, BP-0002]
superseded_by: null
sources:
  - { title: The Scrum Guide — Definition of Done, url: https://scrumguides.org/scrum-guide.html }
  - { title: Agile Alliance — Definition of Done, url: https://www.agilealliance.org/glossary/definition-of-done/ }
---

Each station in an agent line has its own exit check, and each is easy to satisfy. A reviewer accepts "tests pass" while the item's acceptance criterion was "the user path works in the real app". The last station's report becomes the working definition of done, the original is never checked, and the item is delivered with the requester's criterion unmet and the ledger recording a success.

This practice keeps one definition of done attached to the item from the moment it is written to the moment it is accepted. Stations may add their own exit checks on top, but they cannot weaken, narrow or replace the item's definition, and the final gate checks the original rather than the last station's account of it.

## Rules

### Define it before work starts

1. **MUST** write the item's definition of done before the first station starts: the checks that decide acceptance, the evidence each check produces, and who accepts.
2. **MUST** give the requester ownership of the definition of done; a station may add its own exit check, but **MUST NOT** weaken, narrow or replace the item's definition of done.

### Carry it through every station

3. **MUST** carry the definition of done with the item through every station, versioned, in the same record as the item's status and evidence ([BP-0048](/multi-agent-systems/coordination-handoff/orchestrate-agent-workflows/)).
4. **MUST** check the final gate against the item's original definition of done, not against the last station's report or a station-local proxy ([BP-0059](/agent-engineering/workflow/validate-with-proof-not-claims/)).
5. **MUST NOT** accept an item that passed every station's own checks but fails the item's definition of done.

### Route failure to its source

6. **MUST** return a failed item to the earliest station whose exit check failed, with the failing evidence attached, instead of reworking it at the last station.

### Change it only in the open

7. **MUST** record any change to the definition of done as a new version with the requester's approval and the reason for the change.

### Make it checkable and measure rework

8. **SHOULD** express the definition of done as executable checks where possible (a test, schema validation, a script) and as a written rubric with a pinned judge where not ([BP-0008](/agent-engineering/workflow/decompose-tasks/)).
9. **SHOULD** measure rework: how often items return, to which station, and how many versions of the definition of done they accumulate.

## When to apply

Apply this practice to any item that moves through more than one station, and to any item whose acceptance depends on a criterion other than "the station finished". A single-agent task still needs a check; [BP-0002](/agent-engineering/workflow/plan-execute-verify/) covers that case without the carried record.

## Procedure

1. When the item is written, record its definition of done: each check, the evidence the check produces, and the person or role that accepts.
2. Give the record an owner (the requester) and a version (start at 1). Store it with the item, not in chat.
3. At each station, read the definition of done before starting. Add that station's own exit check; do not edit the item's definition.
4. When an exit check fails, attach the failing evidence and return the item to the earliest station whose check failed.
5. At the final gate, run every check in the item's original definition of done and record the evidence against each one.
6. If a check must change, stop, get the requester's approval, and write version 2 with the reason. Never edit a check silently to make an item pass.
7. Count returned items and accumulated versions as rework, and review them with the line's flow metrics.

## Examples

An issue carries its definition of done in the tracker:

```yaml
definition_of_done:
  version: 1
  owner: requester
  checks:
    - name: acceptance path
      evidence: screenshot and transcript of the real app run
    - name: regression suite
      evidence: test run output, 0 failures
  accepted_by: requester
```

The implement station adds an exit check (the unit's tests pass in its worktree) without touching the two checks above. The review station reports findings. The final gate drives the real app, captures the transcript and runs the suite, then compares both to the original two checks. If the user path fails, the item returns to the implement station with the transcript attached, not to the reviewer who first noticed it.

A content item: the definition of done names audience, length, sources and a fact-check pass. An editor may add "no unresolved edit comments" as an exit check. The publisher checks the original four criteria, not the editor's log.

## Anti-patterns

- A reviewer accepting "tests pass" for an acceptance criterion about the real user path.
- The final gate reading the last station's report instead of running the original checks.
- Reworking a failed item at the last station, so the next run repeats the same failure.
- Editing a hard check to "realistic" values without the requester's knowledge.
- Keeping the definition of done in chat, where it cannot travel or be versioned.
- Counting an item as delivered because every station returned success.

## Checklist

- [ ] Definition of done written before the first station, with checks, evidence and accepter
- [ ] Requester owns it; stations add checks but never weaken or narrow it
- [ ] It travels with the item, versioned, beside the status and evidence
- [ ] Final gate checks the original, not the last station's report
- [ ] Failed items return to the earliest failing station with evidence
- [ ] Changes recorded as a new version with the requester's approval
- [ ] No item accepted on station checks alone

## References

- [The Scrum Guide — Definition of Done](https://scrumguides.org/scrum-guide.html)
- [Agile Alliance — Definition of Done](https://www.agilealliance.org/glossary/definition-of-done/)
