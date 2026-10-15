# Security Policy

## Supported versions

Security fixes land on the latest published minor release line of
`backend-doctor-cli`. Older release lines do not receive backports — upgrade
to the newest release.

## Reporting a vulnerability

Please use **GitHub's private vulnerability reporting** on this repository
(Security → Report a vulnerability). Do not open a public issue for anything
you believe is exploitable.

Useful in a report:

- The `backend-doctor-cli` version and the command line you ran.
- Node.js version and OS.
- A minimal repository tree / input that triggers the problem.

## What counts as a security issue here

Static analysis parses application source files without executing them.
Loading a TypeScript or JavaScript `backend-doctor.config.*` file executes
that module and its imports with the CLI process's permissions. Treat
executable configuration files as trusted code.

The runtime probe intentionally starts the command you provide and instruments
the application. It does not sandbox the application: your app retains its
normal filesystem, network and database access. The probe itself stores traces
locally and does not upload them.

Relevant attack surfaces include:

- **The scanner** — a crafted source tree that makes the CLI write outside
  its working directories, execute unintended code, or crash in a way that hides
  findings (constitution: silent suppression is a defect).
- **The runtime probe** (`backend-doctor probe`) — unauthorized trace uploads
  by the probe, the `--require` hook executing unintended code, or
  `NODE_OPTIONS` mishandling. Network requests made by the application itself
  are part of running that application.
- **CI surfaces** (`backend-doctor ci report`, the composite action) —
  injection through a crafted scan report or PR context into workflow
  steps, comment bodies, or API calls.
- **Config loading** — unexpected modules loaded outside documented config
  discovery or explicit `--config` selection, or code execution caused by
  data-only JSON configuration.

## What is not a security report

- A rule **misses** a pattern (detection gap) or **flags** correct code
  (false positive) — those are quality issues, please open a regular issue
  (false positives are the highest-priority kind). Rule evasion by clearly
  malicious code is expected: the tool is a linter, not a sandbox.
- Crash-with-exit-code-2 usage errors.

## Disclosure

We will acknowledge reports, work on a fix, and credit you in the release
notes unless you prefer to stay anonymous. Please give us a reasonable
window to publish a fixed version before public disclosure.
