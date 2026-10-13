# Audit remediation plan — 2026-10-13

- **Status:** Proposed — spec review required before implementation
- **Scope:** All five findings and both capability/UX notes in [AUDIT.md](AUDIT.md)
- **Specification:** [Spec 026](specs/026-audit-remediation/spec.md)
- **Priority:** Complete this work before the proposed GitBot integration

This is the separate overview requested by the user. It is not `design.md`
or an implementation task list: those documents follow spec approval.
The GitBot draft remains separate and has not been approved or implemented.

## Work packages and order

| Order | Audit item | Intended result | Evidence required |
| --- | --- | --- | --- |
| 1 | A01 — Re-exports | Graph includes named/wildcard re-export edges; used files are not flagged as unused | Regression fixtures for barrel reachability and cycles |
| 2 | A04 — Syntax errors | Malformed files are visibly skipped while healthy files continue to be checked | Parser tests and live mixed-project CLI scan |
| 3 | A03 — Hidden skips | Pretty output shows analyzed-file counts and skipped checks | Reporter tests; JSON/JSONL contract checks |
| 4 | A02 — Path aliases | Graph understands supported `tsconfig` aliases; unsupported/broken resolution does not yield unsupported unused-code claims | Exact/wildcard/inherited aliases, fallback ordering, broken-config tests |
| 5 | A05 — Prisma | Supported modern clients record real query counts; legacy collection and host behavior remain verified | Real-client SQLite compatibility proof, fake-client isolation tests, live HTTP probe |
| 6 | UX notes | Users understand TypeScript-only scanning and exit 0 with warnings | README/skill/CLI help review and zero-file scan coverage |
| 7 | Close-out | Audit checklist records actual fixes and remaining compatibility boundaries | Full suite, typecheck, format, lint, docs check, build, CLI smoke tests |

Each implementation task must start with a failing regression test, then a
minimal fix, then cleanup. Record any existing behavior discovered to be
intentional as characterization rather than claiming a red→green fix.

## Decisions to approve

1. **Coverage contract:** Keep `projects[].complete` as the current full-scope
   indicator, preserve report field shapes and JSONL's diagnostics-only form,
   and display/document `skippedChecks` explicitly. Recommended over changing
   the meaning of a stable field in a patch.
2. **JavaScript:** Resolve the UX note by making TypeScript-only support and
   zero-analyzed-file results clear. Full `.js/.cjs/.mjs` scanning should be
   a separate feature, not a hidden extension of this repair plan.
3. **Real Prisma test tools:** Approve test-only Prisma tooling in an isolated
   integration harness, pinned to the selected versions. No runtime dependency
   is proposed. First prove transparent interception on Prisma 6.14.0 using
   the existing `@prisma/client` loading route; then validate Prisma 7 before
   claiming it is supported. If its generated ESM loading cannot be reached
   by the current hook, report the boundary and seek a separate loader scope.

## Completion conditions

- [ ] A01 verified and checked off in AUDIT.md.
- [ ] A02 verified and checked off in AUDIT.md.
- [ ] A03 verified and checked off in AUDIT.md.
- [ ] A04 verified and checked off in AUDIT.md.
- [ ] A05 verified on a real supported client and checked off in AUDIT.md;
  unverified client/generator combinations are clearly documented.
- [ ] Both UX notes addressed without changing the exit-code policy.
- [ ] Design and TDD tasks exist; every acceptance criterion has a test or
  an explicit live compatibility check.
- [ ] Required checks pass; CLI output has been inspected manually.
- [ ] PLAN and spec status reflect the actual result.

The previous audit baseline was 755 passing tests, successful typecheck,
lint, build, and rule-doc validation. It is a baseline, not evidence that
these repairs are already implemented. No code has been changed for this plan.
