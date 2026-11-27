---
title: Document a CLI on the web, in the terminal and in man pages
description: Publish the same documentation to the web, the terminal and man pages, generated from one source and updated with the behaviour.
id: BP-0090
domain: D.SWE.CLI
type: guideline
roles: [implementer]
stage: [build]
status: draft
version: 1.0.1
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0001, BP-0017, BP-0071]
superseded_by: null
sources:
  - title: "Command Line Interface Guidelines — Documentation"
    url: https://clig.dev/#documentation
    note: Argues documentation belongs in the binary and on the web, generated from one editable source
  - title: "Command Line Interface Guidelines — Help"
    url: https://clig.dev/#help
    note: Sets what help text must answer and where it hands off to fuller documentation
  - title: "ronn — man page generator"
    url: https://rtomayko.github.io/ronn/ronn.1.html
    note: Converts a markdown-style source into a man page, one route to the single-source rule
---
Help text answers the immediate question. It cannot hold the full behaviour of a tool, because a long help page is unreadable in a terminal. A user who needs more searches the web or guesses, and an agent reads the source.

These rules give three surfaces: a web page with a stable URL, documentation shipped with the binary, and a man page. One source generates all three, so the installed version matches what the user reads. Keeping one source is [BP-0017](/agent-engineering/instructions-prompting/one-source-of-truth-for-agent-instructions/).

## Rules

1. **MUST** publish a web page for each command, with a stable URL that the help text links to.
2. **MUST** ship the documentation with the binary, so it works offline and matches the installed version.
3. **SHOULD** provide a man page, and make it reachable from a `help` subcommand.
4. **MUST** keep one source for the text, and generate the web page and the man page from it.
5. **MUST** document every flag, every exit code and every JSON field, so a caller never needs the source.
6. **SHOULD** include a worked example for each command, with the output.
7. **MUST** update the documentation in the same change as the behaviour.

## When to apply

Any CLI with more than a handful of commands or flags, and any tool that ships to users outside your team.

## Procedure

1. Write the reference in one editable source: markdown, a man page source, or the command definitions themselves.
2. Generate the web page and the man page from that source in the build.
3. Link each command's help text to its web page.
4. Make `mytool help <command>` show the same text that `man mytool-<command>` shows.
5. Add the docs build to the release: no release without a regenerated page.

## Examples

Help gives the short answer and the link:

```console
$ mytool sync --help
sync the local index with the remote
usage: mytool sync [--full] [--dry-run]
docs: https://example.com/mytool/sync
```

Terminal documentation matches the installed version:

```console
$ mytool help sync
$ man mytool-sync
```

## Anti-patterns

- Documentation in a wiki that only one person updates.
- A man page generated once, at the first release.
- A flag that appears in `--help` but not in the reference.
- Documentation updated after the release, so the shipped version describes different behaviour.
- An agent-visible tool with no offline documentation at all.

## Checklist

- [ ] A web page per command with a stable URL
- [ ] Documentation ships with the binary
- [ ] A man page is reachable from `help`
- [ ] One source generates the web and man pages
- [ ] Every flag, exit code and JSON field is documented
- [ ] Each command has a worked example
- [ ] Docs change with the behaviour in the same change

