# Tasks 029 — GitBot backend-doctor fixer (F029)

## Tasks

- [x] **T1. Approve scope and design (all ACs).** User approved the spec and
  recommendations on 2026-10-16. Write this design and acceptance-to-verification
  map before creating implementation artifacts.
- [x] **T2. Portable bot files (AC-1..AC-4, AC-8).** No TDD — declarative config
  and prose. Extract the approved listing/job/setup, validate real upstream
  limits and inspect the definition without prompt-matching tests.
- [x] **T3. Scanner and remediation smoke (AC-5..AC-9, AC-12).** In disposable
  fixtures, reproduce a defect with a failing regression test (RED), apply the
  focused fix and pass the test (GREEN), then rescan. Also exercise clean,
  warning-only, usage-error, zero-file and incomplete-coverage cases. Record
  which parts were scanner/manual checks and which were actual agent executions.
- [x] **T4. Host and publication preparation (AC-3, AC-4, AC-10..AC-12).** Install
  the approved GitBot host, verify the Codex runtime, prepare the three-file
  library submission and review the complete diff. Preserve existing local bots
  if activating. Record environment blockers and leave unrun checks explicit.
- [x] **T5. Integration documentation (AC-2, AC-3, AC-12).** Document installation,
  operation, evidence and limits; link it from the main README. No TDD — docs.
- [x] **T6. Verification and close-out (all ACs).** Run full required repository
  checks, re-read formatter changes, inspect links/diff and record deviations.
  Set spec to Implemented and F029 to Done only when implementation is complete;
  keep publication pending until the agreed final diff confirmation.

## Deviations & notes

- Initial sandboxed `gh auth status` incorrectly appeared to report invalid
  authentication. Rechecking outside the network sandbox succeeded for `yamkin29`;
  no credentials were changed.
- The user owns external npm package installations. Do not retry an installation
  or change its prefix automatically; provide the command and wait for the user.
- The first global GitBot installation failed with EACCES under
  `/usr/local/lib/node_modules`. The proposed user-prefix installation was not
  run. The user subsequently installed GitBot 0.0.11 globally under `/usr/local`.
- `codex --version` exited 137 both inside and outside the sandbox. Read-only
  `codesign --verify` identified an invalid signature on the installed 0.98.0
  arm64 executable. The user must repair/update their Codex CLI before the
  installed GitBot host can detect it; no npm installation was retried. The user
  subsequently updated to Codex CLI 0.163.0; version and ChatGPT login checks
  passed and GitBot detected the Codex agent.

## Recorded verification

- Portable `bot.json`, `instructions.md` and `setup.md` were extracted from the
  approved spec. Documented limits/enums/layout/privacy checks passed, with no
  name or slug collision among the 28 upstream listings at commit `80a280b`.
- GitBot 0.0.11's installed store accepted the definition in an isolated temporary
  data directory, preserved an existing fixture bot and set setup to pending.
  Its permission translator mapped the preset to `allow-all-edits`, which the
  Codex adapter maps to `workspace-write`. No real agent was invoked.
- `pnpm build`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: 80 files / 807 tests passed; 5 files / 11 tests failed and 2
  unhandled errors were reported. Output included sandbox `listen EPERM` failures
  for local HTTP servers. The request to rerun outside the sandbox was rejected;
  no successful full-suite result is claimed.
- Disposable CLI/manual remediation smoke, analyzer version 1.1.1: one
  `no-async-foreach-callback` warning reproduced with exit 0; a behavioral test
  failed before the manual correction and passed afterwards. The same full scan
  then produced zero findings, one analyzed file and no skipped checks, with
  byte-identical output on repetition. This was **not** an agent or GitBot run.
- Negative CLI cases passed: error severity returned 1, invalid scope returned 2
  with empty stdout, a JavaScript-only project returned 0 with zero analyzed
  files, and a binary TypeScript file exposed skipped checks despite exit 0.
- Smoke artifacts remain in the session's temporary fixture directory;
  `summary.json` records commands and separated stdout/stderr artifacts. They are
  not included in the public bot folder.
- The upstream library was cloned into a temporary checkout at commit `80a280b`;
  branch `codex/backend-doctor-fixer` contains exactly the three new bot files
  (83 lines); JSON uses the upstream two-space indentation. Full diff and
  `git diff --check` passed review.
  At that stage no fork, commit, push or PR was created; see revised results below.
- Integration README and main README link are complete. `pnpm format`,
  `pnpm lint` and `git diff --check` passed after their addition.
- Local activation, actual agent smoke, a successful full test run, publication
  confirmation and close-out remain pending. Spec and roadmap stay in progress.

## Live host checks (2026-10-16)

- GitBot 0.0.11 started on `127.0.0.1:4317`, with Codex detected.
- Created the approved bot through GitBot's own `/bots` API, including its
  pending setup thread. Its local data is stored under the default `~/.gitbot`.
- First setup request inherited `gpt-6.1-sol` from CLI configuration and was
  rejected with HTTP 400 as unavailable for this ChatGPT sign-in. No setup work
  or repository edits were performed by that failed request.
- The actual account catalog listed `gpt-6-sol`; the retry selects it for the
  smoke request only. Canonical bot metadata and global CLI settings are unchanged.
