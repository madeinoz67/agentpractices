---
title: Evolve a CLI without breaking its callers
description: "Treat a CLI's names, exit codes and output as a contract: change additively, warn before deprecation, and keep a changelog."
id: BP-0091
domain: D.SWE.CLI
type: guideline
roles: [implementer, reviewer]
stage: [build, verify, operate]
status: draft
version: 1.0.0
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0001, BP-0071]
superseded_by: null
sources:
  - { title: Command Line Interface Guidelines — Future-proofing, url: https://clig.dev/#future-proofing }
  - { title: Semantic Versioning 2.0.0, url: https://semver.org/ }
---

A command name, a flag name, a flag meaning and an exit code are an interface. A script or an agent depends on each of them. A rename without notice breaks every caller at once, and the caller sees a failure that does not name the cause. [BP-0071](/software-engineering/api-interface-design/design-and-evolve-api-surfaces/) gives this discipline for HTTP and RPC surfaces; a CLI needs the same rules.

`--json` and a stable schema are [BP-0001](/software-engineering/cli-design/design-clis-for-agents/) rule 1. This practice covers what happens after release: additive change, deprecation and the record of the change.

## Rules

1. **MUST** treat command names, flag names, flag meanings and exit codes as a public contract.
2. **MUST** make a change additive where possible: add a flag or a field, and do not rename or remove one.
3. **MUST** warn in the program when a caller uses a deprecated flag, and name the replacement.
4. **MAY** change the human output at any release, because a caller that needs stable output uses `--json`.
5. **MUST NOT** remove or rename a flag without a deprecation period of at least one minor release, stated in the changelog.
6. **MUST** record each CLI change in the changelog, including a change to a default or to the output.
7. **SHOULD** run a compatibility check in CI that compares the flag set and the JSON schema with the previous release.

## When to apply

Any released CLI that another script, agent or person calls. Review pull requests that change a flag, a default, an exit code or the JSON shape.

## Procedure

1. Record the released flag set, defaults, exit codes and JSON schema.
2. For each change, decide whether it is additive.
3. For a non-additive change, add the new form first and warn on the old one, naming the replacement.
4. Set the removal release in the changelog, and keep the warning until then.
5. Run the compatibility check in CI and fail on an unplanned break.

## Examples

Deprecation in the program, with the replacement:

```console
$ mytool list --all
warning: --all is deprecated and will be removed in 3.0. use --include-archived
```

The changelog entry names the release and the action:

```text
2.4.0  add --include-archived; deprecate --all (removal in 3.0.0)
```

## Anti-patterns

- A flag renamed in a patch release.
- A flag removed with no warning and no changelog line.
- A blog post as the only record of a breaking change.
- A CI check that compares versions but not the flag set.
- A deprecation warning that names the flag but not its replacement.

## Checklist

- [ ] The contract is written down
- [ ] Changes are additive where possible
- [ ] Deprecated flags warn and name the replacement
- [ ] Human output is free to change, `--json` is not
- [ ] Removal has a stated deprecation period
- [ ] Every CLI change is in the changelog
- [ ] CI compares the flag set and JSON schema

## References

- [Command Line Interface Guidelines — Future-proofing](https://clig.dev/#future-proofing)
- [Semantic Versioning 2.0.0](https://semver.org/)
