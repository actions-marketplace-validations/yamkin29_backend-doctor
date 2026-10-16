# Design 029 — GitBot backend-doctor fixer (F029)

Written after user approval on 2026-10-16.

## Module layout

| File | Purpose |
| --- | --- |
| `integrations/gitbot/backend-doctor-fixer/bot.json` | Portable library listing and approved Codex settings |
| `integrations/gitbot/backend-doctor-fixer/instructions.md` | Reviewed standing job, under 600 words |
| `integrations/gitbot/backend-doctor-fixer/setup.md` | Finite Node/npm/Git prerequisites |
| `integrations/gitbot/README.md` | Install/use/publish instructions, constraints and measured smoke evidence |
| `README.md` | Discoverable integration link in the agents section |
| `docs/PLAN.md` | F029 implementation status |
| `docs/specs/029-gitbot-fixer/tasks.md` | Verification map, evidence and deviations |

The public library receives only the three files inside the bot folder. Local
GitBot runtime records contain generated IDs/timestamps/setup state and are not
committed or included in the public library.

## Key decisions

1. **A portable definition, no fixer runtime in the analyzer.** GitBot supplies
   agent orchestration; backend-doctor supplies findings and rule documentation.
   Adding another command, agent SDK or deterministic rewrite engine would expand
   the approved scope.
2. **Extract the reviewed definition verbatim.** The approved, revised spec
   contains the whole job, setup and listing. Keep the source and marketplace copy identical.
   Copying the reference bot would import its unrelated policy and attribution.
3. **Full JSON, fixed version per run.** A full scan exposes coverage, internal
   errors and project rules. JSONL and changed-only scans cannot establish the
   coverage required for this bot's final verification. Use a project pin when
   present and the approved 1.1.1 fallback otherwise.
4. **Declarative artifacts use schema/content review, not prompt-matching tests.**
   Check fields and length limits against upstream, then exercise scanner
   behavior in disposable fixtures. Agent executions must be recorded separately
   from scanner checks; no assertions about nondeterministic compliance follow
   from a text comparison.
5. **Codex `ask-permissions` preserves GitBot's workspace sandbox.** No model or
   tool fence is set. The README explains that per-call approval is unavailable
   in this backend; instructions are not enforced security controls.
6. **Setup checks machines; working threads check repositories.** Setup verifies
   Node/npm/Git only. The user owns all installations and GitHub
   authentication/publication. Project package-manager/version decisions remain
   in the working thread.
7. **Prepare publication in an isolated library checkout.** Check current upstream
   instructions and catalog for collisions. Keep the library diff to the new bot
   folder, review all files, then obtain the agreed final submission confirmation.
8. **Local installation preserves other bots.** Inspect the host's supported
   import/store interface before activation. Use generated IDs and atomic updates
   with backup when a store write is needed; never overwrite existing bot records.
9. **Require a human-prepared branch.** The approved Codex revision stops on the
   default branch instead of trying a Git write. An actual refusal trial left
   the fixture unchanged and returned a human preparation command. A prepared-
   branch trial completed remediation and verification without changing history.

## Dependencies

No npm dependency, CLI contract or analyzer source change. GitBot is an approved
external host installation, not a dependency of `backend-doctor-cli`. Temporary
fixture checks use Node's built-in test runner and the already-built analyzer.

## Test map (AC → verification)

| AC | Verification |
| --- | --- |
| AC-1 | Parse listing; check exact file layout, upstream field limits/enums and catalog collisions |
| AC-2 | Inspect author and official links; verify against repository package metadata |
| AC-3 | Compare runtime settings with upstream Codex behavior; README permission review |
| AC-4 | Run prerequisite commands; inspect setup for finite checks and no repository actions |
| AC-5 | Default-branch refusal and actual run on a clean human-prepared feature branch; record baseline/root/version/outputs |
| AC-6 | CLI smoke for warnings, exit 2, zero files and incomplete coverage; agent refusal behavior only if actually run |
| AC-7 | Clean CLI fixture and, if runnable, actual agent no-op; inspect tree/history |
| AC-8 | Temporary regression test fails for a defect before a focused correction and passes afterwards; actual agent-run evidence reported separately |
| AC-9 | Same-version before/after full scans and fixture test/check commands; negative check outcome reviewed |
| AC-10 | Review actual fixture diff and proposed PR title/body/commands; confirm branch/history unchanged and no publication |
| AC-11 | Compare canonical and submission files; review fork branch and full diff; do not edit generated catalogs |
| AC-12 | Record command outputs, setup failures, actual agent runs and missing verification in tasks and integration README |

Before handoff run the repository's full `pnpm test`, `pnpm typecheck`,
`pnpm format`, `pnpm lint` and `git diff --check`. No runtime interception or rule
changes require Prisma compatibility tests or new rule fixtures.

## Approved Codex revision

The user chose Codex with human Git handoff after live testing. The working
agent requires a clean feature branch prepared by the user, never writes Git
metadata, and returns the verified diff plus proposed PR text and commands.
Metadata and setup are revised to match this promise. No Claude Code dependency,
permission broadening, package download or analyzer change is introduced. The
public-library contribution PR remains a separate publication step.

The revised verification for AC-5/AC-10 uses an outside-prepared feature branch:
assert unchanged branch and commit history, a focused source diff, passing
regression/build checks and a full rescan. A default-branch run must refuse
before editing and provide the human branch command.
