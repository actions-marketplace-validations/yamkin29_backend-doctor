# Spec 026 — Audit remediation (F026)

- **Status:** Implemented
- **Phase:** 6 — Quality & release
- **Depends on:** F003, F013, F015, F017, F020, F022, F023 (Done)
- **Blocks:** Proposed GitBot integration (draft spec 025)
- **Scope anchor:** The user's request to fix all findings from
  `docs/AUDIT.md`, with a separate plan. This is a maintenance follow-up to
  completed features, not the planned oxc parser migration.

## Problem

The audit found graph false positives, hidden skipped work, missing parse-error
reporting, and Prisma instrumentation relying on a removed API. Existing tests
pass but do not cover these cases. Resolve the reproduced failures and make
coverage and compatibility limits explicit before building an automatic repair
bot on top of the reports.

## Verified facts and sources

- `src/engine/parser/ts-morph-adapter.ts` collects imports, literal `require`,
  and dynamic imports, but not re-exports; creates ASTs without inspecting
  syntax diagnostics; does not consult tsconfig.
- `src/engine/imports.ts` resolves relative specifiers against analyzed files.
  `unused-export` separately understands re-export usage, but reachability
  does not receive those edges.
- `src/core/scan.ts` reports file-loading failures as `check: "read"` and
  sets `complete` solely from scope. Partial scans explicitly skip project rules.
- `src/reporters/pretty.ts` displays diagnostics but not skipped checks/counts.
  JSONL deliberately serializes only diagnostics.
- `src/probe/hook.ts` intercepts `@prisma/client`/`.prisma/client` through
  `Module._load`, requires `$use` on the client's prototype, and records
  model/action/timing without SQL or query arguments. Its tests use a fake client.
