---
title: Design CLIs for agents and humans
description: Build command-line tools an agent can drive reliably and a person can still use comfortably.
id: BP-0001
domain: D.SWE.CLI
type: guideline
roles: [implementer]
stage: [build]
status: draft
version: 1.0.0
updated: 2026-11-24
related: [BP-0007]
sources:
  - { title: Command Line Interface Guidelines, url: https://clig.dev/ }
  - { title: 'POSIX Utility Conventions', url: https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap12.html }
---

## Rules

1. **MUST** provide `--json` with a stable, documented schema on every command that outputs data.
2. **MUST** write data to stdout and diagnostics, progress and prompts to stderr.
3. **MUST** never block on a prompt when stdin is not a TTY; fail with a clear message and a non-zero exit code instead.
4. **MUST** accept every input as a flag or argument; interactive prompts are a convenience, not the only path.
5. **SHOULD** return distinct, documented exit codes (`0` success, `1` failure, `2` usage error; others listed in `--help`).
6. **SHOULD** offer `--dry-run` on every command that changes state, and `--yes` to skip confirmation explicitly.
7. **SHOULD** make `--help` complete and example-led, and keep it in step with behaviour.
8. **SHOULD** make output deterministic: stable ordering, no colour or spinners when not a TTY, honour `NO_COLOR`.
9. **MAY** offer an interactive or TUI mode behind an explicit flag.

## When to apply

Any CLI an agent may call: your own tools, wrappers around APIs, build and ops scripts. Not needed for one-off throwaway scripts that will never be invoked by another program.

## Procedure

1. List the commands and, for each, what it reads and what it changes.
2. Define the `--json` shape per command before writing human output.
3. Define the exit-code table.
4. Implement; human output is a rendering of the same data.
5. Test with stdin closed (`</dev/null`) and stdout piped to confirm nothing blocks or leaks ANSI codes.

## Examples

Good:

```console
$ parts list --json
[{"id":"R-10K","qty":120}]
$ echo $?
0
```

Bad:

```console
$ parts list
✨ Found 1 part! ✨
  R-10K .... 120 left
Continue? [y/N]
```

The bad version mixes decoration with data, has no machine format, and blocks an unattended caller.

## Anti-patterns

- Parsing your own human-readable output in tests or other tools instead of using `--json`.
- Exit code `0` on partial failure.
- Changing JSON field names in a minor release.

## Checklist

- [ ] Every data command has `--json`
- [ ] Runs unattended with stdin closed
- [ ] Exit codes listed in `--help`
- [ ] State-changing commands support `--dry-run`

## References

- [Command Line Interface Guidelines](https://clig.dev/)
- [POSIX Utility Conventions](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap12.html)
