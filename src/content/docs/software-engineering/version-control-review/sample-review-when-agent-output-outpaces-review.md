---
title: Sample review when agent output outpaces review
description: "Make review statistical when agent output exceeds reviewer capacity: deterministic checks gate every change, a random risk-stratified sample gets human eyes, a defect stops the batch, and escaped defects change the environment."
id: BP-0104
domain: D.SWE.VCS
type: guideline
roles: [reviewer, orchestrator]
stage: [verify, operate]
status: draft
version: 1.0.0
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0036, BP-0038, BP-0059, BP-0069, BP-0098]
superseded_by: null
sources:
  - title: "Ai insider — Lauren Tan reveals how 30+ AI agents ship PRs while you sleep"
    url: https://www.youtube.com/watch?v=6hxp0SpGxz8
    note: Review as sampling like a factory quality supervisor, reviewing the pull request after it lands, and correcting the environment from what the sample shows; behind rules 1, 3, 5 and 6.
  - title: "NIST/SEMATECH e-Handbook of Statistical Methods — Acceptance sampling"
    url: https://www.itl.nist.gov/div898/handbook/pmc/section2/pmc22.htm
    note: Sample size, accept and reject numbers, producer and consumer risk, and the operating characteristic curve; behind rule 8 and the accept-or-reject rule in rule 2.
  - title: "Google SRE Workbook — Canarying Releases"
    url: https://sre.google/workbook/canarying-releases/
    note: A staged batch with an abort criterion and a rollback path when the sample shows the change is bad; behind rule 5.
---

A fleet of agents produces more changes than a person can read line by line. The reviewer becomes the bottleneck, then starts approving on trust, and the review that the process claims to have is no longer happening. Full review does not scale and no review does not hold.

This practice makes review statistical, in the way a factory quality supervisor works: every change passes deterministic checks, a random sample gets human eyes, and the finding from the sample decides whether the batch continues. The sample is sized and judged by an acceptance rule rather than a percentage someone liked. What the sample catches is turned into an environment change so the next batch is smaller or cleaner. The sampling and post-merge review come from Lauren Tan's talk (first source); the acceptance-sampling plan and the batch abort rule are additions grounded in the sources below.

## Rules

1. **MUST** choose the review mode per change class from evidence: full review, sampled review, or post-merge review. Sampled review is never used for irreversible, security-sensitive, data-migration or customer-facing changes.
2. **MUST** write the sampling plan before the first batch: sample size, selection method, the accept or reject rule, and the reviewer.
3. **MUST** select the sample at random and stratify it by risk (touched area, agent, model, change size); never review the convenient changes.
4. **MUST** gate every change on deterministic checks (tests, types, security, build) before any sample is drawn; sampling reviews what the checks cannot see ([BP-0036](/software-engineering/version-control-review/review-agent-written-changes/)).
5. **MUST** stop the batch and widen to full review when the sample finds a defect above the agreed severity, and fix the line before resuming.
6. **MUST** review the merged history on a cadence and turn each escaped defect into an environment change.
7. **MUST** record per batch: changes, sampled count, findings by severity, escapes, and the action taken.
8. **SHOULD** size the sample from an acceptance-sampling rule (confidence and tolerable defect rate), not a fixed percentage.
9. **MUST** keep a human approval point for anything that cannot be rolled back ([BP-0069](/agent-engineering/workflow/design-human-approvals-people-read/)).
10. **MUST** measure reviewer load and wait time; when review is the bottleneck, reduce change size or strengthen checks, do not shrink the sample.

## When to apply

Use it when the volume of agent output has passed what full review can absorb: a fleet opening many pull requests, a content line publishing daily, a triage queue that changes records faster than one person can read. It also fits a single agent on a high-volume, low-risk stream, where full review is waste.

Do not use it for changes that cannot be undone, that touch security or personal data, that migrate data, or that a customer will see: those keep full review and human approval. Do not use it to justify a sample that never runs. And do not start sampling before the deterministic checks are trustworthy: sampling tells you what the checks miss, and it cannot replace them ([BP-0038](/software-engineering/testing/keep-tests-honest/)).

## Procedure

1. Classify the change streams by risk. Assign each a review mode: full, sampled or post-merge.
2. Write the sampling plan for each sampled stream: how many changes, chosen how, accepted or rejected by what finding, reviewed by whom.
3. Choose the sample size from a tolerable defect rate and a confidence level, not from time available ([BP-0059](/agent-engineering/workflow/validate-with-proof-not-claims/) for the evidence standard).
4. Run the deterministic checks on every change and record their results before the sample is drawn.
5. Draw the sample at random within risk strata. Record which changes were drawn.
6. Review the sample against the same criteria as a full review. Count findings by severity.
7. On a finding above the agreed severity, stop the batch, widen to full review, fix the line, and restart with a fresh sample.
8. After merge, review the history on the cadence; turn each escape into an environment change and record it.
9. Review the plan on a cadence: sample size, findings, escapes, reviewer load and wait time.

## Examples

A coding fleet opens 120 pull requests a day. Every change passes the test suite, the type check, the security scan and the build. The plan draws 20 at random per day, stratified by area and change size, and reviews them fully. A severity-1 finding stops the day's merges and sends the batch to full review. The sample finds the same missing input check twice in a week, so a lint rule is added; the next week's sample finds none.

A docs agent rewrites 40 pages a week. Every page passes the link check and the terminology check. The plan samples 8 pages, one from each product area, and a person reads them for accuracy. A page that contradicts the current release stops the batch.

A payment path keeps full review. No sample is drawn, because a defect there cannot be rolled back and no sample size makes the risk acceptable.

## Anti-patterns

- Reviewing every change until the reviewer burns out, then reviewing none.
- A fixed "review 10 percent" with no accept or reject rule, so the sample cannot fail the batch.
- Sampling the easy or the oldest changes instead of a random, risk-stratified set.
- Letting a sample finding pass because the rest of the batch looks fine.
- Sampling in place of deterministic checks, rather than on top of them.
- Sampling changes that cannot be rolled back or that a customer will see.
- Never reviewing the merged history, so escapes are discovered by users.
- Shrinking the sample when review becomes the bottleneck instead of reducing change size.

## Checklist

- [ ] Each change stream has a review mode chosen from its risk
- [ ] A written sampling plan fixes the sample size, selection, accept rule and reviewer
- [ ] The sample is random and stratified by risk
- [ ] Deterministic checks gate every change before any sample is drawn
- [ ] A defect above the agreed severity stops the batch and widens review
- [ ] The merged history is reviewed on a cadence, and escapes become environment changes
- [ ] Each batch records changes, sampled count, findings, escapes and action
- [ ] Human approval remains for anything that cannot be rolled back
- [ ] Reviewer load and wait time are measured, and the fix is smaller changes or stronger checks
