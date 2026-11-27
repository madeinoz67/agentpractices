---
title: Name CLI flags and subcommands so callers can guess them
description: Use the standard flag names, long forms and noun-verb subcommands that callers already expect, and never alias a prefix.
id: BP-0094
domain: D.SWE.CLI
type: guideline
roles: [implementer]
stage: [build]
status: draft
version: 1.0.0
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0001, BP-0055, BP-0071]
superseded_by: null
sources:
  - { title: Command Line Interface Guidelines — Arguments and flags, url: https://clig.dev/#arguments-and-flags }
  - { title: Command Line Interface Guidelines — Subcommands, url: https://clig.dev/#subcommands }
  - { title: Command Line Interface Guidelines — Help, url: https://clig.dev/#help }
  - { title: GNU Coding Standards — Command-Line Interfaces, url: https://www.gnu.org/prep/standards/html_node/Command_002dLine-Interfaces.html }
---

An agent calls a CLI without a full help read. It guesses the usual names: `--json`, `--dry-run`, `--quiet`, `-h`. A tool that invents `--format json` or `--simulate` costs the agent a help read and one more turn. A person has the same problem when a tool uses a different word for the same idea in each subcommand.

These rules keep the names a caller can guess. [BP-0001](/software-engineering/cli-design/design-clis-for-agents/) sets the behaviour a CLI must have; this practice sets the names it uses, and [BP-0091](/software-engineering/cli-design/evolve-a-cli-without-breaking-its-callers/) covers changing them later.

## Rules

1. **MUST** give each flag a long form, and add a short form only for a flag that callers use often.
2. **MUST** use the standard name when a standard name exists, for example `--json`, `--dry-run`, `--quiet`, `--verbose`, `--force` and `--output`.
3. **MUST NOT** give `-h` a meaning other than help.
4. **MUST** name subcommands as `noun verb`, with one verb set for all objects.
5. **MUST NOT** create subcommand names that are easy to confuse, such as `update` and `upgrade`.
6. **MUST NOT** accept a prefix of a subcommand name as an alias.
7. **MUST NOT** make a catch-all subcommand for input that is not a known subcommand.
8. **SHOULD** accept a flag before or after the subcommand with the same meaning.
9. **MUST** suggest the near-miss command when the input is close to a known command, and **MUST NOT** run the suggestion until the caller confirms it.

## When to apply

Adding a flag, a command or a subcommand, and reviewing a CLI that callers keep misusing.

## Procedure

1. Write the invocation a caller types for the common job, and name everything in it.
2. Check each flag against the standard list; rename a flag that has a standard equivalent.
3. Give every flag a long form. Add a short form only where callers use the flag often.
4. Name subcommands `noun verb`, and use one verb set for every object.
5. Test a near-miss command, and a flag on either side of the subcommand.
6. Read the help for two names a caller can confuse.

## Examples

Good:

```console
$ parts list --json --quiet
$ parts list -q
$ parts help list
```

Bad:

```console
$ parts list --format json --silent
```

The bad form uses two names a caller has to look up, where the standard names already exist.

Subcommands follow one shape:

```console
$ parts create --name R-10K
$ parts delete R-10K
```

## Anti-patterns

- `--format json` where `--json` is the standard.
- `-h` used for host or history.
- `update` and `upgrade` as separate commands.
- A catch-all: any input that is not a known subcommand runs `run`.
- `mytool ins` as an implicit alias for `install`, which blocks every future command that starts with `ins`.

## Checklist

- [ ] Every flag has a long form
- [ ] Short forms exist only for common flags
- [ ] Standard names are used where they exist
- [ ] `-h` means help and nothing else
- [ ] Subcommands are `noun verb` with one verb set
- [ ] No two subcommand names are easy to confuse
- [ ] No prefix alias and no catch-all subcommand
- [ ] Flags work on either side of the subcommand
- [ ] A near-miss suggestion waits for the caller to confirm

## References

- [Command Line Interface Guidelines — Arguments and flags](https://clig.dev/#arguments-and-flags)
- [Command Line Interface Guidelines — Subcommands](https://clig.dev/#subcommands)
- [Command Line Interface Guidelines — Help](https://clig.dev/#help)
- [GNU Coding Standards — Command-Line Interfaces](https://www.gnu.org/prep/standards/html_node/Command_002dLine-Interfaces.html)
