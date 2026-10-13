# Local project audit — 2026-10-13

This document records findings from a local review of backend-doctor-cli
1.0.1. It is a follow-up checklist, not an approved feature specification.
Before implementation, follow the repository's spec/design/tasks workflow;
changes to scope or stable contracts still require user approval.

Follow-up: [separate remediation plan](AUDIT_FIX_PLAN.md) and
[draft spec 026](specs/026-audit-remediation/spec.md). Findings below remain
unchecked until their fixes are implemented and verified.

## Verified baseline

- All 755 tests passed across 72 test files when run with permission to
  open local HTTP ports. The initial sandboxed run failed because local
  listeners were denied (`listen EPERM`); those failures were environmental.
- Typecheck (`pnpm exec tsc --noEmit`), lint (`pnpm lint`), build
  (`pnpm build`), and rule documentation validation (`pnpm docs:rules`)
  passed. Documentation matched all 41 registered rules.
- A live scan of `evals/nest-good` returned zero findings.
- A live scan of `evals/nest-bad` returned 44 warnings. Two consecutive
  JSON reports were byte-identical.
- A live probe of `tests/fixtures/probe/blocking.cjs` recorded one blocking
  call of approximately 32 ms.

Passing this suite does not cover the additional cases below. No source
changes or fixes were made during the audit.

## Findings to fix

### A01 — Re-exports break file reachability

- [ ] Include module references from `export … from` in the import graph,
  with regression coverage for named and wildcard re-exports.

**Confirmed by reproduction.** Create these files in a project with an
empty `package.json`:

```ts
// src/main.ts
import { answer } from "./barrel";
console.log(answer);

// src/barrel.ts
export { answer } from "./service";

// src/service.ts
export const answer = 42;
```

Run `backend-doctor scan <project> --format json`. The current implementation
reports `backend-doctor/unused-file` for `src/service.ts`, even though the
entry uses it through the barrel. This can also hide cycles involving
re-export edges; that consequence follows from the graph construction and
was not separately reproduced.

**Location:** [`getModuleSpecifiers()`](../src/engine/parser/ts-morph-adapter.ts)
collects import declarations, `require`, and dynamic imports, but omits
export declarations. Reachability is consumed by
[`unused-file`](../src/rules/graph/unused-file.ts).

### A02 — TypeScript path aliases cause false unused findings

- [ ] Decide and specify alias support or explicit reporting of this
  limitation; verify that unsupported resolution does not produce
  misleading unused-code claims.

**Confirmed by reproduction.** Use:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@app/*": ["src/*"] }
  }
}
```

With an empty `package.json`, `src/main.ts` importing and using `answer`
from `"@app/service"`, and `src/service.ts` exporting `answer`, a scan
reports both `unused-file` and `unused-export` for the service.

**Location:** [`resolveSpecifier()`](../src/engine/imports.ts) resolves only
relative specifiers. The parser does not consult `tsconfig`. This is an
existing capability limitation; implementing broader resolution needs an
approved scope decision.

### A03 — The pretty report hides skipped files/checks

- [ ] Show skipped work in the human-readable report and add regression
  coverage for a scan with skipped work but no diagnostics.

**Confirmed by reproduction.** Create a project containing `main.ts` with
a NUL byte and scan it. JSON includes a `skippedChecks` entry identifying
the binary file and an analyzed file count of zero. The pretty report
prints `Summary: 0 errors, 0 warnings (0 issues)` without explaining the
skip. The JSON project also says `complete: true`.

**Location:** [`renderPretty()`](../src/reporters/pretty.ts) renders findings
but not `projects[].skippedChecks` or analyzed file counts.
[`runScan()`](../src/core/scan.ts) derives `complete` solely from scope.

Review the intended meaning of `complete` against the existing specs
before changing it. JSONL is deliberately diagnostics-only, so any change
to its shape must be treated as a stable-contract decision. The immediate
issue is that the default human-readable output hides skipped work,
contrary to the project's fail-loud principle.

### A04 — Invalid syntax is not surfaced as a parse problem

- [ ] Define handling of parser syntax diagnostics and test that malformed
  files do not receive an apparently complete, clean scan without notice.

**Confirmed by reproduction.** A `main.ts` containing only:

```ts
export function broken( {
```

produces exit code 0, zero findings, `analyzedFileCount: 1`,
`complete: true`, and an empty `skippedChecks` array.

**Location:** [`loadSourceFile()`](../src/engine/parser/ts-morph-adapter.ts)
checks read errors and NUL bytes, then creates an AST without inspecting
syntax diagnostics. TypeScript's tolerant parser can create an AST for
malformed source. This is about making parse problems visible, not adding
a full typechecker. Compare with spec 003 AC-2 on unreadable/unparseable
files when designing the fix.

### A05 — Prisma runtime collection depends on removed middleware

- [ ] Define supported Prisma versions and update runtime instrumentation
  accordingly; validate against a real supported client in addition to
  the current fake-client fixtures.

**Confirmed by code inspection and upstream release documentation; no real
modern Prisma client was run during this audit.** The runtime collector
requires `PrismaClient.prototype.$use`. If absent, it prints
`prisma client without $use found; db-query collector disabled` and does
not collect database queries. Therefore runtime query counts/N+1 findings
cannot be relied upon for clients without that API.

Prisma removed `$use` in
[Prisma 6.14.0](https://github.com/prisma/orm/releases/tag/6.14.0), recommending
Client Extensions instead. The assertion in `docs/RESEARCH.md` that `$use`
works across Prisma 5/6 is too broad and needs correction alongside the
compatibility work.

**Location:** [`installDbCollector()`](../src/probe/hook.ts).
The existing fixture at
[`tests/fixtures/probe/node_modules/@prisma/client/index.js`](../tests/fixtures/probe/node_modules/@prisma/client/index.js)
is a simplified fake client. Green tests prove that fixture's behavior,
not compatibility with a real modern Prisma installation.

## Capability and UX notes

These are separate from the confirmed implementation defects above.

- [ ] Clarify TypeScript-only static scanning in user-facing output/docs,
  or propose JavaScript support as a separately scoped feature.
  [`SUPPORTED_EXTENSIONS`](../src/engine/collect.ts) contains only `.ts`,
  `.tsx`, `.mts`, and `.cts`. A project containing only `main.js` with
  `eval(userInput)` returned zero analyzed files, zero findings, exit 0,
  and `complete: true` in the reproduction. JavaScript support is not part
  of the current spec 003 file collection contract.
- [ ] Ensure users understand that exit 0 does not mean zero findings.
  All 41 registered rules currently default to `warn`; the bad eval app
  therefore exits 0 with 44 findings. This follows the intended severity
  policy and is not a bug. Configure rule/category severities or CI
  blocking explicitly; do not change the stable exit-code contract.

## Suggested follow-up order

1. A01: correct graph reachability for ordinary re-exports.
2. A03 and A04: make skipped work and parse problems visible.
3. A05: repair or clearly bound real Prisma runtime compatibility.
4. A02: specify alias resolution and its precision boundaries.
5. Address the capability/UX notes without silently expanding scope.
