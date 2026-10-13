# Spec 028 — Interactive console (F028)

- **Status:** Approved — implementation authorized
- **Approved:** 2026-10-13; OQ-1..3 accepted by the user
- **Created:** 2026-10-13
- **Phase:** 6 — Quality and release
- **Depends on:** F003, F016, F017, F021, F023, F026 (Done)
- **Blocks:** None
- **Scope anchor:** The user's request for the console experience demonstrated
  with React Doctor, including issue-context copying and documentation links;
  a Backend Doctor website will be built later.

## Problem

Backend Doctor currently prints a flat list of findings after scanning. Developers
cannot browse grouped problems, inspect the affected code in the terminal, or copy
a focused repair task for an AI assistant. The user inspected React Doctor 0.9.18
live and requested the same core experience for Backend Doctor, with its own
identity and documentation.

## Verified facts and references

- `src/cli/commands/scan.ts` loads configuration/scope/trace, calls `runScan`,
  builds a report, renders a reporter, and returns `exitCodeFor(doc)`.
- `src/core/scan.ts` performs collection, parsing, framework detection, file rules,
  and project rules. It currently has no progress callback.
- `src/reporters/pretty.ts` reports coverage, skipped checks and individual
  diagnostics; JSON/JSONL have separate reporters.
- `src/core/types.ts` defines diagnostic position, rule, category, effective
  severity and message. It has no score, guidance or documentation URL fields.
- Both rule kinds in `src/engine/registry.ts` expose `title` and a repository-relative
  `docs` path. They have no separate recommendation field. Rule Markdown contains
  explanations and examples, is registry-checked, and ships in the npm package.
- `src/cli/commands/ci.ts` already installs workflows with an overwrite guard.
  `install.ts` installs agent skills; it does not launch an AI assistant.
- Runtime merged findings use two unregistered report-level rule ids
  (`runtime-blocking-call`, `runtime-possible-n1`). They need explicit guidance,
  rather than fabricated per-rule documentation links.
- The package supports Node >=20, targets Node 20 in tsup, and declares its GitHub
  repository/homepage in `package.json`. Public availability of those URLs could
  not be verified through the web fetch during this review.