- [Prisma 6.14.0 release](https://github.com/prisma/orm/releases/tag/6.14.0)
  confirms `$use` removal.
  [Query extensions](https://www.prisma.io/docs/orm/v6/prisma-client/client-extensions/query)
  document `$extends` interception of model and raw operations.
  [The v7 upgrade guide](https://www.prisma.io/docs/orm/v6/more/upgrades/to-v7)
  documents changed client generation/runtime requirements. These are reference
  points for compatibility validation, not proof our hook already supports them.
- `SUPPORTED_EXTENSIONS` contains `.ts/.tsx/.mts/.cts`. Rule defaults are warnings;
  scan exit 0 can contain findings. These are intentional current contracts.

## Goals

- A01: include re-exports in the graph used for reachability and cycles.
- A02: resolve common TypeScript path aliases without changing file selection.
- A03: expose skipped work and analyzed-file counts in the default report.
- A04: visibly handle malformed source while continuing on healthy files.
- A05: replace the `$use`-only compatibility assumption with verified modern
  instrumentation and a documented support matrix.
- Address the TypeScript-only and exit-0 UX notes through accurate output/docs.
- Add regression coverage, preserve deterministic static output, and update the
  audit checklist only when a finding is verified as resolved.

## Non-goals

- GitBot implementation, installation, publication, or replies to Sahil; spec 025
  owns the proposed integration after this maintenance work.
- oxc migration; the existing Engine v2 roadmap item owns it.
- Full typechecking, workspace/project-reference discovery, arbitrary bundler
  alias plugins, or scanning additional packages automatically. Future resolver
  work owns those expansions.
- Full JavaScript analysis. A separately approved feature owns `.js/.cjs/.mjs`
  support; this repair makes current coverage clear (OQ-2).
- Other ORMs, HTTP/2, hosted tracing, new analyzer rules, or telemetry.
- Changing exit codes, schemaVersion, config names/precedence, exports, or
  default rule severities. There is no runtime dependency proposal.

## User stories

1. **Backend developer:** My barrel files and TypeScript aliases do not cause
   false unused-code reports, and the terminal tells me about files/checks
   that could not be analyzed.
2. **CI author:** Existing exit codes and report formats remain usable; tests
   verify both clean projects and projects with visibly incomplete analysis.
3. **AI agent:** I read `skippedChecks`, understand coverage boundaries, and
   do not treat exit 0 or a zero-file scan as proof that the backend is clean.

## Contract / Model

### A01 — Module edges

Include literal specifiers from named re-exports, `export * from`, and
namespace re-exports alongside the existing forms. Reuse existing extension
and index resolution; local `export { name }` without a module is not an edge.
Do not infer dependencies from comments or arbitrary strings.

### A02 — Alias resolution

Use the nearest applicable `tsconfig.json` within the current package boundary
for the importer, respecting supported TypeScript `baseUrl`, `paths`, and
inherited options. Exact keys, single-wildcard keys, ordered target fallbacks,
and config-relative origins must be covered. Use compiler-backed resolution
inside the parser boundary rather than exposing compiler types to rules.

The analyzed set still comes from existing file collection/scope/ignore logic;
config `include`/`exclude` must not silently replace that selection. Resolved
edges must target analyzed files. External packages remain external; an alias
that resolves to a source file must not be treated as an unused npm dependency
merely because it has a bare specifier.

Missing tsconfig is normal. Invalid/unreadable config or an unresolved declared
alias must produce a stable `skippedChecks` explanation. On unresolved known
internal edges, suppress affected unused-code conclusions with a visible
reason instead of guessing that the files/exports are unused. Valid resolved
portions may continue to yield evidence-backed findings.

### A03/A04 — Coverage and parse failures

Use existing `projects[].skippedChecks` entries with `check`/`reason` and
analyzed file counts. Preserve `complete`'s existing full-scope meaning (OQ-1):
it does not promise all checks succeeded. Preserve JSON shape and JSONL's
diagnostics-only contract.

The pretty report must show analyzed counts and each skipped-check reason,
including runs with zero findings. A zero-analyzed-file run must explicitly
say that no supported source files were analyzed, without declaring the code
clean. Scoped scans with no changed supported files remain successful empty
scans and must not be mislabeled as corrupt projects.

Inspect syntax diagnostics in the adapter. Exclude malformed files from rule
execution/model extraction; record a stable path and 1-based error position
in `reason` using the existing loading-failure/report channel. Continue to
analyze healthy files. Avoid unused-code claims derived from a graph broken
by a skipped source; report any suppressed project checks visibly. Do not
add type errors to a syntax-only analyzer.

Exit 0/1/2 semantics remain unchanged; parse/coverage notices are not new
error-severity rules. Pretty output may change to expose coverage. Static
reports for identical trees/configs must remain byte-identical across runs.

### A05 — Prisma runtime compatibility

Support the existing client-loading surface with modern query instrumentation
where `$use` is absent, using a public supported client API. Preserve a tested
legacy path when appropriate. Keep per-request ALS attribution, model/action,
success/rejection timing, raw queries, and one count per executed operation.
Do not record SQL, arguments, results, or credentials.

Before finalizing implementation design, perform a compatibility proof using
a real Prisma 6.14.0 client and local disposable SQLite data (OQ-3). Exercise
client construction, CJS/ESM consumption, Nest-style subclass methods,
application extensions, transactions, errors, and cleanup. Instrumentation
must preserve host results/errors and client behavior; a synthetic fake client
alone cannot establish this.

Then test a pinned Prisma 7 configuration and its generated-client loading
route. Do not claim support for an untested or unreachable generation mode.
If supporting it needs a new loader hook or violates zero intrusion, stop,
record the evidence and present that extra scope to the user (OQ-4). Document
supported versions/generators and remaining limitations precisely.

Clients without a supported interception surface must get a visible collector
notice; other collectors must keep working. Unsupported combinations cannot
be represented as verified zero-query runs in documentation. Preserve existing
runtime event/session/findings schemas and probe exit-code behavior.

Correct the overbroad `$use` compatibility claim in RESEARCH and user docs.
Historical specs remain historical; this spec records the changed contract.

### Documentation notes

Clarify static TypeScript-only support in README/scan help and the agent skill.
Explain that exit 0 permits warnings, JSONL emptiness provides no skipped-check
metadata, and JSON should be used when coverage matters. Validate every shown
command against the actual CLI. No global replacement of rule severities.

## EARS acceptance criteria

- **AC-1:** WHEN a file is used through a named or wildcard re-export chain,
  THE SYSTEM SHALL include its edges in reachability without reporting it unused.
- **AC-2:** WHEN a re-export edge forms a cycle, THE SYSTEM SHALL report the
  cycle with deterministic positions/order.
- **AC-3:** WHEN an analyzed import resolves through supported tsconfig alias
  options, THE SYSTEM SHALL use that target in graph/usage analysis.
- **AC-4:** WHEN compiler options are inherited, THE SYSTEM SHALL resolve alias
  targets relative to their declared config origins.
- **AC-5:** WHEN known internal resolution or tsconfig reading fails, THE SYSTEM
  SHALL report that limitation instead of emitting unsupported unused conclusions.
- **AC-6:** WHEN a source cannot be read or parsed, THE SYSTEM SHALL skip its
  analysis and expose its path/reason in the report.
- **AC-7:** WHEN other healthy sources remain, THE SYSTEM SHALL continue their
  analysis after a file-loading failure.
- **AC-8:** WHEN a report contains skipped checks, THE SYSTEM SHALL display them
  in pretty output even when there are no diagnostics.
- **AC-9:** WHEN zero supported files are analyzed, THE SYSTEM SHALL display
  that coverage result without describing the code as clean.
- **AC-10:** WHEN a supported real Prisma client without `$use` executes a query,
  THE SYSTEM SHALL record its model/action/timing and enclosing request count.
- **AC-11:** WHEN an instrumented query returns or rejects, THE SYSTEM SHALL
  preserve the host-observable result or error.
- **AC-12:** WHEN the same client passes through multiple matching loads, THE
  SYSTEM SHALL count each operation once.
- **AC-13:** WHEN a client cannot be instrumented, THE SYSTEM SHALL identify the
  unsupported collector while other collectors continue to operate.
- **AC-14:** WHEN this feature ships, THE SYSTEM SHALL document the verified
  Prisma version/generator matrix and static coverage/exit-code limitations.
- **AC-15:** WHEN an identical static scan is repeated, THE SYSTEM SHALL emit
  byte-identical output for its selected format.
- **AC-16:** WHEN the repairs ship, THE SYSTEM SHALL preserve report field
  shapes, JSONL format, public exports, config precedence, and exit-code policies.

## Testing strategy (TDD) and preliminary test map

Detailed task ordering and module decisions belong in design.md/tasks.md after
approval. This map identifies the evidence required for every criterion.

| AC | Planned evidence |
| --- | --- |
| 1–2 | Parser module-specifier unit tests; graph unit tests; barrel/cycle fixtures in graph rule tests and e2e scans |
| 3–4 | Temporary config trees: exact/wildcard aliases, competing patterns, ordered fallbacks, inherited origins, subdirectory importer, genuine external dependency |
| 5 | Invalid config/unresolved alias integration tests; ignored/outside-analyzed targets; no speculative unused findings |
| 6–7 | Adapter tests: malformed TS/TSX and binary/read errors; mixed valid/invalid project scan; graph suppression visibility |
| 8–9 | Pretty reporter snapshots; zero-file and scoped-empty CLI tests; JSON coverage assertions |
| 10–11 | Real-client SQLite proof/integration tests: model/raw operations, requests, transactions, subclass methods, extensions, rejection and cleanup |
| 12–13 | CJS/ESM double-load and inert/unsupported-client hook tests; real-client count checks |
| 14 | Documentation assertions/review; compatibility matrix linked to actual run evidence |
| 15 | Byte-equality repeated static scans of new fixtures; existing eval golden/precision gate |
| 16 | Existing package, JSON/JSONL, scope, config and probe contract tests; exports/runtime dependency diff review |

Keep all static analysis offline. Prisma test installation/generation belongs
to test preparation, never scan execution. Use disposable local databases and
pin test tooling; no production database or private credentials are required.
Retain fake clients for collector failure paths, but add real-client evidence.

Every implementation commit requires `pnpm test`, `pnpm exec tsc --noEmit`,
`pnpm format` with rereading edited files, and `pnpm lint`. Close-out also runs
build/docs validation and live scans/probes whose output is inspected. Update
AUDIT, PLAN, and spec/task statuses only against observed results.

## Review decisions

The user approved the plan on 2026-10-13, accepting the recommendations below.
No contract migration, JavaScript feature, or GitBot work is authorized here.
After the real Prisma 7 proof, the user explicitly chose to defer its standard
generator's new loader to a separate specification, fix Prisma 6.14 now, and
document the Prisma 7 limitation. AC-10–13 apply to the verified existing loading
surface; AC-14 includes the unsupported standard-generator matrix entry.
The user also approved the native-target forwarding Proxy after the real-client
proof revealed that `$extends` hides `$on`. The correction preserves native
subscription behavior and passes the CJS/ESM regression with native baselines.

1. **OQ-1 — `complete` semantics:** Preserve its current scope-only meaning and
   expose skips/counts, or propose a separate contract migration?
   **Recommendation: preserve it and document that consumers must inspect
   `skippedChecks`.** No schema bump or field-shape change is proposed.
2. **OQ-2 — JavaScript UX note:** Clarify TypeScript-only coverage, or add a full
   JavaScript feature? **Recommendation: clarification now, JS as a later spec.**
3. **OQ-3 — Test dependencies:** Approve isolated, pinned Prisma test tooling
   (CLI, real client, and any adapter required for the chosen SQLite/version
   matrix), without runtime dependencies? **Recommendation: yes.** Exact pinned
   versions/tooling are documented in the post-approval design before installation.
4. **OQ-4 — Prisma breadth:** First guarantee the real Prisma 6.14.0 path,
   validate Prisma 7, and seek approval if its loading needs an additional
   instrumentation scope? **Recommendation: yes; do not claim universal Prisma
   support or silently replace zero intrusion with application edits.**
