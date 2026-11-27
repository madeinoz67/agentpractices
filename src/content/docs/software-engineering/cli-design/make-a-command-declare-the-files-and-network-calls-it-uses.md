---
title: Make a command declare the files and network calls it uses
description: Name every file a command reads or writes and every host it calls, before the boundary is crossed.
id: BP-0092
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
  - { title: Command Line Interface Guidelines — Output, url: https://clig.dev/#output }
  - { title: Command Line Interface Guidelines — Configuration, url: https://clig.dev/#configuration }
---

A command that reads a config file the caller did not name, or calls a remote service, can surprise a person and break an agent's assumptions. The caller cannot predict the side effects, and a permission rule cannot allow the right host if the host is not declared.

These rules make each boundary explicit before it is crossed. Where the configuration lives is [BP-0088](/software-engineering/cli-design/configure-a-cli-with-one-predictable-precedence/); this practice covers what the command touches.

## Rules

1. **MUST** read and write only the paths given as arguments, plus its own state directories.
2. **MUST** name each additional file it reads or writes, in the help text and in the JSON output.
3. **MUST** announce a network call on stderr before it starts, with the host.
4. **SHOULD** accept an `--offline` flag for each command that can make a network call.
5. **MUST** list the external services a command uses in its help text.

## When to apply

Any command that reads configuration, writes state, or calls a network service. Review a new command for boundaries the caller cannot see.

## Procedure

1. List the files and hosts the command touches, by path and host name.
2. Move each hidden path under a state directory, or take it as an argument.
3. Add the remaining paths and hosts to the help text.
4. Print the host before each network call.
5. Add `--offline` where a call is optional, and test the command with it.

## Examples

Help states the boundaries:

```console
$ mytool index --help
reads:  ./mytool.toml, ~/.local/state/mytool/index.db
calls:  index.example.com
flags:  --offline   do not call the index service
```

The call announces itself before it starts:

```console
$ mytool sync
calling index.example.com ...
```

## Anti-patterns

- Reading `~/.toolrc` without saying so.
- A telemetry call on every command that the help does not mention.
- A cache written outside the XDG directories.
- A network call that fails after a long silence, with no host in the message.
- A `--offline` flag that only suppresses some of the calls.

## Checklist

- [ ] Only argument paths and state directories are touched
- [ ] Additional files are named in help and JSON
- [ ] Each network call prints its host first
- [ ] `--offline` exists where a call is optional
- [ ] External services are listed in the help text

## References

- [Command Line Interface Guidelines — Output](https://clig.dev/#output)
- [Command Line Interface Guidelines — Configuration](https://clig.dev/#configuration)
