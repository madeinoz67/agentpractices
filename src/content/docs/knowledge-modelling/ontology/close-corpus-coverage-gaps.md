---
title: Close standards-corpus coverage gaps in one batched release
description: When independently versioned standards must stay in step, gate the coverage between them and close every gap found in a single batch, not one release per gap.
id: BP-0014
domain: D.KNO.ONT
type: guideline
roles: [implementer, reviewer]
stage: [build, verify, operate]
status: draft
version: 2.0.0
updated: 2026-11-25
reviewed: 2026-11-25
review_by: 2027-05-25
related: [BP-0004, BP-0007, BP-0072]
sources:
  - { title: W3C SKOS Reference, url: https://www.w3.org/TR/skos-reference/ }
  - { title: Semantic Versioning 2.0.0, url: https://semver.org/ }
  - { title: Architectural fitness function (Thoughtworks), url: https://www.thoughtworks.com/insights/blog/architectural-fitness-function }
  - { title: 'Design by Contract — Bertrand Meyer', url: https://se.ethz.ch/~meyer/publications/computer/contract.pdf }
---

## Rules

1. **MUST** treat a member declared by one standard and absent from the standard that has to cover it as a gap in the corpus, not as a defect in the consumer that hit it.
2. **MUST** define, for every pair of independently versioned standards that must stay in step, a machine-checkable coverage invariant: each member of the declaring standard resolves to an entry in the covering standard, or to a recorded exception.
3. **MUST** run that invariant at a gate on every change to either standard, so neither side can ship a member the other lacks.
4. **MUST** separate a completeness constraint from a compatibility constraint. Completeness says every member is covered and a missing row is a failure; compatibility or evidence says each row carries its proof and a missing row is a deliberate, recorded negative. The two **MUST NOT** share a table, file or schema that can express only one of them.
5. **MUST** record every gap in a ledger — member, declaring standard, covering standard, where it was found — and **MUST** check the ledger before opening a new gap for the same member.
6. **MUST** express an exception as explicit data naming the member, the reason and an owner, never as a silent omission.

Shipping the gaps once they are found is a release concern; see [BP-0072](/software-engineering/release-engineering/batch-the-release-round-trip/).

## When to apply

Any corpus of normative standards or reference data consumed outside its own repository, where two parts version independently: a device-class registry and its user-facing reference, a protocol field list and its client library, a schema and its code bindings, a taxonomy and the documentation written from it.

## Procedure

1. List the standards that must stay in step, and confirm which versions independently of which.
2. Write the invariant as data or code: members from the declaring standard, entries from the covering standard, exceptions from the exception list. Its failures **are** the gap list.
3. Record each gap in the ledger. Do not fix the first gap found before the invariant has named the rest.
4. Run the invariant at the gate; close the ledger rows it clears.

## Examples

A test-bench SDK ships two independently versioned standards: a device standard that declares 12 device classes, and a UI class reference that covers 8. Four classes — an embedded controller, a spectrum analyser, a switch matrix and a VNA — have no UI reference at all. Nothing forced the two standards to stay in step, so a plugin author discovered the silence at the point of use.

With the invariant in rule 2, the gate names all four on its first run. What it then costs to ship them is [BP-0072](/software-engineering/release-engineering/batch-the-release-round-trip/).

The same corpus also carries a compatibility table whose own note asks for a citation per row and describes missing rows as deliberate honest negatives. That table cannot report coverage holes: a missing row there means "no evidence needed", not "not covered". The coverage invariant belongs in its own place, for that reason.

## Anti-patterns

- Reusing a "missing rows are deliberate" note to explain a coverage hole.
- A consumer silently skipping the members the reference does not cover.
- Coverage tracked in a document no gate reads.
- A member with no counterpart vanishing from the count instead of appearing as an exception.

## Checklist

- [ ] Every pair of standards that must stay in step has a coverage invariant
- [ ] The invariant runs at a gate and fails on a member either side lacks
- [ ] Completeness and compatibility constraints live in separate tables
- [ ] Each gap has a ledger row
- [ ] Exceptions are explicit, with a reason and an owner

## References

- [W3C SKOS Reference](https://www.w3.org/TR/skos-reference/) — mapping and correspondences between concept schemes
- [Semantic Versioning 2.0.0](https://semver.org/) — independently versioned artefacts and dependency pinning
- [Architectural fitness function](https://www.thoughtworks.com/insights/blog/architectural-fitness-function) — an automated check that fails when a required structural property breaks
- [Design by Contract — Bertrand Meyer](https://se.ethz.ch/~meyer/publications/computer/contract.pdf) — invariants as checkable assertions
