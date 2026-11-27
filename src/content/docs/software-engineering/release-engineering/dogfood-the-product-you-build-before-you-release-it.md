---
title: Dogfood the product you build before you release it
description: Use the product you build on your own real work, through its published entry point and from a clean install, before you release it.
id: BP-0099
domain: D.SWE.REL
type: procedure
roles: [implementer, reviewer]
stage: [build, verify, operate]
status: draft
version: 1.0.0
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0059, BP-0072]
superseded_by: null
sources:
  - title: "Wikipedia — Eating your own dog food"
    url: https://en.wikipedia.org/wiki/Eating_your_own_dog_food
    note: The origin and definition of the term, and the practice of using your own product as its first user
  - title: "The Twelve-Factor App — X. Dev/prod parity"
    url: https://12factor.net/dev-prod-parity
    note: Why a clean, production-like environment is part of the gate rather than an optional nicety
  - title: "GitLab Handbook — Values (Dogfooding)"
    url: https://handbook.gitlab.com/handbook/values/
    note: An organisation that states dogfooding as a value and uses its own product as the first internal user
---
A product can pass every test and still fail its first user. Tests exercise the code; they rarely exercise the path a person takes to reach it: the install, the first run, the default configuration, the permission prompt, the documentation, the error text. The people closest to the build cannot see the friction, because they know the shortcut, hold the credentials and use a machine where it already works.

Dogfooding puts the builders on the user's path before release, when a gap costs a fix rather than a support ticket. These rules make the gate real: through the public door, from a clean environment, on real work, recorded, with every gap accounted for. They also keep it honest: a dogfood run adds to the automated tests and never replaces them. It complements [BP-0059](/agent-engineering/workflow/validate-with-proof-not-claims/), which proves each task as it is finished, and [BP-0072](/software-engineering/release-engineering/batch-the-release-round-trip/), which shapes what a release contains.

## Rules

### Use it through the public door

1. **MUST** use each shippable change through the entry point its users get before release: the documented install, the published interface, the advertised workflow. Internal functions, fixtures and a development environment do not count.
2. **MUST** dogfood from a clean environment: install the release artefact fresh (a clone, package, image or marketplace entry), use the default configuration, and carry no cached credentials or leftover state.
3. **MUST** run the product on real work of your own with real inputs, not a scripted demo, so the run follows the path a user takes.

### Record it and act on it

4. **MUST** record each dogfood run in the release record: the version or commit tested, the environment, the tasks run and every workaround applied.
5. **MUST** file a tracked item for each defect, workaround or documentation gap found, then fix it before release or state in the release record why it ships.

### Keep the gate honest

6. **MUST NOT** count a good dogfood run as a substitute for automated tests; it is an additional gate, and each regression it finds becomes a test.
7. **SHOULD** dogfood with a new user's access and documentation: no admin rights, no internal shortcut, only the published guide.
8. **SHOULD** keep the same dogfood task list between releases so runs stay comparable, and cover every supported platform, host or client at least once per cycle.

### Keep it in daily use

9. **MAY** keep a pre-release channel in daily use (an internal build track, an unreleased pin or a dogfood project), so the product gets real use before the public release.

## When to apply

Dogfood before any release that a user can reach, and especially when:

- A release changes the path a user walks: install, upgrade, sign-in, permissions, configuration, first-run setup or error messages.
- The product ships its first public version, or a major or breaking version.
- The builders are not the users: an agent-built product, an internal tool, or a library consumed by other teams. Nobody else will notice the friction first.
- Support requests, complaints or issue reports cluster around setup or first use.
- A demo, launch or public announcement is near.

Scale the run down; do not skip it. For a change with no user-visible surface, such as an internal refactor, the automated tests may be enough, and the release record says so. For an urgent hotfix, dogfood the changed path itself rather than the whole task list. When the product changes rarely, one run per release is enough; when the entry point changes often, run the list every cycle.

Do not use dogfooding where the gate is already stronger. A canary release or a staged rollout observes real users under real conditions and is not a substitute for the pre-release run, but it can follow it.

## Procedure

1. Write the dogfood task list from the documentation, not from the codebase: the steps a new user follows from install to a useful result.
2. Provision the clean environment: a fresh container, virtual machine or machine, with default settings and no state from your development setup.
3. Run each task in order, exactly as the documentation describes it. Stop at the first gap; record it and continue, so one run finds every gap.
4. Note friction as well as failure: a confusing step, a slow operation, an error message that does not say what to do next.
5. File a tracked item for each gap, with the command or step, the output, the version and the environment.
6. Fix the release blockers. Record each accepted gap in the release record with the reason it ships.
7. Repeat the run on the release candidate and attach the record to the release.
8. Add a regression test for every defect the run found, so the automated gate catches it next time.
9. Once per release cycle, add a platform, host or client you have not covered yet to the task list.

## Examples

- **A CLI.** Run the documented install inside a fresh container image, then follow the quickstart as printed. Not `bun run cli` or `go run` from the development checkout, where the environment supplies what a user must install.
- **An MCP server or agent tool.** Add the server to a client configuration the way the documentation says, with a placeholder credential, in a fresh configuration directory. Then ask an agent to complete a real task with it.
- **A web application.** Open a new browser profile with no cookies and no admin session. Follow the public sign-up, invite and recovery flows, and read every error on the way.
- **A library.** Build the package (`npm pack`, `pip install dist/…`), install the artefact into a fresh environment, and run the README example verbatim.
- **A workflow or service.** Use the product for the task you would otherwise do by hand that week, and count every time you reach back to the old route.

## Anti-patterns

- Running the development server and calling internal functions, then calling it dogfooding.
- Using the machine of the person who built it, with their tokens, cache and shortcuts in place.
- A scripted demo that walks the happy path with the product's own test data.
- "We use it every day" with no run against the release candidate.
- Treating a green test suite as proof that the user path works.
- Dogfooding with admin rights or an internal backdoor, so the friction a user meets stays invisible.
- Finding a gap, working around it silently, and shipping.
- Letting the dogfood channel drift so far from the release that it exercises a different product.

## Checklist

- [ ] Each shippable change is used through its published entry point before release
- [ ] The run starts from a clean install with the default configuration
- [ ] The run uses real work and real inputs, not a scripted demo
- [ ] The release record carries the version, environment, tasks and workarounds
- [ ] Every gap is a tracked item, fixed or accepted with a stated reason
- [ ] Automated tests remain the primary gate, and regressions found became tests
