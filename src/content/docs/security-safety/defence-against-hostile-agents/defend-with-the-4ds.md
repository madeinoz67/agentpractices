---
title: Defend against hostile AI agents with the 4Ds — Delay, Defend, Detect, Disrupt
description: Plan defences against AI-driven attacks in four layers — slow attacking agents down, harden what they target, detect agent behaviour early (deception is a strong signal), and disrupt them inside your own environment — within legal scope and without hacking back.
id: BP-0045
domain: D.SEC.DEF
type: guideline
roles: [any, orchestrator, researcher]
stage: [plan, build, operate]
status: draft
version: 1.0.1
updated: 2026-11-25
reviewed: 2026-11-25
review_by: 2027-05-25
related: [BP-0040, BP-0039, BP-0032, BP-0033, BP-0005]
sources:
  - { title: 'IAPS — Detecting Offensive Cyber Agents: A Detection-in-Depth Approach (arXiv 2605.21956)', url: https://arxiv.org/abs/2605.21956 }
  - { title: Beelzebub — LLM-powered deception runtime, url: https://github.com/beelzebub-labs/beelzebub }
  - { title: OWASP Top 10 for LLM Applications 2026, url: https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/ }
---

## Rules

The four layers come from the Institute for AI Policy and Strategy's detection-in-depth report, which defines them at ecosystem level. The rules below are this site's adaptation for one organisation defending its own environment.

### Delay — slow attacking agents down

1. **SHOULD** raise the cost of automated attacks: rate-limit and challenge high-volume access, add latency to suspicious sessions, and place tarpits that consume an attacking agent's time and tokens.
2. **SHOULD** use decoy paths and content (fake credentials, fake shares, fake APIs) that lead automated attackers into monitored dead ends rather than real systems.

### Defend — harden what agents target

3. **MUST** fix the basics agents exploit fastest: exposed services, stolen or weak credentials, missing MFA, unpatched internet-facing systems, secrets in repositories ([BP-0033](/security-safety/least-privilege-secrets/keep-secrets-out-of-agent-context/)).
4. **MUST** apply least privilege and segmentation so one compromised identity or host gives an agent little to work with ([BP-0032](/security-safety/least-privilege-secrets/give-agents-least-privilege/)).
5. **MUST** harden your own agents against being turned on you: prompt-injection handling, tool allow-lists and approval gates ([BP-0005](/security-safety/prompt-injection-untrusted-input/treat-observed-content-as-data/)).

### Detect — see agent activity early

6. **MUST** deploy deception that only an attacker would touch (canary tokens, honey credentials, decoy hosts and documents). Any interaction is a high-confidence alert, and automated attackers tend to touch everything.
7. **SHOULD** detect machine-speed patterns: very fast reconnaissance, many parallel sessions, systematic enumeration, and tool or user-agent fingerprints, correlated across identity, endpoint, network and cloud logs.
8. **SHOULD** send deception and detection alerts to the SOC with enough context to act, and record the attacking agent's behaviour as threat intelligence.

### Disrupt — impose cost inside your own boundary

9. **SHOULD** respond automatically to high-confidence signals: isolate hosts, revoke sessions and tokens, block sources, and divert the session into a high-interaction decoy to observe it.
10. **MUST NOT** attack, probe or "hack back" systems you do not own or have authority over. Disruption stays inside your environment and your legal scope; get legal and leadership approval for active deception and for any automated response.
11. **MUST** protect deception assets and logs from tampering, and make sure decoys cannot be used as a pivot into real systems.
12. **SHOULD** run regular exercises with an authorised agentic red team to measure time to detect and contain.

## When to apply

Security programmes planning for AI-assisted or fully agentic attacks, including insider misuse of agents.

## Examples

| Layer | Control | Tool examples |
| --- | --- | --- |
| Delay | Tarpit SSH/HTTP endpoints; decoy file shares | LLM-backed honeypots (for example Beelzebub) |
| Defend | Phishing-resistant MFA; secret scanning; segmentation | Identity platform, CI scanners |
| Detect | Canary tokens in repos, mailboxes and AD; decoy hosts | Canary platforms, SIEM correlation |
| Disrupt | Auto-isolate on canary trip; revoke tokens; divert to decoy | SOAR playbooks |

## Anti-patterns

- Deception with no alert routing, so trips are never seen.
- Decoys that hold real data or can reach production.
- Automated "counter-attacks" against source IPs.
- Treating agentic attacks as a future problem while basics stay unfixed.

## Checklist

- [ ] Delay: rate limits, tarpits and decoy paths in place
- [ ] Defend: basics fixed; least privilege; own agents hardened
- [ ] Detect: deception deployed and alerting; machine-speed patterns correlated
- [ ] Disrupt: automated containment inside legal scope; no hack-back
- [ ] Decoys isolated and protected; exercises run

## References

- [Detecting Offensive Cyber Agents: A Detection-in-Depth Approach](https://arxiv.org/abs/2605.21956)
- [Beelzebub](https://github.com/beelzebub-labs/beelzebub)
- [OWASP Top 10 for LLM Applications 2026](https://genai.owasp.org/resource/owasp-genai-llm-top-10-2026/)
