---
title: Measure agent line flow, not just individual runs
description: Measure throughput, work in progress and cycle-time distribution per station, check Little's law, and add capacity at the bottleneck.
id: BP-0098
domain: D.OPS.OBS
type: guideline
roles: [orchestrator]
stage: [operate]
status: draft
version: 1.0.0
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0051, BP-0041, BP-0042, BP-0095]
superseded_by: null
sources:
  - { title: Little's law — work in progress, throughput and cycle time, url: https://en.wikipedia.org/wiki/Little%27s_law }
  - { title: DORA — the four keys, including lead time for changes, url: https://dora.dev/guides/dora-metrics-four-keys/ }
  - { title: Actionable Agile — flow metrics for predictability, url: https://actionableagile.com/ }
---

Per-run telemetry can show every workflow finishing green while the line that runs them stalls. Items wait in queues, work in progress grows, cycle time has a long tail, and the same station causes most of the rework. Without flow metrics the only visible numbers are cost and success per run, so capacity gets added where it is cheap to add rather than at the bottleneck.

This practice measures the line as a system: throughput, work in progress and cycle time per station, the queue and wait that separate them, and the rework that flows back. It sits alongside [BP-0051](/operations/observability/observe-agent-workflows/), which traces individual workflows, and [BP-0041](/operations/cost-performance/budget-and-control-agent-cost/), which budgets cost and latency per task.

## Rules

### Measure the line, not only the runs

1. **MUST** measure, per line and per station: throughput (items completed per period), work in progress, and cycle time from arrival at the line to delivery.
2. **MUST** report cycle time as a distribution (median and 85th percentile) and list the items behind the numbers, not a single mean.
3. **MUST** measure wait time and queue length at each station separately from work time, so the bottleneck is visible.

### Trust the numbers before acting on them

4. **MUST** check the line against Little's law (average work in progress equals throughput times average cycle time) and treat a large mismatch as a measurement problem before tuning anything.

### Add capacity at the bottleneck

5. **MUST** identify the bottleneck from the longest queue or wait, and change capacity there first; capacity added at a station that is not the bottleneck does not raise throughput.

### Count rework as flow

6. **MUST** count rework as flow: items returned, the station they return to, and the extra cycle time they add.

### Measure from arrival

7. **SHOULD** measure cycle time from the item's arrival at the line, not from when the current station picked it up.

### Warn early and review on a cadence

8. **SHOULD** alert when work in progress exceeds its cap, or an item passes a cycle-time threshold, with the item ID and the station it is stuck at.
9. **SHOULD** review the distribution on a regular cadence and record each change to the line with the before and after numbers.

## When to apply

Apply this practice when work flows through a line of stations and the question is throughput, predictability or where to add capacity. For a single workflow that runs once, [BP-0051](/operations/observability/observe-agent-workflows/) is enough. For cost control per task, use [BP-0041](/operations/cost-performance/budget-and-control-agent-cost/).

## Procedure

1. Give every item an ID at arrival and timestamp each station entry, start of work, finish of work and exit.
2. Compute per station: queue length, wait time, work time. Compute per line: throughput, work in progress, cycle time from arrival to delivery.
3. Plot cycle time as a scatter of items over time. Read the median and the 85th percentile; do not stop at the mean.
4. Compute average cycle time and compare it with work in progress divided by throughput. A gap you cannot explain by rounding or missing timestamps is a data problem: fix the measurement before changing the line.
5. Find the station with the longest average wait. Add capacity there, then re-measure throughput before making any other change.
6. Count items returned to an earlier station and add their extra cycle time to the line's total.
7. Alert on a cap breach or a cycle-time outlier with the item ID and the station, so the alert is actionable.
8. Review the distribution on a cadence, record each change with its before and after numbers, and keep the record with the line's configuration.

## Examples

A week on a four-station line:

| Metric | Value |
| --- | --- |
| Throughput | 12 items per week |
| Work in progress | 12 items |
| Cycle time | median 4 days, 85th percentile 11 days |
| Average cycle time (Little's law) | 12 / 12 per week = 7 days |

The average of 7 days sits between the median and the 85th percentile, so the numbers agree and the line can be tuned. The review station holds 6 of the 12 items and a 3-day average wait; the others hold 1 day or less. The bottleneck is review. Adding an implementer raises nothing; adding a second reviewer with the same role definition does.

The next week the review cap of 3 is breached at 4 items, and the alert names item 1187 at review for 2 days and 4 hours. That is actionable: either the cap or the reviewer's capacity changes, and the choice is recorded.

## Anti-patterns

- A dashboard of green runs while items wait a week between stations.
- One mean cycle time that hides a long tail.
- Adding workers at the first station because it is busy, when review is the queue.
- Measuring cycle time from when each station picked the item up, so waiting disappears from the numbers.
- Treating a Little's law mismatch as a real improvement, then tuning the line against bad data.
- Reporting cost per run as the only operational number.
- Counting a returned item as new work, so rework is invisible.

## Checklist

- [ ] Throughput, work in progress and cycle time measured per line and per station
- [ ] Cycle time reported as median and 85th percentile with the items listed
- [ ] Queue length and wait time measured apart from work time
- [ ] Little's law checked, and a mismatch treated as a measurement problem
- [ ] Bottleneck identified from the longest wait and capacity added there first
- [ ] Rework counted as flow, with the returned station and the extra cycle time

## References

- [Little's law](https://en.wikipedia.org/wiki/Little%27s_law)
- [DORA — the four keys](https://dora.dev/guides/dora-metrics-four-keys/)
- [Actionable Agile](https://actionableagile.com/)
