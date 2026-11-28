---
title: Configure a CLI with one predictable precedence
description: Apply settings in one documented order, put each kind of setting in the right channel, and use standard environment variables.
id: BP-0088
domain: D.SWE.CLI
type: guideline
roles: [implementer]
stage: [build]
status: draft
version: 1.0.1
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0001, BP-0033, BP-0055]
superseded_by: null
sources:
  - title: "Command Line Interface Guidelines — Configuration"
    url: https://clig.dev/#configuration
    note: Fixes the precedence of flag, environment and config file, and argues each setting belongs in one place
  - title: "Command Line Interface Guidelines — Environment variables"
    url: https://clig.dev/#environment-variables
    note: Names standard variables such as NO_COLOR, PAGER and EDITOR that a tool should read rather than reinvent
  - title: XDG Base Directory Specification
    url: https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html
    note: Defines where user configuration and data files belong on a Unix system, the path layout the rule requires
  - title: "POSIX — Environment Variables"
    url: https://pubs.opengroup.org/onlinepubs/009695399/basedefs/xbd_chap08.html
    note: "Specifies the naming rules for environment variables: uppercase letters, digits and underscores, and no leading digit"
---
The same setting can arrive four ways: a flag, an environment variable, a project file and a user file. Without a fixed order, a value that wins on one machine loses on another, and a caller cannot tell which source took effect. An agent that passes a flag needs to know that the flag wins.

These rules fix the order, give each kind of setting one channel, and pin the environment variable names. Secrets are separate: take them from a credential file, a secret manager or the environment, as [BP-0033](/security-safety/least-privilege-secrets/keep-secrets-out-of-agent-context/) requires.

## Rules

1. **MUST** apply settings in one order: flags, environment, project file, user file, system file.
2. **MUST** document the order in `--help` and use the same order in each command.
3. **MUST** use a flag for a value that changes on each run.
4. **MUST** use an environment variable for a value that changes with the session or the machine.
5. **MUST** use a version-controlled file for a value that all users of a project share.
6. **MUST** follow the XDG Base Directory Specification for user configuration and data paths.
7. **MUST NOT** change a configuration file that the program does not own without the user's consent.
8. **MUST** use only uppercase letters, digits and underscores in environment variable names, and never a digit first.
9. **MUST NOT** take a widely used environment variable name for a different meaning.
10. **MUST** read the standard variables when they apply: `NO_COLOR`, `PAGER`, `EDITOR`, `TMPDIR`, `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`.
11. **SHOULD** read project values from `.env`, and not use `.env` as a configuration file.

## When to apply

Any command with settings that a caller can change from more than one place, and any tool that writes a file in the user's home directory.

## Procedure

1. List every setting and where it can come from.
2. Put each setting in one primary channel, by how often it changes.
3. Write the precedence table into `--help`.
4. Add a test for each layer that proves the layer below it loses.
5. Store user files under the XDG directories, and read the standard variables before you add a custom one.

## Examples

```console
$ myapp run --timeout 5
# precedence: flag 5 s > MYAPP_TIMEOUT=30 > .myapp.toml 10
```

Help text carries the order:

```text
SETTINGS (highest first)
  flag          --timeout
  environment   MYAPP_TIMEOUT
  project       ./.myapp.toml
  user          ~/.config/myapp/config.toml
  system        /etc/myapp/config.toml
```

## Anti-patterns

- An environment variable that silently outranks a flag.
- Appending to `/etc/myapp.conf` on install with no consent and no dated block.
- A tool that reads `EDITOR` to mean the user's name.
- A `.env` file that holds a JSON structure or a nested list.
- A config path in the home directory that is not under `XDG_CONFIG_HOME`.

## Checklist

- [ ] One documented precedence order
- [ ] The order appears in `--help`
- [ ] Each setting has one primary channel
- [ ] XDG paths for user files
- [ ] No edit of a file the program does not own without consent
- [ ] Environment names are uppercase and do not collide
- [ ] Standard variables are honoured