- Primary interaction reference: [React Doctor](https://github.com/millionco/react-doctor),
  version 0.9.18 installed and exercised on 2026-10-13. The live run showed a branded
  header, stage progress, a result menu, grouped issue review, detail/code panes,
  documentation links, and Enter-to-copy repair prompts. Enter copies an entire
  selected rule group, not only its first occurrence.
- [Ink](https://github.com/vadimdemedes/ink) is a React terminal renderer. Its
  [6.0.1 package manifest](https://github.com/vadimdemedes/ink/blob/v6.0.1/package.json)
  declares Node >=20 and React >=19. This is a compatibility candidate, not an
  approval to install it or proof of our packaging behavior.
- Refero live research returned `NO_SUBSCRIPTION`. The captured live terminal and
  the skill's bundled semantic-color guidance supply the reference evidence.

## Goals

- Add a branded, keyboard-operated interface to interactive pretty scans.
- Show actual scan stages, coverage, severity counts and all skipped checks.
- Group findings by category/rule while allowing access to every occurrence.
- Show source locations, code excerpts, explanations, repair guidance and docs.
- Copy a focused repair task with Enter; also offer a complete report task.
- Offer the existing GitHub Actions installer through an explicit menu action.
- Show repository/documentation links now, with an internal URL resolver that can
  point to the future website in a later release.
- Preserve offline analysis, existing automation output and scan exit semantics.
- Subject to OQ-2, show a local, deterministic findings score and bar.

## Non-goals

- A website, hosted documentation, share-report URLs, analytics, telemetry or a
  remote score service: a future website feature owns this work.
- Automatically repairing code or launching external AI tools: a separate agent
  launch feature owns that work, subject to OQ-3.
- Changing rules, parser support, configuration precedence, JSON schemas, public
  exports, runtime instrumentation or the meanings of `complete` and exit codes.
- Redesigning `probe`'s live subprocess console: a later probe-UX feature owns it.
  This feature displays existing merged findings from `scan --trace`.
- Predicted scores after fixes, editor integration, search/filtering and saved
  review state: later console extensions may add them after this baseline ships.

## User stories

1. **Backend developer:** I run a scan in my terminal, review each problem with
   code and documentation, and copy a repair task into my preferred assistant.
2. **CI author:** My piped pretty, JSON and JSONL scans remain non-interactive,
   deterministic and compatible with existing failure policies.
3. **AI agent:** I receive a task naming one rule and its affected locations,
   with a reproducible verification command and guidance to fix the root cause.

## Contract / Model

### Activation and output

Proposed additive scan flags: `--interactive` and `--no-interactive`.

Auto mode enables the UI only for pretty output with TTY stdin/stdout, raw-mode
support, a usable terminal, and no active CI environment. `--no-interactive`
preserves the current reporter. Explicit `--interactive` with JSON/JSONL,
`--dump-config`, CI, or an unsupported terminal is a usage error: stderr and exit
2 before scanning. JSON/JSONL and dump-config in auto mode never load or render the
UI. Piped pretty output remains byte-compatible with its current reporter.

UI presentation is separate from the deterministic report. Animated stage
indicators use actual pipeline events; they do not invent a percentage or ETA.
No timer, score, group model or user navigation state enters ReportDocument.

### Result and issue browser

The result menu contains `Review issues`, `Copy repair task for all issues`,
`Set up GitHub Actions`, and `Exit`. The header shows Backend Doctor, scan target,
scope, detected frameworks, analyzed-file count, and severity totals. Coverage and
skipped-check reasons remain accessible even when there are no findings.

Issue groups use `(category, rule, effective severity)` as their key. Categories
follow `DIAGNOSTIC_CATEGORIES`; errors precede warnings within a category; rule ids
break ties lexicographically. Occurrences retain the existing diagnostic order.
Counts distinguish diagnostic occurrences from issue groups.

Up/Down selects a group; Left/Right selects an occurrence in that group; Enter
copies the group's repair task; Escape returns to results; `q` exits. The footer
always shows available keys. Resizing preserves selection. A compact layout must
still offer a reachable detail view; it must not silently hide all issue guidance.

Details contain effective severity, title, rule id, position, diagnostic message,
up to two source lines on either side of the target line, and a position marker.
Rule explanations/examples come from shipped Markdown; an unavailable doc or
source excerpt is reported visibly without dropping the finding. Source paths
outside the resolved scan tree are shown without reading an excerpt; this covers
external runtime culprit paths. Runtime findings receive explicit product-owned
guidance and links to relevant existing README sections.

### Repair tasks and clipboard

The selected-group prompt includes scan target, rule, effective severity, all
affected positions/messages, a rule explanation or reference, and these constraints:
fix the root cause; do not suppress the rule; avoid unrelated refactors. It ends
with a verification command using this project's existing CLI flags. Scope/base,
selected files and trace arguments are preserved. No invented `--verbose` flag.

The complete-report task includes all groups and coverage/skip limitations.
Source excerpts are not copied by default; the task identifies locations for the
assistant to inspect. Prompt construction is deterministic and shell arguments
in suggested commands are escaped as data.

Use platform clipboard tools with text passed on stdin and no shell interpolation.
On success show `Copied issue context`. On missing tools, permission failure,
nonzero exit or timeout, show the reason and selectable prompt text for manual
copying. Keep the report available and preserve its exit verdict. Copying never
launches an assistant or writes application files.

### Documentation and external actions

Rule links resolve from the registry's actual `docs` path to the repository's
GitHub Markdown page. Show the installed local doc location as well. Centralize
repository, documentation and issue-tracker URLs; do not add user config fields
or publish a placeholder website URL. GitHub URL availability must be checked
before release; if unavailable, label the local documentation as the working
source instead of presenting an unverified web destination as authoritative.

URLs remain readable when terminal hyperlink support is absent; OSC-8 is optional
when supported. Rendering a link never opens a browser or sends report content.
Terminal control characters from source text, diagnostics and paths are escaped
before display, including when embedded in copied prompts.

Selecting GitHub Actions setup shows the exact destination and asks for an explicit
confirm/cancel choice before invoking the existing installer in the scan project's
package root. An existing workflow is preserved; offer the existing manual command
instead of forcing an overwrite. Install failure stays visible in the UI and does
not replace the scan verdict. No PR posting or workflow execution occurs.

### Local score proposal (OQ-2)

If approved, use `max(0, 100 - 10 * E - 2 * W)`, where E/W count error/warning
groups defined above, not occurrences. Label it `Findings score (local heuristic)`;
it is a summary of active checks, not a guarantee of overall backend health.
Labels: 90–100 `Good`, 70–89 `Needs attention`, 0–69 `Critical`.
Display `Score unavailable` with the cause for partial scope, any skipped check,
or zero analyzed files. Do not add the score to JSON/JSONL or use it for exit codes.

### Lifecycle and compatibility

After a completed scan, `q`, Escape-to-results and ordinary exit use the existing
`exitCodeFor(doc)` (0/1). Interruptions use normal signal termination semantics,
without introducing a new numeric scan exit contract. Terminal state and cursor
must be restored on exit, interruption and UI failure. A UI initialization/render
failure is visible on stderr and emits the existing pretty report when available.
Node >=20, `schemaVersion: 1`, exports and config contracts remain unchanged.

## Reference lock for implementation

| Decision | Evidence | Required trait |
|----------|----------|----------------|
| Header and reading order | Live React Doctor result/review screens | Compact ASCII identity, summary above issues, guidance below selection |
| Progress and navigation | Live scan and shortcut footer | Actual stage labels, in-place updates, persistent key hints |
| Color roles | Live severity colors; bundled Refero color guidance | Red errors, yellow warnings, green success, cyan links; text/symbol equivalents |
| Density and sizing | Live 48-row and short WebStorm terminals | Terminal-owned background/font; bounded rows and reachable details on small screens |
| Documentation | User's request and registry Markdown paths | Real rule guides and local locations, future website URL replaceable centrally |

Use Backend Doctor branding. Preserve the reference's diagnostic hierarchy and
interactions; do not substitute a generic dashboard, excessive borders, a new
terminal background palette or decorative animation. No bitmap assets are needed.

## EARS acceptance criteria

- **AC-1:** WHEN auto activation conditions hold, THE SYSTEM SHALL display the
  interactive pretty scan interface.
- **AC-2:** WHEN output is piped, CI is active, `--no-interactive` is supplied, or
  the terminal is unsupported, THE SYSTEM SHALL retain existing non-interactive output.
- **AC-3:** WHEN JSON/JSONL or dump-config runs in auto mode, THE SYSTEM SHALL
  preserve its current stdout bytes without UI output or keyboard input.
- **AC-4:** WHEN explicit interactive mode conflicts with the contract, THE SYSTEM
  SHALL write a usage error on stderr and return 2 before scanning.
- **AC-5:** WHEN the pipeline enters a scan stage, THE SYSTEM SHALL show that stage
  without fabricating work completion or a percentage.
- **AC-6:** WHEN a report is ready, THE SYSTEM SHALL show its scope, frameworks,
  analyzed count, occurrence totals and every skipped-check reason.
- **AC-7:** WHEN a report is grouped, THE SYSTEM SHALL preserve every diagnostic
  in the specified group and occurrence order.
- **AC-8:** WHEN navigation keys or a terminal resize occur, THE SYSTEM SHALL
  preserve a valid selected group/occurrence and reachable details.
- **AC-9:** WHEN a source location is selected, THE SYSTEM SHALL show its bounded
  excerpt or a visible explanation of why no excerpt can be displayed.
- **AC-10:** WHEN a registered or runtime finding is selected, THE SYSTEM SHALL
  show its explanation, repair guidance and correct documentation destination.
- **AC-11:** WHEN Enter is pressed in issue review, THE SYSTEM SHALL copy a
  deterministic task for that whole group using the original scan arguments.
- **AC-12:** WHEN complete-report copying is selected, THE SYSTEM SHALL include
  all findings and coverage limitations in the task.
- **AC-13:** WHEN clipboard copying fails, THE SYSTEM SHALL show the cause and
  manual-copy text without altering the scan verdict.
- **AC-14:** WHEN a documentation link is displayed, THE SYSTEM SHALL show a
  readable destination without requiring hyperlink support or a network request.
- **AC-15:** WHEN source/diagnostic text contains terminal controls, THE SYSTEM
  SHALL render those controls as data rather than execute them.
- **AC-16:** WHEN GitHub Actions setup is confirmed, THE SYSTEM SHALL invoke the
  existing installer for the scan project and report its result without overwriting
  an existing workflow; cancellation SHALL perform no write.
- **AC-17:** WHEN a completed scan's UI exits or fails, THE SYSTEM SHALL restore
  terminal state and preserve its existing diagnostic exit verdict.
- **AC-18:** WHEN identical scan inputs are analyzed through either presentation,
  THE SYSTEM SHALL preserve the same diagnostics, ids, JSON/JSONL and schema version.
- **AC-19 (conditional on OQ-2):** WHEN a full scan has analyzed files and no
  skipped checks, THE SYSTEM SHALL show the specified local score and label.
- **AC-20 (conditional on OQ-2):** WHEN score eligibility fails, THE SYSTEM SHALL
  show the reason instead of a numeric score or clean-health claim.

## Testing strategy (TDD)

- Unit: activation matrix, groups/order, score boundaries, prompt command quoting,
  URL resolution, source excerpt limits/control escaping, and clipboard outcomes
  through injected adapters. Build temp trees; never depend on real clipboard
  contents or external services in automated tests.
- UI integration: keyboard transitions, occurrence changes, result actions,
  confirmation/cancel, compact detail access, resize and cleanup with fake streams.
- E2E: retain existing JSON/JSONL/pretty golden checks; test CLI flag conflicts,
  clean/error/zero-coverage/partial/combined scans and workflow preservation using
  the existing CLI helpers and evals. Packaging tests prove UI and Markdown work
  from an installed tarball on the declared Node floor.
- Live smoke: run built CLI in a real PTY and WebStorm Local terminal; inspect
  progress, grouping, detail excerpts, Enter-to-copy, documentation destinations,
  narrow/short layouts and terminal restoration. Run the good/bad eval applications.
- After approval, design.md must map AC-1..20 to tests, with AC-19/20 removed if
  scoring is deferred. tasks.md must order implementation red → green → refactor.

## Open questions for review

1. **Dependencies:** Approve Ink 6.x + React 19 as runtime dependencies and
   `@types/react` 19 as a development dependency, revisiting the earlier decision
   to omit Ink in RESEARCH? **Recommendation: yes.** Select compatible patch
   versions and validate packaging/Node 20 in design; keep the UI separate from
   JSON and the engine. Clipboard copying can use platform tools without a new
   clipboard package. No dependency is added by this draft.
2. **Score:** Include the transparent local formula above, or defer the numerical
   score and show severity/coverage counts only? **Recommendation: include the
   local heuristic with its label and coverage guard; no remote scoring.**
3. **Agent handoff scope:** Is copying a group or complete repair task sufficient
   for this release, with automatic CLI-agent launch designed separately?
   **Recommendation: yes.** Existing skill installation does not implement agent
   launch; approval of this console does not silently add that behavior.

All three recommendations were approved on 2026-10-13. Website creation remains
deferred as requested. The dependency choice, local score and clipboard-only
handoff are authorized; automatic CLI-agent launch remains separate.
