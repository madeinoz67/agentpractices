---
title: Keep long-running commands responsive and resumable
description: Keep a command's callers informed while it works, and make the work safe to interrupt and rerun.
id: BP-0086
domain: D.SWE.CLI
type: guideline
roles: [implementer]
stage: [build]
status: draft
version: 1.0.1
updated: 2026-11-27
reviewed: 2026-11-27
review_by: 2027-05-27
related: [BP-0001, BP-0055, BP-0051]
superseded_by: null
sources:
  - title: "Command Line Interface Guidelines — Robustness"
    url: https://clig.dev/#robustness-guidelines
    note: Backs the rules on bounded cleanup, resumability and not repeating a finished side effect
  - title: "Command Line Interface Guidelines — Signals and control characters"
    url: https://clig.dev/#signals
    note: Sets the expected behaviour on Ctrl-C, including a first interrupt that stops and a second that skips cleanup
  - title: "Crash-only software — More than meets the eye"
    url: https://lwn.net/Articles/191059/
    note: The argument that a process should be safe to kill at any moment, which justifies idempotent, resumable steps
  - title: 12 Factor CLI Apps
    url: https://medium.com/@jdxcode/12-factor-cli-apps-dd3c227a0e46
    note: The twelve-factor framing behind timeouts, stderr progress and a state-changing command that can be rerun
---
A command that works for thirty seconds while printing nothing is indistinguishable from one that has hung. A person presses Ctrl-C. An agent times out and starts the command again, and the second run repeats work the first run already finished. Both leave state half changed.

These rules keep the caller informed, bound the wait, and make the work safe to kill and run again. They apply to the command itself. A dashboard that watches the job is [BP-0051](/operations/observability/observe-agent-workflows/); that practice reports to an operator, not to the person waiting at the terminal.

## Rules

1. **MUST** write a start message to stderr in 100 ms, so the process never looks hung.
2. **MUST** show the step, the position in the job and a sign of activity for each step over two seconds.
3. **MUST** show progress bars and animation only when stderr is an interactive terminal.
4. **SHOULD** provide `-q` or `--quiet` to suppress output that is not necessary, and `--verbose` or `-d` to add detail for the program authors.
5. **MUST** set a default timeout on each network operation and let the user change it with a flag.
6. **MUST** exit on the first Ctrl-C and say what stopped before cleanup starts.
7. **MUST** limit the cleanup time and let a second Ctrl-C skip cleanup, with a message that says what it leaves behind.
8. **MUST** make each state-changing command resumable or idempotent, so a second run finishes the job and does not do a side effect again.
9. **MUST** show what changed, where it changed and the next command to run after a state-changing run.
10. **SHOULD** flush the progress output before each long silent operation, so a stopped process leaves a record of its position.

## When to apply

Any command that can run longer than a couple of seconds, and every command that changes state. Command-line tools, wrapper scripts and build steps all qualify.

## Procedure

1. List each step of the command and its worst-case duration.
2. Mark each step over two seconds, and each network call.
3. Write progress output for those steps to stderr; keep stdout for data only.
4. Define the default timeout and add the flag that changes it.
5. Implement the interrupt path and the resume path. Test both: stop the command mid-run, run it again, and confirm that no side effect happens twice.

## Examples

Good:

```console
$ sync index
syncing 1284 records to https://api.example.com
  [####------] 512/1284  39%  eta 12s
done: 1284 records written, 0 failed
next: sync verify
```

Bad:

```console
$ sync index
```

The second command does the same work with no output, so a caller cannot tell it from a hang, and a stop at second 20 leaves no record of how far it got.

## Anti-patterns

- Progress on stdout, so a pipe receives it as data.
- A cleanup handler with no timeout, which hangs the Ctrl-C it was meant to honour.
- Asking "is it still running?" by watching CPU instead of printing the step.
- A retry that appends a second copy because the first run did not record what it finished.

## Checklist

- [ ] A start message reaches stderr in 100 ms
- [ ] Every step over two seconds shows step, position and activity
- [ ] Progress and animation appear only on a terminal
- [ ] Every network call has a default timeout and a flag
- [ ] Ctrl-C exits fast and says what stopped
- [ ] Cleanup is bounded and a second Ctrl-C skips it
- [ ] A second run does not repeat a finished side effect
- [ ] The final state and the next command are printed

