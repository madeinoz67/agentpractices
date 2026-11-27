---
title: Batch changes so the release round trip is paid once
description: When a change to an independently versioned component forces a publish, a pin bump and a consumer bump, batch the changes and run that round trip once, not once per change.
id: BP-0072
domain: D.SWE.REL
type: guideline
roles: [implementer, reviewer]
stage: [build, operate]
status: draft
version: 1.0.1
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0014]
sources:
  - title: Semantic Versioning 2.0.0
    url: https://semver.org/
    note: independently versioned artefacts and dependency pinning
  - title: Keep a Changelog 1.1.0
    url: https://keepachangelog.com/en/1.1.0/
    note: a release record written for its consumers
  - title: "Renovate documentation — grouped dependency updates"
    url: https://docs.renovatebot.com/configuration-options/
    note: grouped updates that bump many pinned dependencies in one pass
---
## Rules

1. **MUST** treat the release round trip as the unit of cost: change the source, publish a version, bump the pin in every consumer, rebuild and verify. Count it before choosing how to ship.
2. **MUST** batch independent changes into one release when that round trip is the dominant cost, rather than releasing once per change.
3. **MUST** let implementation proceed against a change that has not been released — a working copy, a branch, or a pre-release pin — so nobody blocks on a release that the next change in the same batch would redo.
4. **SHOULD** order the batch so the dependent work needs one source release, one pin bump and one consumer rebuild, however many changes the batch carries.
5. **MUST** define the batch boundary in the release record — what it contains, and the versions it targets — so the release can be verified once against a known list.

## When to apply

Any component that is versioned and consumed elsewhere: a standards corpus and the reference built from it, a package and its dependents, a schema and its code bindings, a library and the plugins pinned to it. Especially where the same repository must publish, pin and rebuild before the change is usable.

## Procedure

1. Write the round trip out for this component as concrete steps, with the people or pipelines each step waits on.
2. For the work in front of you, decide whether batching pays: if one change costs one full round trip, several changes cost the same one.
3. Open the batch as a record before implementing against it — entries and target versions.
4. Implement against the unreleased change; do not release a partial batch to unblock one consumer.
5. Release once, bump each pin once, rebuild each consumer once, verify against the batch record, then close it.

## Examples

A test-bench SDK ships two independently versioned standards. Four device classes are missing from the UI reference. Closed one at a time, each costs the full round trip: add the entry, pin it, release the SDK, bump the plugin's pin, resume, find the next gap. Four gaps, four round trips.

Batched, all four entries land in one corpus change. There is one SDK release, one pin bump and one plugin rebuild, and the missing field — the part people think is expensive — is the same either way.

## Anti-patterns

- One release per change, each with its own pin → publish → bump cycle.
- Holding a consumer blocked on a release that later changes in the same batch would invalidate.
- A release with no written boundary, so nobody can say what it was verified against.
- Publishing a partial batch to unblock one consumer, then paying the round trip again for the rest.

## Checklist

- [ ] The round trip is written down with its wait points
- [ ] Changes are batched when the round trip dominates the work
- [ ] Implementation runs against the unreleased change
- [ ] One release, one pin bump, one consumer rebuild per batch
- [ ] The release record names the batch entries and target versions

