# Spec 029 — GitBot backend-doctor fixer (F029)

- **Status:** Implemented — 2026-10-16; Codex with human Git handoff; [Library PR #116](https://github.com/gitbot-hq/Library/pull/116) awaits maintainer review
- **Phase:** 4 — Integrations
- **Depends on:** F017 (agent integration, Done), F023 (npm publishing, Done),
  F026 (coverage and exit-code clarity, Done)
- **Blocks:** Submission of this bot to the GitBot public library

## Problem

backend-doctor identifies backend TypeScript problems and reports them to agents
and GitHub reviewers. A developer still has to inspect findings, write fixes,
verify behavior and prepare a pull request. Sahil Kathpal invited the author to
contribute a reusable GitBot bot that performs this workflow.

The user requested this integration on 2026-10-16, including publication that
credits their GitHub account and makes the npm package discoverable. This is an
external agent integration: the analyzer remains deterministic and local.

The roadmap previously mentioned an unapproved spec 025, but its directory is
empty. This proposal uses the next free number after 028 and supersedes that
placeholder. No approval of the earlier proposal is assumed.

## Goals

- Ship a portable GitBot library folder for TypeScript Node.js/NestJS GitHub
  repositories: listing, standing instructions and finite setup requirements.
- Scan with the existing npm CLI, fix a small verified batch and prepare a PR
  handoff on a feature branch created by the user. The user commits and publishes.
- Treat warnings as findings; distinguish coverage gaps and analyzer failures
  from application defects, and never equate exit code 0 with a complete audit.
- Preserve repository policy, public contracts, existing work and analyzer rules.
- Attribute the listing to `yamkin29` / Alexey Yamkin and link the official
  repository and `backend-doctor-cli` npm package without adding promotional
  comments or unrelated changes to target applications.
- Prepare a reproducible smoke run and a library submission from the author's
  fork, with evidence of what was actually checked.

## Non-goals

- LLM calls or automatic source rewriting inside backend-doctor; a future
  separately approved engine feature would own any such change.
- New CLI commands, exports, JSON fields, rules or configuration options; their
  owning features retain their existing contracts.
- JavaScript analysis, runtime probes, automatic migrations, broad architecture
  rewrites or dependency upgrades; future scoped integrations may address these.
- Scheduled execution, hosted services, telemetry or npm republishing; scheduling
  belongs to a separately requested automation and releases to the release workflow.
- Automatic merge, direct pushes to a default branch, force pushes, or bulk
  promotional activity. The user reviews PRs; a separate request owns outreach.
- Automatic target-project Git writes and PR creation: the user owns branch
  preparation, commit/push and publication for this Codex workflow.
- Changes to GitBot itself, its generated catalog, or other published bots.

## User stories

1. **Backend developer:** Start the bot in a TypeScript backend checkout, even
   with a greeting, and receive a verified local patch with a proposed PR title,
   body and publication commands, or a precise reason that work could not start.
2. **CI author:** Review before/after results from the same analyzer version and
   configuration, including exit codes, skipped checks and project checks.
3. **AI agent:** Consume the existing schema-version-1 JSON report and rule
   documentation, identify actionable findings and avoid hiding coverage gaps.

## Contract / Model

### Deliverables

After approval, maintain the canonical definition at
`integrations/gitbot/backend-doctor-fixer/` in this repository:

- `bot.json`: GitBot library metadata and execution settings.
- `instructions.md`: The standing job below, without a title or frontmatter,
  at most 600 words.
- `setup.md`: The machine prerequisites below, without setup completion markers.

An adjacent integration README documents installation, limitations and the
actual smoke evidence. Only the three bot files are copied to
`bots/backend-doctor-fixer/` in a fork of `gitbot-hq/Library`; no generated index,
per-bot license, image or extra file is submitted. Public listing content is
original text released under the library's MIT license.

### Proposed listing and settings

| Field | Proposed value |
| --- | --- |
| `slug` | `backend-doctor-fixer` |
| `name` | `Backend Doctor Fixer` |
| `description` | `Prepare verified backend-doctor fixes on your feature branch` |
| `category` | `Maintenance` |
| `about` | `Fix actionable findings in TypeScript Node.js and NestJS backends with backend-doctor-cli. Create a feature branch first; the bot verifies a focused patch and prepares PR evidence for you to publish. By Alexey Yamkin: https://github.com/yamkin29/backend-doctor; npm: https://www.npmjs.com/package/backend-doctor-cli.` |
| `features[0]` | `Find backend bugs with backend-doctor-cli` |
| `features[1]` | `Verify focused fixes with scans and project checks` |
| `features[2]` | `Prepare PR evidence for manual GitHub publication` |
| `examplePrompt` | `Scan this TypeScript backend on my feature branch, fix a small batch, run the checks, and prepare a PR summary. Leave Git publication to me.` |
| `author.github` | `yamkin29` |
| `author.name` | `Alexey Yamkin` |
| `mascot` | `body: bear`, `color: brand-leaf`, `activity: working` |
| `emoji` | `🩺` |
| `agent` | `codex` |
| `permissionMode` | `ask-permissions` |
| `model`, tool lists | Omitted |

Codex is the supported agent found installed during research; no model is pinned.
GitBot documents that Codex has workspace sandboxing, **not per-tool approval or
tool allow/deny lists**, even with `ask-permissions`. The listing must not promise
those controls. Branch, review and publishing limits are agent instructions,
not a security boundary enforced by the bot definition.

### Approved standing job (full text)

> Fix actionable backend-doctor findings in the current TypeScript Node.js or
> NestJS GitHub repository. Start on the first message, including a greeting.
> Read repository instructions, package scripts, CI and package-manager settings.
> Resolve the repository root, current branch and PR base. Require a clean,
> isolated feature branch based on that base. If the checkout is dirty, the base
> is ambiguous, or the current branch is the default branch, stop before editing.
> Give the user a non-destructive `git switch -c` command for a new unique branch
> and wait for them to create it. Never create branches, commit, push, merge,
> force-push, modify Git metadata or open a PR yourself.
>
> Use the repository's installed, pinned backend-doctor-cli version when present,
> otherwise an already installed backend-doctor executable. Record the version
> and use it throughout. If a required tool or package is unavailable, provide its
> installation command and wait for the user; the fallback analyzer version is
> 1.1.1. Never install, upgrade or download packages or change project dependencies.
> Run `scan --scope all --format json` at the resolved backend root with the
> repository's configuration. Capture stdout, stderr and exit status separately;
> never mask failures with `|| true`. Exit 0 can include warnings, exit 1 means
> error findings, and exit 2 blocks remediation as a usage/configuration failure.
>
> Require schemaVersion 1, full mode, analyzed files, complete scope and no skipped
> checks or internal-tagged diagnostics before editing. Report unsupported
> schemas, invalid output, zero analyzed files and incomplete coverage explicitly;
> do not call them clean. JavaScript sources are unsupported. With no findings,
> report the scan scope and finish without edits or publication commands.
>
> Inspect findings of both severities against surrounding code and run
> `rules explain <rule-id>` with the same CLI version. Select at most three
> findings with small, independently verifiable fixes. Add a failing regression
> test when feasible, apply the focused correction and verify the test passes.
> Defer ambiguous behavior, public API changes and changes requiring dependencies
> or migrations; explain the decision needed. Do not disable rules, add
> suppressions, widen ignores, weaken tests or alter analyzer configuration to
> erase a finding. Leave suspected false positives unchanged and explain them.
>
> Repeat the exact full scan and the repository's required tests, typecheck,
> lint, formatting and build checks. Compare findings by rule, code context and
> location, not IDs alone: edits can move positions. Confirm selected defects
> are resolved, no new findings appear and coverage has not regressed. If checks
> fail or required verification is unavailable, report the blocker without marking
> the patch ready to publish. Record pre-existing failures separately without
> calling them passes.
>
> Review the final diff and leave it uncommitted on the prepared feature branch.
> For verified fixes, return a suggested PR title and body, findings and remedies,
> before/after counts, analyzer version, coverage, checks and deferred findings.
> Suggest scoped Git add/commit/push and GitHub PR commands for the user to review
> and run in their own terminal; do not execute them. Follow repository approval
> rules. Do not upload raw reports, secrets or runtime traces; redact sensitive
> diagnostic values. Add no promotional source comments or unrelated edits.
> Never claim an unrun check passed.

### Approved setup (full text)

> Ensure Node.js 20 or newer, npm/npx and Git are available; verify with
> `node --version`, `npm --version`, `npx --version` and `git --version`.
>
> If a prerequisite is missing, provide its installation command and wait for the
> user. Do not install, download or upgrade tools or packages yourself.
>
> Limit setup to these machine prerequisites. Do not install project dependencies,
> scan or edit a repository, change branches, authenticate GitHub or open a PR.
> Check the repository's installed analyzer and feature branch in the working
> thread. The user handles Git writes and GitHub publication in their own terminal.

GitBot itself and a signed-in Codex agent are host prerequisites. The user owns
all tool/package installation. Git writes and GitHub authentication/publication
are performed by the user outside the working agent sandbox.

### Existing analyzer contract

Verified against `src/core/types.ts`, `src/core/exit-code.ts`,
`src/core/report.ts`, `src/core/scan.ts`, `src/cli/commands/scan.ts` and the shipped
agent skill:

- npm package `backend-doctor-cli`, executable `backend-doctor`, current version
  `1.1.1`; `scan --scope all --format json` supplies a full document.
- Report fields used: `schemaVersion`, `mode`, `diagnostics`, `projects`.
- Diagnostic fields: `id`, `filePath`, `line`, `column`, `rule`, `severity`,
  `message`, `tags`; `internal` marks analyzer failures.
- Coverage fields: `projects[].analyzedFileCount`, `complete`, `skippedChecks`.
  `complete` describes scope; it does not establish successful checks.
- Exit codes remain `0/1/2`. Warnings and skipped checks can coexist with `0`.
  JSON stdout and stderr remain separate. No scanner API or behavior changes.
- Stable IDs describe a particular finding position, so IDs alone cannot prove
  that a defect was fixed when an edit moves source lines.
- JSON is used rather than JSONL because the latter omits project coverage.

## EARS acceptance criteria

- **AC-1:** WHEN the bot folder is prepared THE SYSTEM SHALL contain only the
  GitBot-supported files and satisfy the current library field limits, enum
  values, name/slug uniqueness and author checks.
- **AC-2:** WHEN the listing is inspected THE SYSTEM SHALL credit `yamkin29`,
  identify `backend-doctor-cli` and link the official repository and npm page.
- **AC-3:** WHEN an execution setting is inspected THE SYSTEM SHALL select
  `codex` and `ask-permissions`, omit model/tool lists and document Codex's
  sandbox semantics without promising per-tool approval.
- **AC-4:** WHEN a machine lacks a prerequisite THE SYSTEM SHALL identify the
  failed prerequisite, provide its installation command and wait for the user,
  without installing packages or doing the remediation job during setup.
- **AC-5:** WHEN a run starts THE SYSTEM SHALL resolve repository instructions,
  base and current branch; dirty/default-branch/ambiguous-base input SHALL stop
  before editing with a human preparation command. A supported clean feature
  branch SHALL receive a full JSON baseline with separate stderr and exit status.
- **AC-6:** WHEN a scan returns warnings or errors THE SYSTEM SHALL consider both
  severities; WHEN it returns exit 2, invalid/unsupported JSON, internal failures,
  skipped checks, partial scope or zero files THE SYSTEM SHALL report the blocker
  without editing or claiming a clean audit.
- **AC-7:** WHEN a complete baseline has no diagnostics THE SYSTEM SHALL finish
  with scan evidence and without creating a commit or PR.
- **AC-8:** WHEN eligible findings exist THE SYSTEM SHALL select at most three,
  consult matching-version rule docs and fix source behavior without suppressing
  findings or weakening verification; uncertain changes SHALL remain deferred.
- **AC-9:** WHEN fixes are prepared THE SYSTEM SHALL repeat the same full scan,
  compare selected defects using code context and run required project checks;
  failed or unavailable verification SHALL block a ready-to-publish verdict
  and suggested publication commands.
- **AC-10:** WHEN changes are verified THE SYSTEM SHALL leave an uncommitted
  focused diff on the prepared feature branch and return a proposed PR title,
  body, findings, version, coverage, checks, deferred work and scoped publication
  commands. THE SYSTEM SHALL NOT execute Git writes or create a target-project PR.
- **AC-11:** WHEN the public-library submission is prepared THE SYSTEM SHALL
  change only `bots/backend-doctor-fixer/` in the author's fork, keep generated
  indexes unchanged and submit the original definition under MIT.
- **AC-12:** WHEN verification is reported THE SYSTEM SHALL distinguish static
  definition review, actual CLI checks and actual agent/GitBot execution, and
  include any failed setup or missing end-to-end evidence.

## Testing strategy (TDD)

This feature is a declarative agent definition, not a deterministic fixer
implementation. Schema checks and instruction reviews establish artifact
properties, not guaranteed LLM behavior. Do not add string-matching tests that
merely repeat the prompt or claim they prove agent execution. If implementation
requires executable helpers, specify their behavior and failing tests in the
post-approval design before writing them; prefer no helpers or new dependencies.

| Criteria | Verification evidence |
| --- | --- |
| AC-1, AC-2 | Library validator if available; otherwise JSON parsing, field/length checks, catalog collision check and link/content review |
| AC-3, AC-4 | Full settings/setup review against upstream behavior documentation; run local prerequisite commands |
| AC-5, AC-8, AC-9 | Actual agent smoke on a human-prepared feature branch in a disposable fixture; reproduce/fix a regression and rescan; default-branch trial must leave files unchanged |
| AC-6 | Review the refusal instructions; actual CLI runs for warning-only findings, usage error and zero-file input, plus an incomplete-coverage fixture; distinguish scanner evidence from agent refusal evidence |
| AC-7 | Clean fixture scan and agent no-op smoke; inspect Git history and absence of a PR |
| AC-10 | Actual agent run on a human-prepared branch; review the diff, proposed PR text and commands; assert branch/history unchanged and no commit/push/PR |
| AC-11 | Full library diff and fork/branch review before submission |
| AC-12 | Integration README lists commands, outcomes and unperformed checks; no claim of a GitBot smoke from schema validation alone |

Use temporary fixture repositories, not the user's working application. Do not
publish a test PR into an unrelated repository. A real GitBot installation and
authenticated CLI may require environment setup; if unavailable, report that
limit and leave the corresponding verification incomplete.

Before documentation handoff run `pnpm format`, `pnpm lint`, re-read changes and
`git diff --check`. Before implementation handoff follow the repository's full
verification requirements: `pnpm test`, `pnpm typecheck`, `pnpm format` and
`pnpm lint`. No Prisma interception or new rule tests apply.

## Sources and research notes

Read on 2026-10-16:

- [Requested workflow, Library issue 97](https://github.com/gitbot-hq/Library/issues/97)
- [Bot authoring prompt](https://github.com/gitbot-hq/GitBot/blob/main/docs/bot-author-prompt.md)
- [Library contribution guide](https://github.com/gitbot-hq/Library/blob/main/CONTRIBUTING.md)
- [Library folder specification](https://github.com/gitbot-hq/Library/blob/main/docs/bot-schema.md)
- [Library publishing prompt](https://github.com/gitbot-hq/Library/blob/main/docs/publish-prompt.md)
- [SLOC Triage reference](https://github.com/gitbot-hq/Library/tree/main/bots/sloc-triage)
- [Local coverage pitfalls](../../RESEARCH.md#diff-scope-and-coverage)
- [Shipped agent skill](../../../skills/backend-doctor/SKILL.md)

The published folder specification mentions `schema/bot.schema.json`, but fetching
that file and a `scripts/` directory returned 404 during research. Recheck the
library checkout before choosing validation commands; do not invent a validator
or install packages when upstream does not provide one.

At initial research GitBot was absent and sandboxed `gh auth status` failed.
The user later installed GitBot 0.0.11 and updated Codex CLI to 0.163.0; GitBot
detected Codex. GitHub login succeeded outside the sandbox. These are environment
observations, not additional bot prerequisites.

## Review decisions (approved 2026-10-16)

The user approved this specification and its recommendations, then explicitly
requested implementation. The final library diff will be presented before
external submission as agreed below.

1. **Scope and identity:** Approve F029 as the external fixer integration above,
   with `Backend Doctor Fixer`, author `yamkin29` and the official npm/repository
   links? Recommendation: approve; no analyzer changes or new package dependencies.
2. **Agent and limits:** Approve Codex with workspace sandboxing, the GitBot
   `ask-permissions` setting, batches of at most three findings and blocking
   publication when required verification fails? Recommendation: approve these
   defaults; do not promise Codex per-tool approval.
3. **Distribution:** Approve MIT distribution and preparation of a fork-based
   library PR, plus local GitBot installation/testing when environment permissions
   allow? Recommendation: approve. Confirm the final reviewed diff before external
   submission; this spec does not authorize email, promotional messages or npm
   releases. Local bot activation, if needed, must preserve existing GitBot data.

After review, write `design.md` and `tasks.md`, including the acceptance-to-test
map and any agreed changes, before creating the bot implementation.

## Compatibility decision (resolved 2026-10-16)

The installed GitBot 0.0.11/Codex edit sandbox denied Git metadata writes. A real
run fixed and verified a defect but could not create a feature branch. The
branch-failure guard was verified in another run, which made no edits.

The user cannot use Claude Code and chose to continue with Codex and human Git
steps. The current listing, standing job and AC-5/AC-10 reflect that decision:
the user prepares a clean feature branch; the bot fixes and verifies code and
returns PR evidence; the user commits/pushes/opens the target-project PR. The
bot never changes Git metadata or downloads packages. Setup no longer requires
GitHub CLI authentication because the bot does not publish. The library submission
PR is a separate maintainer contribution, prepared here for final diff approval.

This replaces the original automated branch/commit/push/PR goal for the Codex
definition. Do not silently grant broader filesystem/network access. The initial
remediation trial and refusal trial remain historical evidence; a fresh prepared-
branch trial verifies the revised workflow.
