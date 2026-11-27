---
title: Distribute a CLI so it is easy to install and remove
description: Ship a CLI as one clean install with a documented removal, no silent telemetry and no dependency on a service that can vanish.
id: BP-0089
domain: D.SWE.CLI
type: guideline
roles: [implementer]
stage: [build]
status: draft
version: 1.0.0
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0001, BP-0044, BP-0071]
superseded_by: null
sources:
  - { title: Command Line Interface Guidelines — Distribution, url: https://clig.dev/#distribution }
  - { title: Command Line Interface Guidelines — Analytics, url: https://clig.dev/#analytics }
  - { title: Command Line Interface Guidelines — Future-proofing, url: https://clig.dev/#future-proofing }
  - { title: SLSA — Supply-chain Levels for Software Artifacts, url: https://slsa.dev/ }
---

A CLI is installed on a machine you do not control and removed by someone who may not remember installing it. Files scattered outside the package manager, a runtime the user must add, or a phone-home call on first run all make the tool hard to trust. An agent installs tools as part of a task, so a bad install becomes a bad run.

These rules give one clean install, a documented removal, and an explicit answer on data that leaves the machine. Dependencies and supply-chain review are [BP-0044](/security-safety/supply-chain/vet-and-pin-agent-dependencies/).

## Rules

1. **MUST** distribute one binary where the language compiles, and the native package format otherwise.
2. **MUST** write only to the package manager paths, the XDG directories, or a directory that the user names.
3. **MUST** show the uninstall command next to the install command.
4. **MUST** print a version that a script can read for `--version`.
5. **MUST NOT** send usage data or crash data without explicit consent.
6. **SHOULD** publish what data it collects, why, and how long it keeps the data.
7. **MUST NOT** need a remote service that the vendor controls for the tool to start.
8. **SHOULD** sign each release artifact and publish a checksum with the release.

## When to apply

Publishing any command-line tool that other people install, including a wrapper you ship to agents.

## Procedure

1. Choose the artifact: one binary, or the platform package format.
2. List every path the program writes and put each under a sanctioned root.
3. Write the install and uninstall steps in one place, next to each other.
4. Decide the telemetry answer, and write the disclosure before the code.
5. Check that a new machine can run the tool with no account and no network.
6. Sign the artifact and publish the checksum with the release.

## Examples

```console
$ install mytool
installed 1 file: /usr/local/bin/mytool
to remove: rm /usr/local/bin/mytool

$ mytool --version
mytool 2.4.0
```

Telemetry, when it exists, is opt-in and stated before the first send:

```console
$ mytool init
usage data is off. to share anonymous crash counts, run: mytool telemetry on
```

## Anti-patterns

- An install script that writes to `/usr/local/bin`, `~/.mytool` and `/etc` with no record.
- A silent background updater that changes behaviour between runs.
- Usage analytics on by default.
- A licence server that must answer before the tool starts.
- An uninstall that leaves cache and config files behind with no flag to remove them.

## Checklist

- [ ] One binary or the native package
- [ ] Writes only to sanctioned paths
- [ ] Uninstall documented next to install
- [ ] `--version` is script-readable
- [ ] No telemetry without consent
- [ ] What is collected is published
- [ ] The tool starts with no vendor service
- [ ] Release artifact is signed and has a checksum

## References

- [Command Line Interface Guidelines — Distribution](https://clig.dev/#distribution)
- [Command Line Interface Guidelines — Analytics](https://clig.dev/#analytics)
- [Command Line Interface Guidelines — Future-proofing](https://clig.dev/#future-proofing)
- [SLSA — Supply-chain Levels for Software Artifacts](https://slsa.dev/)
