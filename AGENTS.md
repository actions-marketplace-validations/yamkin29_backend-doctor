# AGENTS.md — working on backend-doctor

backend-doctor is a deterministic static analyzer for TypeScript Node.js/NestJS
backends. The npm package is `backend-doctor-cli`; the CLI is `backend-doctor`.

## Context

Read `docs/PLAN.md` and `docs/constitution.md` for initial orientation; the
constitution governs project principles. Then read the code, tests and specs
relevant to the task. Consult relevant sections of `docs/RESEARCH.md` for known
pitfalls. Read `docs/HOW_TO_WRITE_A_SPEC.md` when writing a spec and the rule
authoring section of `CONTRIBUTING.md` when adding a rule. Verify assumptions
against the actual repository.

## Workflow

- **New features:** agree scope against `docs/PLAN.md`, write
  `docs/specs/NNN-slug/spec.md` using the next free number, and get user approval
  and answers to open questions before implementation. Prepare `design.md` and
  `tasks.md` with a test map covering every acceptance criterion; implement tasks
  using red → green → refactor. On completion, check off tasks, record deviations,
  set the spec to `Implemented` and the roadmap entry to `Done`.
- **Bug fixes:** reproduce the issue, add a failing regression test where feasible,
  and make a focused fix. Update affected docs/specs; a separate feature spec is
  unnecessary unless the fix changes agreed requirements or expands scope.
- **Documentation:** edit directly and check accuracy and links. No feature spec
  or behavior tests are required for text-only changes.

Commit in coherent, green units; a small task can use one commit. Use conventional
messages (`feat`, `fix`, `docs`, `chore`); feature commits reference the spec/task.
Commit and push when requested or already authorized by the agreed workflow.

## Verification

During implementation, run tests relevant to the change. Before the final code
commit or handoff, run:

```sh
pnpm test          # builds the CLI automatically before tests
pnpm typecheck
pnpm format       # rewrites files; re-read affected files afterwards
pnpm lint
```

- Before intermediate or documentation-only commits, run `pnpm format` and
  `pnpm lint`; documentation-only work also needs a link/content review and
  `git diff --check`, but no full test suite or typecheck.
- Prisma runtime interception changes also require `pnpm test:prisma`; prepare
  the real-client environment using `tests/compat/README.md`. These tests are
  separate from `pnpm test`; report setup failures explicitly.
- Rule changes require valid/invalid fixtures, diagnostic snapshots, rule docs
  at `docs/rules/backend-doctor/<rule>.md` and a passing `pnpm docs:rules` check.
  New rules start as `warn` and must keep the clean eval corpus free of findings.
- For CLI behavior changes, run a live smoke test; console changes need an
  interactive terminal check. Report checks performed and any remaining limits.

## Decisions requiring user approval

- Changes to `docs/constitution.md`, new dependencies, or expanded scope.
- Changes to public contracts: JSON schema/version, CLI exit codes, public exports,
  shipped rule IDs, or configuration names/precedence. Follow constitution §5:
  exit codes stay `0/1/2`, breaking JSON changes require a schema version bump,
  and flag/config removals need advance release notes.
- Open questions in the spec. Approval already given remains valid.

If new facts require changing approved behavior, scope or compatibility, explain
the conflict and pause the affected work for a decision. Resolve internal
implementation details independently within the approved requirements; record
meaningful deviations in the feature's `tasks.md`.

## Environment and core rules

- Node.js 20+ (22 recommended), pnpm 12; see `package.json` and `CONTRIBUTING.md`.
  Build with `pnpm build` (tsup).
- ESM: source imports use `.js` extensions. TypeScript is strict, including
  `noUncheckedIndexedAccess` and `verbatimModuleSyntax`; use `import type`.
- Docs, specs, comments and commit messages are English; chat with the user in
  Russian.
- Analysis is deterministic and contains no LLM/network calls. Keep rules behind
  `ParserAdapter`; keep scans non-invasive and data local by default.
- Isolate rule failures and expose skipped/failed checks in the report. Never
  silently suppress missing coverage.
- Use `set -o pipefail` in shell pipelines so failures are not masked.
