# Tasks 028 — Interactive console

Spec/OQ-1..3 approved 2026-10-13. Execute in order; commit each green task.

- [x] **T0. Approval and implementation drafts.** Record approval, design/test map,
  roadmap status. No TDD — documentation only. Run required checks and commit.
- [x] **T1. Console data/content and approved dependencies (AC-6/7/9/10/11/12/14/15/19/20).**
  RED: groups, score/coverage, shipped docs/runtime guidance, excerpt boundaries,
  prompt scope/quoting and controls. GREEN: pure view/content/prompt modules and
  dependency/config setup (No TDD for dependency declarations). REFACTOR: share
  formatting and stable ordering; verify all registered docs; full checks; commit.
- [x] **T2. Activation, progress and actions (AC-1..5/13/16/18).**
  RED: activation/flag matrix, observer report equality/stages, platform clipboard
  outcomes and workflow confirmation/protection. GREEN: mode/progress/clipboard
  adapters and action state. REFACTOR: isolate presentation failures; full checks; commit.
- [x] **T3. Ink interface and CLI lifecycle (AC-6/8/10..17/19/20).**
  RED: fake-stream keyboard/screens/resize/copy/failure/cleanup integration,
  actual CLI opt-out/machine format tests and tarball entry pin. GREEN: separate
  renderer entry, lazy loader and scan/session integration. REFACTOR: compact
  layouts, no derived-state effects, bounded scroll; full checks; commit.
- [ ] **T4. Close-out and real smoke (all AC).** Verify built and installed-tarball
  CLI in PTYs and Node 20; good/bad/zero/partial/combined reports, actual clipboard,
  documentation destinations, workflow guard, signals and UI fallback. Document
  commands/keys/score; update tasks, research, spec → Implemented, roadmap → Done.
  Run required checks, re-read formatted files, and commit.

## Deviations & notes

- None at initialization. No automatic AI-agent launch or website is in scope.
- Draft baseline: 776 tests pass; HTTP/runtime tests require a local-listen capable
  execution environment (the sandbox otherwise returns listen EPERM).
- T1: 19 new tests failed on absent modules before implementation, then passed.
  All 41 registered rule documents have Problem/Good guidance. GitHub API verified
  the repository is public with default branch main; links can use those paths.
- T2: activation/action/clipboard suites failed on absent modules and the progress
  test failed on missing events before implementation. Eleven new tests pass.
  Workflow output is injectable internally; default direct-command bytes remain
  unchanged. Keyboard confirmation and presentation-failure isolation land in T3.
- T3: navigation/session tests failed on absent modules, CLI tests on unknown
  flags and packaging on absent console entries before implementation. Nine new
  tests cover keyboard/screens/resize/cleanup and machine-output regression.
  The three fallback cases were added as characterization after CLI integration.
  Ink's cli-cursor dependency initializes one process-lifetime exit hook; session
  signal/input/resize listeners are removed and repeated sessions do not add hooks.
  A live PTY confirmed results/review screens and successful q exit.
