---
title: Keep agents out of the OT control path
description: In operational technology, safety and operational continuity come first. Run agents in the business layers on data pushed out of OT, never with write or persistent inbound access to control systems; never let an LLM make safety decisions; route anything an agent produces for OT (logic, configuration, setpoints, procedures) through engineering review, simulation and management of change; keep operators in control with tested failsafes; and treat OT data as sensitive.
id: BP-0070
domain: D.SEC.OT
type: guideline
roles: [orchestrator, planner, implementer, reviewer]
stage: [plan, build, operate]
status: draft
version: 1.0.0
updated: 2026-11-25
related: [BP-0032, BP-0062, BP-0069, BP-0067, BP-0052, BP-0050, BP-0040, BP-0060, BP-0005]
sources:
  - { title: 'CISA, ASD''s ACSC et al. — Principles for the Secure Integration of AI in Operational Technology (Dec 2025)', url: https://www.cyber.gov.au/business-government/secure-design/operational-technology-environments/principles-for-the-secure-integration-of-artificial-intelligence-in-operational-technology }
  - { title: ISA/IEC 62443 series of standards, url: https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards }
  - { title: NIST SP 800-82 Rev. 3 — Guide to Operational Technology (OT) Security, url: https://csrc.nist.gov/pubs/sp/800/82/r3/final }
---

In IT, a bad agent action usually costs data or time. In OT it can cost a process upset, damaged equipment or a safety incident. Joint guidance from CISA, Australia's ASD's ACSC and partners (December 2025) states that LLMs almost certainly should not be used to make safety decisions in OT, and that they typically belong in the business layers (Purdue levels 4–5), working on data exported from OT rather than in real-time control. This practice applies that to agents: coding agents writing control logic, operations agents reading historians, and assistants for engineers and operators.

Priority order for every decision here: safety, then operational continuity, then security, then everything else.

## Rules

### Placement and data flow

1. **MUST** run agents in the enterprise or business zone (Purdue levels 4–5) or a dedicated zone of their own, never in levels 0–3 and never with direct access to controllers, safety systems or HMIs.
2. **MUST** get OT data to agents by push or brokered export (historian replica, data diode, audited staging area in the DMZ) that sends only the data needed. Agents **MUST NOT** have persistent inbound access, interactive sessions or write paths into OT.
3. **MUST NOT** connect an agent to an OT system through a tool or MCP server that can write (OPC UA writes, Modbus writes, PLC downloads, engineering-workstation automation). A read-only tool against a replica is the ceiling ([BP-0062](/agent-engineering/tool-use/scope-sub-agent-tools-and-mcp/)).
4. **MUST** model the agent as its own zone and conduit in your IEC 62443 design, with its own identity, least privilege, and every connection through the existing DMZ or jump host ([BP-0032](/security-safety/least-privilege-secrets/give-agents-least-privilege/)).

### What agents may decide

5. **MUST NOT** let an LLM or agent make safety decisions or act on safety functions. Safety instrumented systems, interlocks and trips stay deterministic and outside the agent's reach.
6. **SHOULD** limit agents to advisory roles in OT: summarising alarms and events, drafting procedures, explaining logic, finding anomalies for a person to check. Treat their output as a recommendation that goes through normal change management.
7. **MUST** require operators to validate agent advice against independent evidence (other sensors, trends, field checks) before acting, and train them to do so ([BP-0052](/agent-engineering/workflow/prevent-and-catch-hallucinations/)).

### Changes agents produce

8. **MUST** route anything an agent produces for OT (PLC or DCS logic, configuration, setpoints, alarm limits, SOPs) through management of change: engineering review by a competent person, testing in simulation or hardware-in-the-loop, approval, and deployment by people inside a change window ([BP-0069](/agent-engineering/workflow/design-human-approvals-people-read/)).
9. **MUST NOT** use production OT data or connections in test environments; give agents synthetic or sanitised data and virtual controllers.
10. **MUST** keep a known-good state (project files, configuration backups) and a documented way to bypass or remove the AI component, and test restoring it ([BP-0060](/operations/backup-recovery/back-up-and-recover-agent-systems/)).

### Data and suppliers

11. **MUST** treat engineering configuration and process data as sensitive: it describes how the plant works and how to disrupt it. Do not send it to externally hosted models unless approved for that data class ([BP-0067](/security-safety/data-sovereignty-privacy/keep-agent-data-where-it-is-allowed/)).
12. **MUST** require suppliers to disclose AI embedded in OT products (with an SBOM), restrict training on your operational data, support on-premises or disconnected operation, and let operators disable AI features.

### Oversight and failure

13. **MUST** log agent inputs and outputs with the agent's own identity, show AI status where operators already look, and monitor for drift and anomalies ([BP-0050](/operations/evaluation/detect-model-drift/), [BP-0040](/operations/observability/keep-an-audit-trail/)).
14. **MUST** design AI components to fail safe: if the agent or its feed stops or degrades, operations continue on traditional automation and manual procedures, with defined thresholds for reverting.
15. **MUST** add AI failure and attacks on AI (prompt injection through work orders, documents or alarm text; poisoned data) to OT incident response and functional safety procedures ([BP-0005](/security-safety/prompt-injection-untrusted-input/treat-observed-content-as-data/)).
16. **SHOULD** keep people's manual skills current so the plant can run without the AI, and watch for alarm fatigue from AI-generated alerts.

## When to apply

Any agent or AI feature that reads from, writes to, generates artefacts for, or advises on industrial control systems, SCADA, DCS, safety systems or the networks around them.

## Examples

Where agents fit:

| Level | Systems | Agents allowed |
| --- | --- | --- |
| 4–5 Enterprise / business | ERP, email, analytics, historian replica, document stores | Yes: advisory, analysis, drafting, coding against offline project copies |
| 3.5 IT/OT DMZ | Data brokers, replicas, jump hosts, patch servers | No agent runtime; only the brokered export the agent reads |
| 3 Site operations | Historian, engineering workstations, MES | No |
| 0–2 Control, field, safety | PLC, DCS, SIS, HMI, sensors, actuators | Never |

Read-only data path for an operations agent:

```yaml
# author: Stephen Eaton
agent: alarm-summariser
zone: enterprise-ai              # its own IEC 62443 zone
reads:
  - source: historian-replica    # pushed from the site historian via the DMZ broker, one way
    access: read-only
    scope: [alarms, events, selected tags]   # only what the task needs
writes: []                       # nothing into OT, ever
outputs:
  - channel: shift-handover-report   # advisory; operators validate against trends and field checks
change_control: required for any recommendation that changes a setpoint, alarm limit or logic
```

Coding agent working on PLC logic: works on an exported project copy in a repository; output is a reviewed diff plus test results from the simulator; the controls engineer downloads it to the controller in the approved change window.

## Anti-patterns

- An agent with a VPN or jump-host session into the control network "for convenience".
- An MCP server that can write OPC UA tags or download to a PLC.
- An LLM deciding whether to bypass an interlock or acknowledge a safety alarm.
- Agent-written logic deployed without simulation testing and management of change.
- Process and configuration data pasted into a public AI service.
- No manual fallback once the AI is in the loop.

## Checklist

- [ ] Agents only in levels 4–5 or their own zone; no presence in levels 0–3
- [ ] OT data reaches agents by push or brokered export only; no inbound or write paths
- [ ] No write-capable OT tools or MCP servers
- [ ] No safety decisions by agents; advisory output goes through change management
- [ ] Agent-produced logic and configuration: engineering review, simulation, MOC, human deployment
- [ ] OT data treated as sensitive; supplier AI disclosed and controllable
- [ ] Logging with agent identity; drift monitoring; fail-safe and manual fallback tested; incident response updated

## References

- [Principles for the Secure Integration of AI in OT (ASD's ACSC)](https://www.cyber.gov.au/business-government/secure-design/operational-technology-environments/principles-for-the-secure-integration-of-artificial-intelligence-in-operational-technology)
- [ISA/IEC 62443 series](https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards)
- [NIST SP 800-82 Rev. 3](https://csrc.nist.gov/pubs/sp/800/82/r3/final)
