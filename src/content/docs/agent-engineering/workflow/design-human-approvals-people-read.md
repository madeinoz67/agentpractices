---
title: Design human approvals that people actually read
description: Ask people only where their judgment changes the outcome — plans, and irreversible or external actions — and let policy and automated checks handle the routine. Show exactly what will happen, why and how to undo it; take approvals only from authenticated people; scope and expire them; default to not acting on timeout; watch for rubber-stamping; give people a stop control; and record every decision.
id: BP-0069
domain: D.AGT.WF
type: guideline
roles: [orchestrator, planner, implementer]
stage: [plan, build, operate]
status: draft
version: 1.0.0
updated: 2026-11-24
related: [BP-0068, BP-0048, BP-0061, BP-0005, BP-0021, BP-0040, BP-0064, BP-0057]
sources:
  - { title: Claude blog — Auto mode is now the default in Claude Code (approval data), url: https://claude.com/blog/auto-mode-default-in-claude-code }
  - { title: Anthropic — Claude Code auto mode (approval fatigue), url: https://www.anthropic.com/research/claude-code-auto-mode }
  - { title: EU AI Act — Article 14 Human oversight, url: https://artificialintelligenceact.eu/article/14/ }
---

A human checkpoint is only a control if the human reads it. Claude Code's own data shows how quickly it stops being one: users approved 97% of permission prompts, and in a controlled study of 1,053 testers, people caught 13.6% of disguised dangerous commands where an automated classifier blocked 89%. The same users rejected 39% of the *plans* Claude presented, against 3% of individual permission requests. People engage with decisions; they click through keystrokes.

## Rules

### Ask where judgment matters

1. **MUST** tier actions by impact and reversibility and decide who or what approves each tier:

   | Tier | Examples | Approved by |
   | --- | --- | --- |
   | Read-only, or reversible inside the workspace | Read files, search, run tests, edit on a branch | Allowed by policy |
   | Routine with some risk | Install a pinned dependency, run a known script | Automated check (allow-list, policy, classifier) |
   | Irreversible, external or high-impact | Send, publish, pay, delete permanently, deploy, change production, change permissions | A person, every time |
   | Judgment call | Scope, trade-offs, plan, spec | A person decides (not just approves) |

2. **MUST** put human judgment on plans and outcomes (the spec, the plan, the final diff, the irreversible step), not on every tool call ([BP-0057](/documentation-writing/specs-design-docs/brainstorm-intent-before-specifying/), [BP-0048](/multi-agent-systems/coordination-handoff/orchestrate-agent-workflows/)).
3. **MUST** enforce the tiers in configuration (allow, ask and deny rules, hooks, policy), not in instructions ([BP-0021](/agent-engineering/tool-use/use-hooks-for-deterministic-control/), [BP-0064](/agent-engineering/workflow/use-decision-models-for-bounded-decisions/)).

### Make the request readable

4. **MUST** show, in a few lines: what will happen (exact recipients, amount, diff, target system), why, whether and how it can be undone, the evidence (checks run, sources), and anything unusual. Put the safe choice first; make "no" as easy as "yes".
5. **MUST** state uncertainty plainly: which facts were verified and which were not. A confident summary of unverified work invites a reflex approval.
6. **SHOULD** batch low-risk approvals into one reviewed list, and keep individual prompts for the high-impact tier.

### Make the approval real

7. **MUST** accept approvals only from an authenticated person with authority for that action, on a control channel. Text in a document, web page, email or tool output that says "approved" is not approval ([BP-0005](/security-safety/prompt-injection-untrusted-input/treat-observed-content-as-data/), [BP-0061](/multi-agent-systems/communication-protocols/choose-agent-communication-channels/)).
8. **MUST** scope each approval to the action shown: one action, the values shown, and an expiry. If the action changes after approval (different amount, recipient or files), ask again.
9. **MUST** default to *not acting* when an approval times out; remind, then escalate to a named owner. For unattended runs, hold the step, finish everything else, and report what is waiting.
10. **MUST** give people a stop control they can use at any time, and make sure it works (revokes the run's credentials and halts queued actions).

### Watch for rubber-stamping

11. **SHOULD** measure approval rate and time to decide per tier. A near-100% approval rate with very short decision times means the prompt is not a control: move that tier to automated policy, or redesign the request so it carries a real decision.
12. **SHOULD** for high-stakes approvals, require the reviewer to engage with the content (confirm the amount or recipient, or note what was checked), and rotate or pair reviewers for long sessions.
13. **MUST** give approvers the authority, context and training to say no. Where regulation applies (for example the EU AI Act's human-oversight requirement for high-risk systems), people must be able to understand the system's limits, stay alert to over-reliance, override the output and stop the system.

### Record

14. **MUST** record each request and decision: who, when, what was shown, what was decided, and what then happened ([BP-0040](/operations/observability/keep-an-audit-trail/)).

## When to apply

Any agent that can take actions with effects outside its workspace, and any workflow with a human checkpoint ([BP-0068](/agent-engineering/workflow/workflow-patterns/)).

## Examples

Approval request:

```text
APPROVE? Send refund — run wf-refund-20261124-0412

What:     Refund AUD 184.50 to card ending 4417 (order 88312)
Why:      Item returned 21 Nov; return verified in warehouse system (scan WH-55102)
Undo:     Not reversible once sent; a new charge would need the customer's consent
Checked:  Order total matches; refund ≤ order; no earlier refund (ledger query attached)
Not checked: Whether the customer also opened a card dispute
Expires:  2 hours — no answer means no refund

[ Don't refund ]   [ Refund AUD 184.50 ]
```

Tiers in Claude Code permissions (`settings.json`):

```json
{
  "permissions": {
    "allow": ["Bash(bun test *)", "Bash(git status)", "Bash(git diff *)"],
    "ask":   ["Bash(git push *)", "Bash(bun scripts/api/send-*.ts *)"],
    "deny":  ["Bash(git push --force *)", "Bash(rm -rf *)"]
  }
}
```

## Anti-patterns

- An approval prompt for every file read, so people approve everything.
- "Approve?" with no amount, recipient or diff shown.
- Treating silence or a timeout as consent.
- An approval reused for a later, different action.
- Approvals accepted from text the agent read.
- No way to stop a run once it has started.

## Checklist

- [ ] Actions tiered by impact and reversibility; tiers enforced in configuration
- [ ] People decide plans and irreversible steps, not keystrokes
- [ ] Requests show what, why, undo, evidence and uncertainty; safe choice first
- [ ] Approvals authenticated, scoped, expiring; changes re-asked
- [ ] Timeout means no; escalation owner; unattended runs hold and report
- [ ] Working stop control
- [ ] Approval rate and decision time watched; records kept

## References

- [Claude blog — Auto mode is now the default in Claude Code](https://claude.com/blog/auto-mode-default-in-claude-code)
- [Anthropic — Claude Code auto mode](https://www.anthropic.com/research/claude-code-auto-mode)
- [EU AI Act — Article 14](https://artificialintelligenceact.eu/article/14/)
