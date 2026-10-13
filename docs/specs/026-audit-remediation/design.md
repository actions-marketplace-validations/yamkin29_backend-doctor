# Design 026 — Audit remediation

Status: implementation verified through T5. Real-client proof required by spec 026 has run;
the user deferred the Prisma 7 standard-generator loader to a separate specification.
Runtime follow-up: the user approved the T5 correction after `$extends` was found
to hide native `$on`. Return a Proxy over the native client, delegate query access
to its extended client, and retain native `$on`. Event subscriptions, subclass
private fields and the full real-client behavior suite now pass in CJS and ESM.

## Module layout

- `src/engine/parser/ts-morph-adapter.ts`: re-export references, syntax diagnostics,
  nearest-package tsconfig discovery and compiler-backed module resolution.
- `src/engine/parser/types.ts`: parser-neutral resolution metadata; retain explicit
  file collection and existing AST vocabulary.
- `src/engine/imports.ts`: consume adapter resolution, retain relative fallback for
  structural test sources, and expose graph limitations.
- `src/engine/project-rules.ts`, `src/core/scan.ts`: propagate resolution/read
  failures and visibly suppress unused conclusions when coverage is incomplete.
- `src/reporters/pretty.ts`: counts and skipped checks, including empty reports.
- `src/probe/hook.ts`: modern public query extensions if proven transparent;
  retain legacy middleware and instrumentation idempotence.
- README, CLI help, shipped skill, RESEARCH: coverage and verified compatibility.
- `tests/compat/prisma6`, `tests/compat/prisma7`: isolated pinned real clients,
  disposable SQLite databases, compatibility proof scripts and evidence.

## Key decisions

1. Read syntax diagnostics, not semantic diagnostics. Type checking would expand
   the analyzer's scope and can reject otherwise valid fixture code.
2. Resolve aliases with the TypeScript compiler already exposed by ts-morph;
   do not implement a second paths-pattern matcher. Never use tsconfig to select
   analyzed files or add dependencies to the project automatically.
3. Suppress enabled unused-file/export/dependency rules if graph evidence is
   incomplete, with per-check reasons. Keep cycles and healthy-file rules because
   resolved evidence can still establish their findings.
4. Preserve `complete` as a scope indicator; show coverage using existing fields.
   JSONL remains diagnostic-only, so coverage consumers must choose JSON.
5. Prisma 6.14.0 public `$extends` interception passed model/raw, lazy batch and
   interactive transaction, subclass lifecycle/methods, application client extension,
   rejection, cleanup and CJS/ESM import checks. Both native and extended instances
   already fail `instanceof PrismaService`; this is not instrumentation-induced.
   Do not depend on private runtime APIs or require application edits.
6. Prisma 7.0.0's standard `prisma-client` generator was generated, compiled to CJS
   and used against SQLite. The only export containing its client class loaded as
   `./generated/built/client.cjs`; no class export matched the current interception
   targets. The user chose a separate loader specification under OQ-4. This feature
   implements verified Prisma 6.14 instrumentation and documents that Prisma 7
   standard-generator queries are not intercepted, including a collector notice.
7. `$extends` hides native `$on` with a non-configurable undefined property, so
   the probe returns a Proxy over the native client instead of the extended target.
   Reads of `$on` stay native; other reads delegate to the query extension. Writes,
   subclass initialization and property ownership stay on the native target.
   The user explicitly approved this correction on 2026-10-13. Identical native
   and instrumented scenarios verify event delivery, private subclass fields,
   application extensions, transactions, errors and cleanup in CJS and ESM.

## Dependencies and proof preparation

No production dependencies change. The approved test-only installations are
isolated from the main package and its lockfile:

- Prisma 6: `prisma@6.14.0`, `@prisma/client@6.14.0`, `prisma-client-js`, SQLite.
- Prisma 7: `prisma@7.0.0`, `@prisma/client@7.0.0`,
  `@prisma/adapter-better-sqlite3@7.0.0`, SQLite; inspect both generated loading
  route and the existing package loading route. Native adapter installation is
  test preparation only.

Each harness is private, pinned and has its own lockfile. Generated clients,
node_modules and SQLite data are disposable and ignored. Proof scripts must test
construction, CJS/ESM, subclass methods/lifecycle, app extensions, model/raw queries,
batch/interactive transactions, rejection and disconnect. No private database
or network is used during the proof queries.

The harness directory is excluded from the analyzer's own TypeScript project:
generated clients and independently pinned tooling have separate compile contexts.
Prisma 6.14 schema-engine rejected a missing SQLite file with an empty error; creating
the disposable empty file before `db push` succeeds. See harness README for commands.

## Test map

| AC | Test evidence |
| --- | --- |
| 1–2 | Parser re-export tests; graph reachability/cycle integration tests |
| 3–4 | Temporary trees with exact/wildcard/fallback/inherited/nested configs |
| 5 | Invalid/unreadable configs and unresolved/ignored internal targets; visible suppression |
| 6–7 | Malformed TS/TSX, read failures, mixed healthy/broken scans |
| 8–9 | Pretty counts/skips, zero-file and scoped-empty CLI reports |
| 10–11 | Real SQLite compatibility proof and runtime regression harness |
| 12–13 | Double-load, unsupported client, remaining-collector tests |
| 14 | Documentation review against proven matrix and real CLI commands |
| 15 | Repeated scans and existing eval golden/precision tests |
| 16 | Existing config, exports, report, scope, exit-code and probe tests |
