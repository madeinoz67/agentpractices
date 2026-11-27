---
title: Give agents a control skill and a feature map
description: "Close the app-level verification gap: a control skill drives the running product and captures traces, a maintained feature map tells the agent how to reach every feature, and the evidence travels with the report."
id: BP-0106
domain: D.AGT.WF
type: pattern
roles: [implementer, reviewer]
stage: [build, verify]
status: draft
version: 1.0.0
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0010, BP-0020, BP-0037, BP-0038, BP-0059, BP-0062]
superseded_by: null
sources:
  - title: "Ai insider — Lauren Tan reveals how to build a 21+ agent GrokBot team"
    url: https://www.youtube.com/watch?v=PcO998TSzIz
    note: The control skill that drives the app through DevTools or a simulator, the feature map that tells the agent how to reach every feature, the maintain skill that keeps it current, and the vague-report problem both solve; behind rules 1 to 8.
  - title: "Chrome DevTools Protocol"
    url: https://chromedevtools.github.io/devtools-protocol/
    note: The programmatic control and tracing surface a web or Electron control skill uses; behind rule 1.
  - title: "Playwright — Trace viewer"
    url: https://playwright.dev/docs/trace-viewer
    note: A concrete example of a durable trace artifact that can travel with a report, which is the evidence rule (7).
---

An agent asked to fix a user report can write code but cannot reach the feature the report is about. It greps for the words in the report, guesses, and states a confident cause that turns out to be wrong. A person opens the app, reproduces the issue and describes it, so the person stays the verifier and the work cannot be parallelised. Unit tests do not close this gap, because the failure lives in the running product.

This practice gives the agent hands and a map. A control skill drives the product as a user would and captures traces, screenshots or console logs; a feature map says how to reach each user-facing feature from the user's view, including the selectors or accessibility attributes needed to target it. With both, a vague report becomes a reproducible case and durable evidence, which the outer loop can then carry as context ([BP-0101](/multi-agent-systems/coordination-handoff/feed-inner-loop-agents-with-a-separate-outer-loop-context/)). The control-skill and feature-map pairing comes from Lauren Tan's second talk (first source); the maintenance, proof and evidence rules are additions grounded in the other sources.

## Rules

1. **MUST** give the agent a control surface that runs the product as a user does: drive the interface, take a trace or screenshot, open the simulator, read the console.
2. **MUST** package the control surface as a skill with fixed commands and outputs, so every agent drives the app the same way ([BP-0020](/agent-engineering/tool-use/author-agent-hooks/) for the deterministic parts).
3. **MUST** maintain a feature map that names each user-facing feature and says how to reach it: entry point, navigation path, shortcuts, and the selectors or accessibility attributes used to target it.
4. **MUST** derive the feature map from the code and the running app, and record the build or commit it describes.
5. **MUST** update the map in the same change that adds, renames or moves a feature, route or selector.
6. **MUST** verify the map by having an agent follow it to reach a feature with no help; a map that cannot be followed is prose, not a map.
7. **MUST** keep the evidence (trace, snapshot, screenshot, console log) with the report, not only the agent's claim ([BP-0059](/agent-engineering/workflow/validate-with-proof-not-claims/)).
8. **MUST** treat a vague report (a screenshot, "it is laggy") as a mapping task: locate the surface with the map, then reproduce with the control skill.
9. **SHOULD** keep the control surface read-only where possible; anything that changes data or sends a message keeps its approval ([BP-0032](/security-safety/least-privilege-secrets/give-agents-least-privilege/)).
10. **MUST** record which build the evidence came from and whether the defect reproduces on current main.

## When to apply

Use it when the product has a user interface that reports come from: a web app, a desktop app, a mobile app. It pays most when reports are vague, when the codebase is large enough that grepping for a feature name is unreliable, and when several agents work in parallel and each would otherwise wait for a person to reproduce the issue.

It is not a substitute for unit or integration tests ([BP-0037](/software-engineering/testing/test-first-with-agents/)); it covers the layer tests cannot reach, the assembled product. Do not build it for a library or a service with no user-facing surface, and do not let the control skill hold write permissions it does not need.

## Procedure

1. Write the control skill: start the app, reach a named screen, perform a named action, capture a trace or screenshot, read the console.
2. Make the commands and outputs fixed enough that two agents produce the same evidence for the same action.
3. Build the feature map by exploring the code and the running app: feature name, entry point, path, shortcuts, selectors.
4. Record the build or commit the map describes at the top of the file.
5. Add a maintenance trigger to the same change process that adds or moves a feature: the map and the code change together.
6. Test the map: give an agent a feature name and no other help; it must reach the feature from the map alone.
7. Attach the trace or screenshot to the report and record the build and the current-main result.
8. Review the map on a cadence, and drop entries for features that no longer exist.

## Examples

A desktop app agent receives "the right panel is laggy". It opens the feature map, finds the right panel's entry point and the panel's internal tabs, drives the app to the panel, records a trace, and attaches the flame graph. The report now says where the time goes and which build it came from, and the fix starts from evidence instead of a guess.

A web app agent receives a screenshot with no text. The map's selector table names the component and route behind the visible control. The agent drives to it, reproduces the state, and captures the console error that the screenshot could not show.

A map entry:

```yaml
feature: pull-request-review
entry: "Sidebar > Pull requests > Open a review"
path: ["/pulls", "/pulls/:id", "/pulls/:id/review"]
shortcuts: ["g p", "r"]
selectors:
  review_button: "[data-testid='start-review']"
  comment_box: "[aria-label='Review comment']"
build: 2026-11-27T08:00:00Z
```

## Anti-patterns

- A control skill that exists but no map, so the agent can drive the app and still cannot find the feature.
- A map written from memory, with no build recorded and no proof that an agent can follow it.
- A map updated months after the feature moved, so it sends the agent to a dead route.
- Screenshots pasted into chat with no trace, build or console log.
- Letting the control skill change data or send messages because it can.
- Using the control surface as a replacement for tests rather than the layer above them.

## Checklist

- [ ] The agent can drive the product as a user does, not only call unit-level code
- [ ] The control surface is a skill with fixed commands and outputs
- [ ] The feature map names each feature with its entry point, path, shortcuts and selectors
- [ ] The map records the build or commit it describes
- [ ] The map changes with the feature in the same change
- [ ] An agent has reached a feature from the map alone
- [ ] Evidence travels with the report, not only a claim
- [ ] Vague reports are mapped before they are reproduced
- [ ] The evidence records its build and whether it reproduces on current main
