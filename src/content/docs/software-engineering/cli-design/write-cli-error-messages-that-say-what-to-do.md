---
title: Write CLI error messages that say what to do
description: Write error messages that name the failure and the exact fix, keep detail behind a flag, and never print half a result.
id: BP-0087
domain: D.SWE.CLI
type: guideline
roles: [implementer]
stage: [build]
status: draft
version: 1.0.0
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0001, BP-0055, BP-0073]
superseded_by: null
sources:
  - { title: Command Line Interface Guidelines — Errors, url: https://clig.dev/#errors }
  - { title: Google Technical Writing — Writing helpful error messages, url: https://developers.google.com/tech-writing/error-messages }
  - { title: Nielsen Norman Group — Error-Message Guidelines, url: https://www.nngroup.com/articles/error-message-guidelines/ }
---

An error message is the documentation a caller reads at the moment of failure. "invalid input" sends a person back to the help page and sends an agent into a retry loop with the same bad argument. A stack trace names the code path, not the fix.

These rules make the message carry the failure, the cause and the next command. [BP-0055](/agent-engineering/tool-use/prefer-api-wrapper-scripts-to-mcp/) asks a wrapper for one clear error line, and [BP-0073](/agent-engineering/tool-use/build-clis-and-mcp-servers-from-one-core/) asks an MCP tool error to say what to change; this practice gives the CLI rules behind both.

## Rules

1. **MUST** say what failed, why, and the exact command or flag that fixes it.
2. **MUST** put the most important part of the message at the end, where the eye lands last.
3. **MUST** group errors of the same kind under one heading, and not print one line for each item.
4. **MUST** keep the default error to two lines or fewer, and put detail behind `--verbose` or a debug log file.
5. **MUST** print nothing to stdout when a command fails, so a caller cannot read part of a result as a success.
6. **MUST NOT** print a stack trace or a log level label by default.
7. **MUST** give a bug report path for an unexpected error, with the version and a URL.
8. **SHOULD** use one wording for each failure in all commands.

## When to apply

Every command that can fail: argument parsing, file access, network calls, validation and partial writes.

## Procedure

1. List the failures each command can produce.
2. For each, write the sentence a person needs: what failed, why, and the fix command.
3. Decide which detail is verbose-only, and where the debug log goes.
4. Give each failure one wording, and reuse it in every command.
5. Test the message, not only the exit code: run the bad input and read the output as a caller would.

## Examples

Good:

```console
$ parts import --file parts.csv
error: parts.csv line 42 has no part number
fix: add the missing column, then run: parts import --file parts.csv
$ echo $?
1
```

Bad:

```console
$ parts import --file parts.csv
Traceback (most recent call last):
  File "parts/cli.py", line 88, in import_file
ValueError
```

The bad message gives the caller a file name and line number inside the program, and no action.

## Anti-patterns

- `ERROR: invalid input`, with no field and no value.
- A stack trace on the terminal by default, where the caller cannot use it.
- A partial result on stdout followed by a non-zero exit.
- Two subcommands that word the same failure two ways.
- A bug report path that names an internal tracker the user cannot open.

## Checklist

- [ ] Each error names the failure and the fix
- [ ] The important part is last
- [ ] Repeated errors are grouped
- [ ] Detail sits behind `--verbose` or a log file
- [ ] stdout is empty on failure
- [ ] No stack trace or log label by default
- [ ] Unexpected errors give the version and a bug report URL
- [ ] One wording per failure across commands

## References

- [Command Line Interface Guidelines — Errors](https://clig.dev/#errors)
- [Google Technical Writing — Writing helpful error messages](https://developers.google.com/tech-writing/error-messages)
- [Nielsen Norman Group — Error-Message Guidelines](https://www.nngroup.com/articles/error-message-guidelines/)
