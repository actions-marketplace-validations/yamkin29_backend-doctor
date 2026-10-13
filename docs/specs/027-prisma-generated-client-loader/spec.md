# Spec 027 — Prisma generated-client loading (F027)

- **Status:** Draft — pending review; no implementation authorized
- **Phase:** 5 — Runtime engine
- **Depends on:** F020 (Done), F026 (Done)
- **Blocks:** Verified runtime support for the Prisma 7 standard generator
- **Scope anchor:** The user's explicit decision during spec 026 to move the
  Prisma 7 standard-generator loader into a separate specification.

## Problem

Prisma 7's standard `prisma-client` generator emits an application-local client.
The current probe intercepts `@prisma/client` and `.prisma/client` module families.
A real Prisma 7.0.0 SQLite experiment generated a CJS configuration, compiled it
with existing tsup, and executed model queries. Its only class-bearing module load
was `./generated/built/client.cjs`, outside those families. Zero recorded queries
therefore cannot establish database coverage for this generator.

## Verified facts

- Production loading logic: `src/probe/hook.ts`, `installDbCollector()`.
- Real experiment: `tests/compat/prisma7/proof.cjs`, schema, config and pinned lockfile.
- Node package supports Node >=20; do not change the engine floor implicitly.
- Runtime events/findings/session formats and probe exit policy are existing contracts.
- Public query extensions alone do not select/intercept generated module loads.
  They also hide `$on`; F026 uses a verified native-target forwarding Proxy to
  preserve subscriptions for its exact Prisma 6.14 loading matrix. Prisma 7 needs
  its own behavior proof rather than assuming that wrapper will suffice.
- [Prisma generator documentation](https://www.prisma.io/docs/orm/v7/prisma-schema/overview/generators)
  documents the standard generator and explicit output path. Documentation is not
  evidence that any proposed loader already works.

## Goals

- Intercept explicitly verified generated-client loading routes without requiring
  application, build-config or start-command edits beyond the existing probe command.
- Validate compiled CJS and native ESM loading separately with real Prisma 7.0.0
  and local SQLite, rather than extrapolating between module systems.
- Preserve client behavior, public methods, extensions, transaction semantics,
  results/errors, cleanup, ALS attribution and one event per operation.
- Make unsupported generation/build combinations visible and document an exact matrix.

## Non-goals

- GitBot work (draft spec 025), static JavaScript analysis, other ORMs or HTTP/2.
- Arbitrary bundler-inlined clients: a later feature owns that scope if needed.
- Instrumenting uncompiled generated TypeScript independently of the app's own
  supported execution/build process.
- Private Prisma engine patches, application rewrites, network query collection,
  telemetry or production database test credentials.
- Changing event/report schema versions, config precedence, exports or exit codes.

## User stories

1. **Backend developer:** I can probe a supported Prisma 7 app using its normal
   generated-client import without editing my application.
2. **CI author:** Compatibility tests cover module systems explicitly and fail
   instead of silently skipping missing test tooling.
3. **AI agent:** I distinguish supported runtime collection from unsupported
   coverage rather than treating every zero count as evidence of no queries.

## Contract / Model

Loader design is deliberately undecided until review. Prototype mutation or
private Prisma state must not be assumed to preserve behavior. Before choosing
a mechanism, run a real-client design proof covering initialization/event
subscriptions, native public APIs, subclass fields/private methods, app extensions,
raw/model queries, lazy batch transactions, interactive rollback/error identity,
disconnect and repeated imports. Prove that loaders are inert outside a probe.

Preserve all existing runtime schemas and sensitive-data boundaries: no query
arguments, SQL, results or credentials in recorded events. Node >=20 is the
current target; any narrower verified platform/version requirement needs a user
decision and an explicit compatibility notice.

## EARS acceptance criteria

- **AC-1:** WHEN a supported compiled CJS generated client loads, THE SYSTEM SHALL
  record executed model/raw operations through the existing probe command.
- **AC-2:** WHEN a supported native ESM generated client loads, THE SYSTEM SHALL
  record its operations independently of the CJS interception path.
- **AC-3:** WHEN an intercepted operation executes in an HTTP request, THE SYSTEM
  SHALL attribute it to that request exactly once across repeated imports.
- **AC-4:** WHEN a supported client is instrumented, THE SYSTEM SHALL preserve
  tested native public API, subscription, subclass, extension and transaction behavior.
- **AC-5:** WHEN a query resolves or rejects, THE SYSTEM SHALL preserve its
  host-visible result/error and record timing without sensitive query payloads.
- **AC-6:** WHEN a loading route is unsupported or installation fails, THE SYSTEM
  SHALL expose a collector limitation while preserving the host and other collectors.
- **AC-7:** WHEN loaded outside a probe, THE SYSTEM SHALL leave runtime loading inert.
- **AC-8:** WHEN this feature ships, THE SYSTEM SHALL document the tested
  generator/build/module/Node matrix and preserve existing runtime/report contracts.

## Testing strategy

Extend the pinned real Prisma 7 SQLite harness. Add separate CJS and ESM host
fixtures, public API/native baseline comparisons, repeated-load assertions,
request attribution, extension composition, query rejection and rollback cases.
Use disposable local data. Retain unsupported/inert tests and all F026 regression
tests. CI must prepare pinned tooling explicitly before real-client tests.
No loader implementation before spec approval, design/tasks and a successful
real-client proof of the selected mechanism.

## Open questions for review

1. Keep this first loader feature limited to unbundled compiled CJS and native
   ESM clients? **Recommendation: yes; explicitly exclude inlined bundles.**
2. Preserve the Node >=20 floor and report any unsupported minor-version routes,
   or approve a higher floor if required? **Recommendation: preserve the floor;
   propose a change only with concrete experimental evidence.**
3. Keep Prisma 7.0.0/SQLite as the initial pinned test matrix, using the already
   isolated CLI/client/adapter and existing build tooling? **Recommendation: yes;
   any additional dependency requires review.**
4. How should unsupported runtime coverage be conveyed beyond the existing
   stderr collector notice without changing schemas? **Recommendation: start
   with the existing notice and precise documentation; approve any new public
   coverage contract separately.**