- No external npm package was installed by the agent. The disposable working
  fixture uses pre-provisioned symlinks to the existing local analyzer build
  and TypeScript compiler, with package installation explicitly prohibited.
- Setup's GitHub check failed within the Codex sandbox, while the same check
  outside it confirmed the existing `yamkin29` login. All prerequisite versions
  were verified; the host's supported manual completion action cleared setup.
  The failed in-agent check is retained as a limitation, not counted as a pass.
- The first actual working run reproduced the test failure, changed async
  `forEach` to sequential awaited iteration, passed build/test/diff checks and
  rescanned from one warning to zero with unchanged complete coverage. No package
  downloads, commit, push or public PR occurred.
- **Regression found:** the sandbox denied feature-branch creation, but the
  original prompt continued to edit the disposable fixture on `main`. Added an
  explicit stop-before-editing instruction for branch-creation failure. This
  enforces the already-approved branch-isolation requirement rather than changing
  its scope. A fresh actual-agent refusal run passed: it stopped before scanning
  or editing, and `git diff --exit-code` confirmed an unchanged clean fixture.
- **Blocking compatibility finding:** the installed Codex/GitBot edit sandbox
  denied `.git` writes, and its GitHub authentication check failed inside the
  sandbox. The fully autonomous branch/commit/push/PR workflow is not verified
  under the approved runtime settings. Do not mark the spec implemented or
  submit the listing until the runtime/access decision is resolved.
- Local bot creation and both actual working trials are complete. The first
  trial demonstrates remediation, not branch isolation. The second demonstrates
  refusal on denied Git access, not successful remediation. A clean no-op run,
  successful isolated-branch workflow and actual publication remain unverified.
- GitBot uses its own bundled Codex 0.155.1 even though the standalone CLI is
  now 0.163.0; the first model-selection failure was in that bundled runtime.
- Instructions are now 464 words; canonical, installed and submission copies
  include the same explicit branch-failure guard. The full library diff remains
  limited to the three new files. Publication is on hold for the user decision.

## Approved revision: Codex with human Git handoff

The user cannot install/use Claude Code and chose to continue with Codex and
human Git/publication steps. Revised the listing and AC-5/AC-10 accordingly.
The library contribution PR remains separate from target-project PRs.

- [x] Revise standing job, setup and listing: require a prepared feature branch,
  never execute Git writes/publication, never download/install packages, and
  return verified PR evidence and suggested commands.
- [x] Run the revised bot on a fresh feature branch prepared outside the agent.
  Verify RED → GREEN, full rescan, unchanged branch/history and PR handoff.
- [x] Verify default-branch refusal and clean-source no-op for the revised job.
- [x] Refresh README, verification evidence, library copy and final review.

### Revised live results

- Fresh setup thread passed Node 22.13.1, npm/npx 11.7.0 and Git 2.39.5 checks
  and ended with SETUP_COMPLETE. A resumed old setup thread had retained the
  prior GitHub requirement; it is historical evidence, not the current setup.
- Prepared-branch trial passed: regression RED → GREEN; full schema-1 scan
  1 warning → 0 findings, same one analyzed file and no skips; build/test/diff
  checks passed. Only src/main.mts changed; current branch and HEAD were
  unchanged. The bot returned a PR title/body and scoped human commands.
- Revised default-branch trial stopped before scanning/editing, left the fixture
  unchanged and returned a human branch command.
- Full pnpm test outside the network sandbox passed: 85 files / 818 tests.
  pnpm typecheck passed. Prior sandbox EPERM failures are superseded by this
  successful complete run, without changes to analyzer source.
- Created author fork yamkin29/Library. The local submission branch has origin
  pointing to the fork and upstream pointing to gitbot-hq/Library. Fetched
  upstream/main still matches 80a280b. No duplicate author PR exists in Library.
- Prepared the external PR description with the Codex manual-Git limitation
  stated explicitly. No commit, push or contribution PR has been made yet.

- Clean-source actual no-op passed: zero findings, complete one-file coverage,
  no skipped checks, unchanged clean feature branch/source, no publication
  commands. The first test lacked ignored build output; the bot built it and
  reran the test successfully without changing tracked files.
- Current implementation verification is complete. The remaining T6 work is
  the agreed final external-submission confirmation, library commit/push/PR,
  and spec/roadmap close-out. No external npm installs are required.

## Submission and close-out (2026-10-16)

- The user reviewed the final three-file diff and explicitly approved submission.
- Library commit `122c8b5` (`feat: add Backend Doctor Fixer bot`) contains exactly
  the three supported files, 86 added lines. Pushed only the feature branch
  `yamkin29/Library:codex/backend-doctor-fixer`.
- Opened [gitbot-hq/Library PR #116](https://github.com/gitbot-hq/Library/pull/116),
  targeting main, with the Codex human-Git limitation and validation evidence
  stated in the PR body. Attached the PR to the current task.
- Implementation and roadmap are complete. Marketplace availability still
  requires maintainer review and merge; it is not claimed by PR creation.
- Final checks: full test suite 85 files / 818 tests, typecheck, formatter, lint,
  link/content review and diff whitespace checks passed. No analyzer behavior,
  rule, dependency, public CLI contract or npm release changed.
