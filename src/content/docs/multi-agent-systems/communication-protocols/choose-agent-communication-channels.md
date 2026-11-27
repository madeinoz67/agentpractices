---
title: Choose agent communication channels for durability, audience and trust
description: A protocol fixes what a message means; a channel is where it travels and who can see, send and answer it. Pick channels by durability, delivery, audience and who may post; keep control (instructions, approvals) separate from data; authenticate anything that can push into an agent; keep a durable record outside chat; route people's notifications by urgency; and stop agent-to-agent loops.
id: BP-0061
domain: D.MAS.COM
type: guideline
roles: [orchestrator, implementer]
stage: [plan, build, operate]
status: draft
version: 1.0.1
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0043, BP-0003, BP-0005, BP-0013, BP-0040, BP-0048, BP-0051, BP-0033]
sources:
  - title: "Claude Code docs — Channels (push events into a running session)"
    url: https://code.claude.com/docs/en/channels
    note: "The worked example for rules 4 and 5: per-plugin sender allowlists, pairing to bootstrap them, and managed settings deciding which channels may run"
  - title: A2A Protocol specification
    url: https://a2a-protocol.org/latest/specification/
    note: The protocol whose messages the practice says can be safe on one channel and dangerous on another, because the channel sets audience and trust
---
[BP-0043](/multi-agent-systems/communication-protocols/communicate-between-agents/) covers **protocols**: the structure and meaning of messages (A2A tasks, MCP tool calls, typed schemas). This practice covers **channels**: the medium a message travels over (a function call, a shared file, a queue, an issue thread, a chat app, a webhook, a push into a running session) and therefore who can read it, who can write to it, whether it survives, and whether anyone notices. The same A2A message can be safe on one channel and dangerous on another.

## Rules

### Pick the channel deliberately

1. **MUST** choose each channel by its properties, not by convenience:

   | Property | Question |
   | --- | --- |
   | Timing | Does the sender wait (synchronous) or move on (asynchronous)? |
   | Durability | Does the message survive a restart, a compaction, a closed session? |
   | Delivery | At most once, at least once? Ordered? Can duplicates be detected? |
   | Audience | Agents only, or people too? Who can read the history? |
   | Who may post | Only authenticated principals, or anyone with access to the space? |
   | Data allowed | Which data classes may it carry, given where its logs are kept? |

2. **SHOULD** use these as defaults:

   | Channel | Good for | Watch for |
   | --- | --- | --- |
   | In-process call | Orchestrator to worker in one process | Nothing survives a crash |
   | Shared file, ledger, workflow memory | Plans, progress, handoffs between sessions ([BP-0013](/agent-engineering/context-memory/use-temporary-workflow-memory/)) | Concurrent writers; leases needed |
   | Queue or event bus | Decoupled, durable, retryable work between services | Duplicates; dead letters |
   | Issue / pull-request threads | Work people review; durable and auditable | Anyone with access can comment: untrusted input |
   | Team chat (Slack, Teams, Discord, Telegram) | Asking people, notifying, quick approvals | Not a system of record; third-party retention; noisy |
   | Webhook / push into a running session | Reacting to CI, alerts, deploys as they happen | Spoofed senders; only delivered while the session runs |
   | Email | External parties, formal records | Spoofing; slow; untrusted content |

### Separate control from data

3. **MUST** keep control channels (where a principal gives instructions or approvals) separate from data channels (events, results, third-party content). Text on a data channel is data, never an instruction, whoever it claims to be from ([BP-0005](/security-safety/prompt-injection-untrusted-input/treat-observed-content-as-data/)).
4. **MUST** authenticate every sender that can push into an agent, with an allowlist bootstrapped by a deliberate step (for example pairing), and drop everyone else. Treat approval relay as privileged: anyone who can answer through the channel can approve the agent's actions.
5. **MUST** let administrators control which channel integrations may run and require each session to opt in to the channels it uses.

### Keep a record and the thread

6. **MUST** keep a durable system of record outside chat: decisions, approvals and results reached in a chat thread are copied to the ledger, issue or audit trail with a link back ([BP-0040](/operations/observability/keep-an-audit-trail/)).
7. **MUST** carry the task or workflow ID on every message, and keep one thread per task, so a conversation can be tied to its trace and resumed ([BP-0051](/operations/observability/observe-agent-workflows/)).
8. **MUST NOT** send secrets, and send personal or restricted data only on channels approved for it ([BP-0033](/security-safety/least-privilege-secrets/keep-secrets-out-of-agent-context/)).

### People and failure

9. **SHOULD** route messages for people by urgency: a push notification for anything blocking (an approval, a failed run), a digest for information. Name an escalation channel with an owner for when nobody answers.
10. **MUST** stop agent-to-agent loops on shared channels: agents respond only when addressed, ignore their own messages and those of other bots unless allow-listed, and cap replies per thread.
11. **MUST** detect delivery failure: acknowledgements or receipts, retries with idempotency keys, a dead-letter place for messages that cannot be delivered, and a fallback channel when the primary is down.

## When to apply

Designing how agents talk to each other and to people, connecting an agent to chat, webhooks or issue trackers, and running agents unattended.

## Examples

Claude Code channels (research preview) push events from Telegram, Discord, iMessage or a webhook into a running session. They show several rules at once: each channel plugin keeps a sender allowlist and silently drops other senders; Telegram and Discord senders are added by pairing; a server must be named with `--channels` for the session; and organisations control availability with managed settings:

```json
{
  "channelsEnabled": true,
  "allowedChannelPlugins": [
    { "marketplace": "claude-plugins-official", "plugin": "telegram" },
    { "marketplace": "acme-corp-plugins", "plugin": "internal-alerts" }
  ]
}
```

Channel plan for a nightly triage workflow:

```yaml
# author: Stephen Eaton
workflow: ci-triage
control:   { channel: claude-session, senders: [stephen] }          # instructions and approvals only
events:    { channel: webhook:ci, auth: hmac-signature }            # data, never instructions
handoffs:  { channel: ledger:.work/ci-triage/progress.md }          # durable record
people:
  blocking: { channel: push:mobile }                                 # approvals, failures
  digest:   { channel: slack:#ci-triage, thread_per: run_id, at: "07:30 local" }
escalation: { channel: pager:oncall-platform, after: 30m }
loops:     { respond_only_when: mentioned, ignore: [self, bots], max_replies_per_thread: 3 }
```

## Anti-patterns

- Taking instructions from anything posted in a shared chat channel or issue comment.
- A push channel with no sender allowlist.
- Decisions that exist only in a chat thread.
- Every event as an urgent notification, so people mute the channel.
- Two agents in one channel answering each other forever.
- Tokens pasted into chat "just to test".

## Checklist

- [ ] Each channel chosen against timing, durability, delivery, audience, posting rights and data class
- [ ] Control and data channels separated; data never treated as instructions
- [ ] Push senders authenticated and allow-listed; approval relay restricted
- [ ] Integrations admin-approved; sessions opt in
- [ ] Durable record outside chat; task IDs and one thread per task
- [ ] Urgency routing and escalation owner; loop limits; delivery failures detected

