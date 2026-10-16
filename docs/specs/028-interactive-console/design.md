# Design 028 — Interactive console

Status: implemented; spec and OQ-1..3 approved 2026-10-13.

## Module layout

- `src/cli/console/model.ts`: deterministic groups, score, safe display text.
- `src/cli/console/content.ts`: packaged Markdown guidance and bounded excerpts.
- `src/cli/console/prompts.ts`: deterministic repair tasks and command quoting.
- `src/cli/console/clipboard.ts`: bounded platform-tool adapter, stdin-only text.
- `src/cli/console/state.ts`: pure keyboard/navigation reducer and scroll model.
- `src/cli/console/session.tsx`: Ink UI, stage/result/review/detail/coverage/action views.
- `src/cli/console-mode.ts`: activation validation and lazy session loader/types.
- `src/core/scan.ts`: optional presentation callback at real stage boundaries.
- `src/cli/commands/scan.ts`: session lifecycle around the existing scan/report.
- `src/cli/run.ts`: additive interactive flags.
- `tsup.config.ts`: separate console entry, external Ink/React, unchanged exports.
- `README.md`: interactive usage, keys, score, docs and clipboard limitations.

## Key decisions and alternatives

1. **Separate console build entry.** Load `dist/bin/console.js` only after activation.
   The source loader resolves it relative to the package root, like shipped skill
   resolution. Reject bundling Ink into the CLI entry: static dependency hoisting
   could load the renderer even for JSON. Add this entry to the tarball pin.
2. **Internal view model, unchanged reports.** Group by category/rule/effective
   severity; preserve occurrence order. Score counts groups with the approved
   formula. Reject adding score or guidance to the public diagnostic schema.
3. **Use shipped docs.** Read Problem and Good sections with a small heading parser;
   show doc absence or missing sections explicitly. Runtime ids have hand-written
   descriptions and a README runtime link. Resolve docs from the package root,
   never the scanned application's cwd. Reject network fetching and duplicated
   recommendation registries. Cache guidance per group in the UI session.
4. **Bounded excerpts.** Read only regular files within the real scan boundary
   (a file target permits that file), cap bytes, show two surrounding lines and
   a caret, and sanitize controls. External paths, symlinks escaping the root,
   unreadable files and invalid locations produce visible explanations.
5. **Progress is observational.** An optional stage observer runs at collection,
   parse, framework detection, file rules and project rules, with an event-loop
   yield only when the observer exists. JSON scans take the original path. UI
   observer/render failure must be isolated from analysis and reported by the CLI.
   Reject timers that pretend the synchronous parser has measurable progress.
6. **Pure navigation state.** Results, review, detail, coverage, manual-copy and CI
   confirmation are explicit screens. Review shows a bounded group window; `d`
   opens scrollable full details on every terminal size, and `s` opens coverage.
   Left/Right cycles occurrences; Enter always copies. Reject hidden detail panes
   without another access path. Resize derives layout rather than resetting state.
7. **Platform clipboard, no clipboard dependency.** macOS pbcopy; Windows clip;
   Linux wl-copy/xclip/xsel. Spawn without a shell, feed stdin, cap timeout, catch
   missing commands, stdin errors and nonzero exits. Return an actionable result.
   On failure open a scrollable manual-copy screen with the complete task.
8. **Workflow action reuses existing installer.** Confirm destination before calling
   ciInstallCommand at the scanned package root. Capture its existing output locally
   rather than corrupting Ink stdout; preserve the old direct-command behavior.
   Existing files retain their overwrite guard. Action failures never change scan exit.
9. **Lifecycle owned by session.** Restore raw mode/cursor/listeners on success,
   failure and signals. Completed scans keep exitCodeFor; interruptions re-raise
   their signal after cleanup. Report UI failures on stderr and render the legacy
   pretty report if available. No user input after the session has failed.
10. **URLs are centralized.** Use package repository coordinates and actual docs
    paths. Verify the GitHub destination during release smoke, never during a scan.
    Always display local documentation; no placeholder website URL. ANSI colors
    have semantic roles; NO_COLOR retains symbols/text. Background/font belong
    to the terminal. The approved live React Doctor reference owns hierarchy.
    A local Text wrapper disables Ink styles for NO_COLOR, even if FORCE_COLOR
    is also present; Ink's Chalk does not enforce that contract itself.

## Dependencies

Pin Ink 6.0.1, React 19.1.0 and development types @types/react 19.1.5.
Ink's published manifest declares Node >=20; its reconciler release matches React
19.1. Keep renderer dependencies external in the console build for Yoga/WASM assets.
No browser React DOM, clipboard package, UI widget package or test-renderer package.
Use Ink with fake TTY streams for integration tests and real PTY smoke afterward.
Verify an installed tarball with an isolated Node 20 runtime before close-out.

## Test map

| AC | Test |
|----|------|
| 1–4 | console-mode unit activation matrix; interactive CLI flag e2e |
| 5 | integration scan progress stages/report equality; UI progress view |
| 6 | console model/coverage view; zero/partial/combined CLI regression |
| 7 | groups unit test: mixed severity, category ordering, all occurrences |
| 8 | navigation reducer and Ink input/resize integration |
| 9 | content temp-tree tests: normal/file target/escape/read/location/size errors |
| 10 | all registered docs plus runtime guidance tests; rendered details |
| 11 | prompts with repeated sites and original scan options; Enter input integration |
| 12 | full prompt coverage/skip tests and result action integration |
| 13 | clipboard adapter success/missing/failure/timeout tests; manual-copy UI |
| 14 | centralized URLs/local docs tests; plain-link renderer integration |
| 15 | control escaping model/content/prompt/rendered output; forced-color subprocess NO_COLOR regression |
| 16 | CI confirmation/cancel unit/UI integration plus existing-workflow protection |
| 17 | session success/failure/cleanup tests; live PTY verdicts/signals |
| 18 | progress observer report equality; existing JSON/JSONL golden/eval suite |
| 19–20 | score boundaries/group counts/coverage guards and header integration |

## Visual verification

Inspect real terminal stage/result/review/detail screens against the spec's
reference lock. Verify large, 60-column and short layouts; active selection,
semantic colors, code marker, docs, copy feedback and readable key hints.
No bitmap or browser design assets are required.
