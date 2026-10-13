# backend-doctor

[![CI](https://github.com/yamkin29/backend-doctor/actions/workflows/ci.yml/badge.svg)](https://github.com/yamkin29/backend-doctor/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/backend-doctor-cli)](https://www.npmjs.com/package/backend-doctor-cli)
[![npm downloads](https://img.shields.io/npm/dm/backend-doctor-cli)](https://www.npmjs.com/package/backend-doctor-cli)
[![GitHub Marketplace](https://img.shields.io/badge/GitHub-Marketplace-blue?logo=github)](https://github.com/marketplace/actions/backend-doctor-node-js-nestjs-static-analyzer)

A deterministic static analyzer for Node.js and NestJS backends. It reads your
TypeScript — controllers, providers, services, repositories, Prisma queries,
configuration — and reports what will bite in production: floating promises,
event-loop blocking calls, security holes, broken dependency wiring,
architecture drift.

- **Deterministic** — the same tree produces byte-identical findings, every
  time, so ids can be referenced in code review and CI conversations.
- **Precision over recall** — every rule is gated on an eval corpus whose
  clean application produces **zero** findings; a rule that cries wolf gets
  fixed or demoted before it ships.
- **Zero intrusion** — no changes to your code, build config or runtime. No
  network access, no telemetry: scans, traces and reports stay on your disk.

## Quick start

```sh
npx backend-doctor-cli@latest scan
```

That scans the current directory and opens the console in a supported terminal;
pipes and CI receive a regular pretty report. Exit code `0`
means no `error`-severity findings; warnings and skipped checks can still exist.
`1` means findings at `error` severity, `2` means a usage or
configuration problem (bad flag, unreadable backend-doctor config) — not a crash.

Static scanning supports `.ts`, `.tsx`, `.mts` and `.cts`; `.js`, `.cjs` and
`.mjs` are not analyzed. The report shows the analyzed file count and skipped
checks, including a clear notice when no supported source files were analyzed.
Syntax/read failures do not abort healthy-file checks. Incomplete import graphs
visibly skip unused-code conclusions. Re-exports and supported TypeScript
`baseUrl`/`paths` aliases (including inherited config origins) participate in
graph analysis; `tsconfig` include/exclude do not replace scan file selection.

For machine-readable output:

```sh
npx backend-doctor-cli@latest scan --format json    # one schemaVersion-1 document
npx backend-doctor-cli@latest scan --format jsonl   # one JSON object per finding
```

Use JSON when coverage matters: inspect `projects[].analyzedFileCount` and
`projects[].skippedChecks`. `complete: true` means full scan scope, not that every
check succeeded. JSONL contains only diagnostics, so empty JSONL does not prove
complete coverage or clean code. Partial scans skip project rules explicitly;
an empty changed-file scope is a successful empty scan.

Useful scan flags:

```sh
--scope changed        # only files changed in git (vs --base <ref>, default HEAD)
--scope lines          # only diagnostics inside changed hunks
--scope files --file <path> [--file <path> …]
--ignore "<glob>"      # exclude files, repeatable
--config <path>        # load exactly this config, skip discovery
--trace <dir>          # merge runtime findings from a probe session
--interactive          # require the console; incompatible with CI/JSON/dump-config
--no-interactive       # print the regular report, including in a terminal
```

## Interactive console

The console shows scan stages, severity counts, grouped findings and a local
findings score. Choose **Review issues** with Enter, then use these keys:

| Key | Action |
|-----|--------|
| ↑ / ↓ | Select a problem group; scroll in details/coverage/manual copy |
| ← / → | Visit every occurrence of the selected problem |
| Enter | Copy a repair task for all occurrences of the selected group |
| `d` | Open full details, source excerpt, explanation, fix and documentation |
| `s` | Inspect scope, frameworks, analyzed files and every skipped check |
| Esc | Return to the previous view |
| `q` | Exit with the scan's normal verdict |
| Ctrl+C | Interrupt and restore the terminal |

The result menu can also copy a task for the whole report or set up GitHub Actions.
Workflow setup displays the destination in the scanned package and requires `y`
confirmation; existing workflows are protected. Scanning and copying do not edit
application files or launch an AI assistant. Paste the copied task into your
assistant; it includes locations, guidance, coverage and a command to verify fixes.

Rule documentation ships locally and links to this repository on GitHub. Runtime
findings link to the runtime section below. There is no separate website yet.
Long details remain scrollable in narrow or short terminals. `NO_COLOR` disables
styling while keeping severity symbols and text.

The **Findings score (local heuristic)** is `max(0, 100 - 10 × E - 2 × W)`, where
`E` and `W` count error and warning groups, not repeated occurrences. Labels are
Good (90–100), Needs attention (70–89), and Critical (0–69). It makes no network
requests and is unavailable for partial scans, skipped checks or zero analyzed
files. A high score is not a claim that the application is healthy.

Clipboard tools: macOS `pbcopy`, Windows `clip`, Linux `wl-copy`, `xclip` or `xsel`.
Missing tools, unavailable clipboard sessions and failed copies open a scrollable
manual-copy view. Copy failures and workflow errors do not change the scan verdict.
The console needs TTY input/output, raw input and a usable `TERM`; explicit
`--interactive` rejects unsupported environments with exit `2`. Use
`--no-interactive`, `--format json` or `--format jsonl` for automation.

## Configuration

`backend-doctor.config.ts` (or `.json`, or a `backendDoctor` key in
`package.json`) is discovered by walking up to the nearest `.git`:

```ts
/** Severities: "error" | "warn" | "off". */
export default {
	rules: {
		"backend-doctor/no-floating-promises": "error",
		"backend-doctor/unused-file": "off",
	},
	categories: {
		Security: "error",
	},
	ignore: {
		files: ["**/*.spec.ts"],
		rules: [],
	},
};
```

Create a starter file with `npx backend-doctor-cli@latest init`. CLI flags
override config. Inspect what actually resolved with
`npx backend-doctor-cli@latest scan --dump-config`.

## Rules

Rules cover eight categories — Bugs, Correctness, Performance, Security,
Architecture, Maintainability, Configuration, Runtime — across async
correctness, event-loop blocking, Node security, Nest DI and layering, DTO
shape, Prisma usage, project-graph hygiene and config/env handling.

```sh
npx backend-doctor-cli@latest rules list          # every registered rule
npx backend-doctor-cli@latest rules explain backend-doctor/no-eval
```

Every rule has a markdown doc under `docs/rules/backend-doctor/<rule>.md` —
the problem it flags, a bad and a good example, and its config key. The docs
ship inside the npm package, so the path printed by `rules explain` resolves
from the installed package as well as from the repository. Nest- and
Prisma-specific rules activate automatically when those frameworks are
detected in the scanned project.

## CI (GitHub Actions)

Add one step to any pull-request workflow — it posts a sticky PR summary,
inline review comments on the changed lines and a commit status. Blocking is
opt-in (`blocking: none` by default — findings are reported, not failed):

```yaml
name: Backend Doctor

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  issues: write
  pull-requests: write
  statuses: write

jobs:
  backend-doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - uses: yamkin29/backend-doctor@v1
```

Listed in the
[GitHub Marketplace](https://github.com/marketplace/actions/backend-doctor-node-js-nestjs-static-analyzer).
Prefer a generated file? `ci install` writes exactly this workflow for you:

```sh
npx backend-doctor-cli@latest ci install
```

## Runtime probe

Prisma collection has a specific version/generator/loading boundary. See the
[verified compatibility matrix](docs/PRISMA_COMPATIBILITY.md) before interpreting
query counts; the Prisma 7 standard generator requires a separate loader feature.

Static analysis misses what only shows up while the process runs. The probe
starts your app instrumented — no code changes — and records event-loop lags,
blocking calls with file:line attribution, HTTP endpoint latencies, database
query counts and memory/GC signals:

```sh
npx backend-doctor-cli@latest probe -- npm start
npx backend-doctor-cli@latest probe --duration 60 -- node dist/main.js
```

Sessions land in `./.backend-doctor/probe/`. Merge them into a static scan:

```sh
npx backend-doctor-cli@latest scan --trace .backend-doctor/probe/<session>
```

Traces contain URLs and filesystem paths — they are treated as sensitive and
are never sent anywhere.

## For coding agents

The package ships an agent skill — a small instruction file that teaches
coding agents supporting the Agent Skills format to run a scoped scan after
backend edits and read the findings correctly. One command installs it:

```sh
npx backend-doctor-cli@latest install
```

With no flags that prints a detection report and writes nothing. Pick the
target explicitly — `--agent claude-code` (also read by Cursor and VS Code)
or `--agent codex`; `--scope project` writes into the current repo (default),
`--scope global` into your home directory. Re-running after an upgrade
reports "Up to date" or refuses with `--force` as the overwrite escape hatch.

Prefer to wire the skill by hand? It ships in the package:

```sh
npm install --no-save backend-doctor-cli
mkdir -p ~/.claude/skills
cp -r node_modules/backend-doctor-cli/skills/backend-doctor ~/.claude/skills/
```

Or run an ad-hoc scan without installing the skill:

```sh
npx backend-doctor-cli@latest scan --scope changed --format jsonl
```

Each jsonl line is one finding with a deterministic `id` (stable across runs),
`filePath`/`line`/`column`, the `rule` id, `category`, `severity`, `message`
and `tags` — empty output means no reported diagnostics; inspect JSON coverage
before calling the scan complete. Agents can read the offending rule's
doc from `docs/rules/backend-doctor/` in the installed package.

## Development

```sh
pnpm install
pnpm test        # vitest; builds the CLI first
pnpm test:prisma # real-client suite after tests/compat/README.md preparation
pnpm lint        # biome
pnpm build       # tsup → dist/
pnpm docs:rules  # rule-docs ↔ registry drift check
```

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for the
setup, the rule-authoring guide and the project's working rules. Every
shipped feature has its design history in [docs/specs/](docs/specs/).

## License

[MIT](./LICENSE)
