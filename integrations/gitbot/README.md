# Backend Doctor Fixer for GitBot

A reusable [GitBot](https://github.com/gitbot-hq/GitBot) bot by
[Alexey Yamkin](https://github.com/yamkin29). It uses
[backend-doctor-cli](https://www.npmjs.com/package/backend-doctor-cli) to fix up to
three actionable findings in a TypeScript Node.js/NestJS backend, verify the patch
and prepare evidence for a pull request.

**Git is handled by the user.** Create a clean feature branch before the run. The
bot leaves an uncommitted diff and proposed PR title/body/commands; you review,
commit, push and open the PR from your own terminal. This Codex workflow does not
promise automatic Git writes or publication.

The analyzer stays deterministic. GitBot supplies the AI agent that writes the
fixes; this definition does not guarantee deterministic agent behavior.

## Definition

- [bot.json](backend-doctor-fixer/bot.json): public listing, author and settings.
- [instructions.md](backend-doctor-fixer/instructions.md): the complete standing job.
- [setup.md](backend-doctor-fixer/setup.md): one-time Node/npm/Git checks.

The bot targets GitHub repositories with supported TypeScript backend sources
and runnable local project checks. JavaScript-only repositories, runtime probes,
dependency installation and public API changes are outside this job's scope.

## Create the bot locally

Install the host yourself if it is missing:

```sh
npm install -g @gitbot-hq/gitbot
```

Use an installed, signed-in Codex CLI and start the host:

```sh
gitbot start --host 127.0.0.1
```

Open the address it prints. In **Bots → Create manually**, copy the name,
description and emoji from `bot.json`, select **Codex**, and paste the full
`instructions.md` and `setup.md` texts into their fields. Leave the model unset
or select one available to your account in the working thread. For Codex choose
**Edit in the working directory**. The library preset `ask-permissions` maps to
`workspace-write` in GitBot 0.0.11; it does not provide per-tool approvals or a
supported tool allowlist.

The setup thread checks Node.js 20+, npm/npx and Git. If a tool is missing it
provides its installation command and waits for you. It never installs packages
or checks GitHub login. Install the analyzer yourself if neither a project-pinned
copy nor a standalone executable is available; the fallback version is 1.1.1:

```sh
npm install -g backend-doctor-cli@1.1.1
```

Local creation and Marketplace publication are separate. The public-library
submission is [PR #116](https://github.com/gitbot-hq/Library/pull/116), awaiting
maintainer review; this definition is not yet a Marketplace listing.

## Run on a prepared branch

Start from a clean checkout of your intended base. For example, if it is `main`:

```sh
git switch -c codex/backend-doctor-fixes main
```

Choose a unique branch name if that one already exists. Then create a fresh
GitBot thread in that checkout and send the example prompt or a greeting. The
bot must stop before editing on a default branch, dirty checkout or ambiguous
base. It never creates/switches branches or writes Git metadata.

The bot records the installed analyzer version and keeps it for the run. It
uses the repository configuration with `scan --scope all --format json`, examines
both warning and error findings, and requires analyzed files and no skipped
checks/internal failures before editing. Exit code 0 alone does not establish a
clean or complete audit.

After a focused correction it repeats the same full scan and required project
checks. Failed or unavailable verification blocks a ready-to-publish claim.
Ambiguous findings remain deferred. A clean scan with no findings produces a
report without edits or publication commands.

Review the final diff and the proposed PR text before running the suggested
scoped Git/PR commands yourself. GitHub CLI/authentication is needed in your
terminal only if you use `gh` for publication; publishing through GitHub's UI is
also possible. The bot does not upload raw reports or runtime traces.

## Runtime boundaries

The actual Codex edit sandbox denied `.git` writes during testing. Human branch
preparation and publication are part of this integration's contract. The bot's
instructions are not an enforced security boundary; Codex has no per-tool
approval channel in this GitBot adapter.

GitBot 0.0.11 binds to loopback by default. Keep `--host 127.0.0.1` explicit: its
web interface has no login. Do not expose it to other devices or run it with
`sudo`. The chosen agent may send prompts and code to its configured provider.

The standalone Codex CLI was updated by the user to 0.163.0. GitBot 0.0.11 uses
its bundled Codex SDK/CLI 0.155.1 to execute threads, so the host may use a different
version than `codex --version`. The inherited `gpt-6.1-sol` failed in that bundled
runtime; `gpt-6-sol` from the actual account catalog worked in the smoke requests.
The public definition deliberately has no model pin.

When changing an existing bot's setup instructions, use a fresh setup thread if
a resumed thread keeps following old requirements. Historical GitHub-login checks
failed inside the sandbox while the same login worked outside it; GitHub login
is not part of the current setup.

## Verification recorded on 2026-10-16

| Check | Evidence |
| --- | --- |
| Definition | Three supported files; valid field limits/enums; 506-word job; no name/slug collision among 28 listings at upstream commit `80a280b` |
| Local activation | Created through GitBot's own API; portable metadata, instructions and setup preserved |
| Actual original trial | Reproduced failing behavior, fixed async `forEach`, passed build/test/diff checks and rescanned 1 → 0 findings, with one analyzed file and no skips; branch creation was denied |
| Clean no-op | Actual run returned zero findings, ran build/test successfully after generating ignored build output, left the branch/source unchanged and suggested no publication commands |
| Default-branch refusal | Current definition stopped on main before scanning/editing, left the fixture unchanged and returned a human branch command |
| Revised prepared-branch workflow | Actual run passed: failing regression → passing test, full scan 1 → 0 with unchanged coverage, build/diff checks pass, only the source file changed; branch and HEAD remained unchanged; PR text and human commands were returned |
| CLI failure semantics | Warning returned 0; error returned 1; invalid scope returned 2 with clean stdout; JavaScript-only input exposed zero files; binary TypeScript input exposed skipped coverage despite exit 0 |
| Analyzer project | All 85 test files / 818 tests passed outside the network sandbox; typecheck passed |
| Public PR | [Library PR #116](https://github.com/gitbot-hq/Library/pull/116) submitted from yamkin29/Library; no test PR created in a target project |

Earlier sandboxed full-suite failures were local HTTP-listener `EPERM` failures;
the subsequent complete run passed. No package installation was performed by the
agent during verification.

## Submit to the GitBot Library

The contribution PR adds this bot to
[gitbot-hq/Library](https://github.com/gitbot-hq/Library), under author `yamkin29`.
It is separate from the PRs a bot user may publish for fixes in their own project.
Follow the current [contribution guide](https://github.com/gitbot-hq/Library/blob/main/CONTRIBUTING.md)
and [folder specification](https://github.com/gitbot-hq/Library/blob/main/docs/bot-schema.md).

Copy only `bot.json`, `instructions.md` and `setup.md` into
`bots/backend-doctor-fixer/` in the author's fork, on a new branch. Use two-space
JSON indentation there. Recheck catalog collisions and current validation tools.
The inspected upstream checkout had no package manifest, schema file or validator;
validation used its documented constraints. Do not add tooling or modify generated
`index.json`, `verified.json`, another bot or a per-bot license file.

Review the complete three-file diff before submission. The library releases
contributions under MIT. Maintainer review and merge are required before the
listing appears in Marketplace.
