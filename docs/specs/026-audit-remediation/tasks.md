# Tasks 026 — Audit remediation

- [x] **T0. Prepare and prove real Prisma compatibility (AC-10–13).** No TDD for
  pinned test manifests/configuration. Run public-API experiments against real
  SQLite clients before finalizing design; record exact results. Stop and present
  any additional loader scope or behavior contradiction to the user.
- [x] **T1. Re-export edges (AC-1–2, 15–16).** RED: adapter references and graph
  rule regressions. GREEN: collect module-bearing export declarations.
- [x] **T2. Alias resolution (AC-3–5, 15–16).** RED: config tree/graph tests.
  GREEN: compiler resolution in parser boundary and visible graph limitations.
- [x] **T3. Parse failures and graph safety (AC-6–7).** RED: malformed mixed trees
  and unsupported unused conclusions. GREEN: syntax failures and suppression.
- [ ] **T4. Pretty coverage (AC-8–9, 16).** RED: skipped/empty/scoped report tests.
  GREEN: analyzed counts and reasons using existing JSON fields.
- [ ] **T5. Prisma instrumentation (AC-10–13, 16).** RED: real-client query/request
  count and host behavior regressions. GREEN: the verified public interception
  surface; legacy path, duplicate prevention and unsupported notice.
- [ ] **T6. Documentation and close-out (AC-14–16).** Review/test shown commands;
  run full suite, typecheck, format/re-read, lint, build and rule-doc validation;
  live smoke scans/probes. Check audit items only with evidence; record deviations;
  set spec Implemented and PLAN Done only when all ACs are satisfied.

## Deviations & notes

- 2026-10-13: User approved spec recommendations OQ-1–4. Spec 025 remains an
  unapproved draft; no GitBot files are part of implementation commits.
- Baseline: 755 tests passed with local HTTP tests outside the restricted sandbox;
  previous failures were `listen EPERM`. Repeat required verification in the same
  permitted environment when necessary.
- T1: first integration test run had an incorrect config import; corrected the
  harness before observing the intended unused-file RED. Re-export cycle positions
  now use the declaration rather than a fallback location.
- T2: existing graph tests caught loss of ad-hoc `graph.resolve()` for specifiers
  absent from a source's reference list. Restored that behavior; compiler results
  for actual references remain cached. Seven new alias cases observed RED, then
  the full suite passed (764 tests). Conservative suppression covers enabled unused
  rules; resolved cycles and healthy source rules still run.
- T3: malformed TS/TSX and mixed-tree tests observed RED. The pre-existing
  unreadable-file integration assertion was updated to the approved suppression
  behavior (read notice plus three unused-rule notices, two healthy findings).
  Unreadable config (a directory at tsconfig.json) characterizes the compiler's
  already-supported failure channel; it required no further implementation.
  Syntax validation uses a no-lib/no-resolve compiler program over existing ASTs;
  a full ts-morph program unnecessarily loaded libs and slowed the suite. The
  syntax-only refactor retains all 769 passing tests and avoids extra discovery.

## Compatibility evidence

2026-10-13, Node 22.13.1 on macOS arm64:

- Prisma 6.14.0 / prisma-client-js: real SQLite proof passed 9 operations,
  including 2 attributed interactive-transaction queries. Subclass lifecycle/methods,
  app extension, lazy batch transaction, raw query, unique-constraint rejection and
  disconnect passed. Native and extended clients both fail `instanceof` on the
  subclass; methods survive in both.
- Prisma 7.0.0 / prisma-client / moduleFormat cjs / better-sqlite3 adapter 7.0.0:
  real create/count/delete queries succeeded. Generated client compiled with existing
  tsup. Its class-bearing load `./generated/built/client.cjs` does not match either
  existing hook target; zero class-bearing loads intercepted. This is a verified
  limitation, not verified zero-query coverage.
- Per spec OQ-4, asked the user to choose a separate loader feature versus expanded
  current scope. The user chose the separate specification; implement Prisma 6.14
  now and explicitly document the Prisma 7 standard-generator limitation.
