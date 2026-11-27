---
title: Choose a CLI name and argument shape that callers can remember
description: Choose a command name callers can type and an argument shape that can grow without ambiguity.
id: BP-0093
domain: D.SWE.CLI
type: guideline
roles: [implementer]
stage: [plan, build]
status: draft
version: 1.0.0
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0001, BP-0055]
superseded_by: null
sources:
  - { title: Command Line Interface Guidelines — Naming, url: https://clig.dev/#naming }
  - { title: Command Line Interface Guidelines — Arguments and flags, url: https://clig.dev/#arguments-and-flags }
  - { title: GNU Coding Standards — Command-Line Interfaces, url: https://www.gnu.org/prep/standards/html_node/Command_002dLine-Interfaces.html }
---

A command name is typed all day. A name that is hard to type, or too generic, collides with other tools. A program that takes positional arguments for different things cannot grow without ambiguity, and a caller must remember the order. [BP-0001](/software-engineering/cli-design/design-clis-for-agents/) covers what a flag must do; this practice covers the command name and the shape of its input.

## Rules

1. **MUST** use a short, lowercase command name with no capital letters, and dashes only where necessary.
2. **MUST NOT** use a name that a common system command already uses.
3. **MUST** prefer a flag over a positional argument for anything that a caller may want to name.
4. **MUST** use positional arguments only for one kind of thing that a caller can repeat, such as a list of files.
5. **MUST** accept the shell's file expansion, so that `cmd *.txt` works.
6. **MUST** give an optional-value flag a word that means none, and not an empty value.
7. **SHOULD** make the default behaviour correct for most callers, so that the common case needs no flag.

## When to apply

Naming a new tool, and adding a command or a positional argument to an existing one.

## Procedure

1. Check the name against the commands on a default system, and against the vendor's other tools.
2. Write the invocation a caller will type most often, and make the default produce it.
3. Decide which values are positional and which are flags. Keep positional arguments to one repeatable kind.
4. Test with a glob, with no arguments and with a value that means none.
5. Write the name and the shape into the help text before the code.

## Examples

Good, one repeatable kind and a flag for the option:

```console
$ parts verify *.txt --strict
```

Bad, two positional arguments with different meanings and an order to remember:

```console
$ parts move old-dir new-dir
```

The bad form cannot add a third kind of input later without ambiguity.

## Anti-patterns

- `DownloadURL` for a command name.
- A name that a common system command already uses, such as `convert`.
- `mytool install src dst`, where `src` and `dst` are different kinds of input.
- A flag that takes an empty value to mean none, so the parser cannot tell it from a missing value.
- An implicit alias, such as `mytool ins` for `install`, which blocks every future command that starts with `ins`.

## Checklist

- [ ] The name is short and lowercase
- [ ] The name does not collide with a system command
- [ ] Flags carry named values
- [ ] Positional arguments are one repeatable kind
- [ ] A glob works as input
- [ ] A "none" word exists for optional flag values
- [ ] The common case needs no flag

## References

- [Command Line Interface Guidelines — Naming](https://clig.dev/#naming)
- [Command Line Interface Guidelines — Arguments and flags](https://clig.dev/#arguments-and-flags)
- [GNU Coding Standards — Command-Line Interfaces](https://www.gnu.org/prep/standards/html_node/Command_002dLine-Interfaces.html)
