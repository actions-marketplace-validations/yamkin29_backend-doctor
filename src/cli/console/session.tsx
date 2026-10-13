import path from "node:path";
import { Box, render, Text, useInput, useStdout } from "ink";
import { Component, type ReactNode, useEffect, useMemo, useState } from "react";
import type { ReportDocument } from "../../core/types.js";
import { workflowAction, workflowDestination } from "./actions.js";
import { type ClipboardResult, copyToClipboard } from "./clipboard.js";
import { loadGuidance, productLinks, sourceExcerpt } from "./content.js";
import { coverageLines, groupIssues, safeText, scoreReport } from "./model.js";
import {
	buildIssuePrompt,
	buildReportPrompt,
	type RepairScanOptions,
} from "./prompts.js";
import { initialState, type Navigation, navigate } from "./state.js";

export interface ConsoleOptions {
	target: string;
	scanOptions: RepairScanOptions;
	streams?: {
		stdin: NodeJS.ReadStream;
		stdout: NodeJS.WriteStream;
		stderr: NodeJS.WriteStream;
	};
	copy?: (text: string) => Promise<ClipboardResult>;
	installWorkflow?: typeof workflowAction;
	terminate?: (signal: NodeJS.Signals) => void;
	debug?: boolean;
}
export interface ConsoleSession {
	stage(text: string): void;
	present(doc: ReportDocument): Promise<void>;
	dispose(): void;
}

class Boundary extends Component<
	{ onError: (error: Error) => void; children: ReactNode },
	{ failed: boolean }
> {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	componentDidCatch(error: Error) {
		this.props.onError(error);
	}
	render() {
		return this.state.failed ? null : this.props.children;
	}
}

/** Wrap before slicing so long paths and documentation stay reachable on tiny TTYs. */
function wrap(text: string, width: number): string[] {
	return safeText(text)
		.split("\n")
		.flatMap((line) => {
			const chars = Array.from(line);
			if (!chars.length) return [""];
			const lines: string[] = [];
			for (let i = 0; i < chars.length; ) {
				let end = Math.min(chars.length, i + width);
				if (end < chars.length) {
					const space = chars.slice(i, end).lastIndexOf(" ");
					if (space > width / 3) end = i + space + 1;
				}
				lines.push(chars.slice(i, end).join(""));
				i = end;
			}
			return lines;
		});
}

function Results({
	doc,
	options,
	quit,
	interrupt,
}: {
	doc: ReportDocument;
	options: ConsoleOptions;
	quit: () => void;
	interrupt: () => void;
}) {
	const { stdout } = useStdout();
	const [size, setSize] = useState({
		columns: stdout.columns ?? 80,
		rows: stdout.rows ?? 24,
	});
	useEffect(() => {
		const resize = () =>
			setSize({ columns: stdout.columns ?? 80, rows: stdout.rows ?? 24 });
		stdout.on("resize", resize);
		return () => {
			stdout.off("resize", resize);
		};
	}, [stdout]);
	const [state, setState] = useState(initialState);
	const [feedback, setFeedback] = useState("");
	const [manual, setManual] = useState("");
	const [busy, setBusy] = useState(false);
	const groups = useMemo(() => groupIssues(doc.diagnostics), [doc]);
	const guidance = useMemo(
		() => groups.map((group) => loadGuidance(group.rule)),
		[groups],
	);
	const counts = groups.map((group) => group.diagnostics.length);
	const group = groups[state.group];
	const guide = guidance[state.group];
	const occurrence = group?.diagnostics[state.occurrence];
	const excerpt = useMemo(
		() => (occurrence ? sourceExcerpt(doc.directory, occurrence) : undefined),
		[doc.directory, occurrence],
	);
	const score = scoreReport(doc);
	const root = doc.projects[0]?.packageRoot ?? doc.directory;
	const compact = size.rows < 18;
	const width = Math.max(1, size.columns - 2);
	const pageSize = Math.max(1, size.rows - (compact ? 5 : 10));
	let maxScroll = 0;
	const go = (key: Navigation) =>
		setState((previous) => {
			const next = navigate(previous, key, counts);
			return { ...next, scroll: Math.min(next.scroll, maxScroll) };
		});
	const copy = async (all: boolean) => {
		if (busy) return;
		const prompt = all
			? buildReportPrompt(doc, options.scanOptions)
			: group
				? buildIssuePrompt(doc, group, options.scanOptions)
				: undefined;
		if (!prompt) {
			setFeedback("No issue selected. Coverage is available with s.");
			return;
		}
		setBusy(true);
		setFeedback("Copying repair task…");
		let result: ClipboardResult;
		try {
			result = await (options.copy ?? copyToClipboard)(prompt);
		} catch (error) {
			result = { ok: false, error: (error as Error).message };
		}
		setBusy(false);
		if (result.ok)
			setFeedback("✓ Copied repair task. Paste it into your AI assistant.");
		else {
			setManual(prompt);
			setFeedback(safeText(result.error));
			go("manual");
		}
	};
	useInput((input, key) => {
		if (key.ctrl && input === "c") {
			interrupt();
			return;
		}
		if (input === "q") {
			quit();
			return;
		}
		if (key.escape) {
			go("back");
			setFeedback("");
			return;
		}
		if (key.upArrow) {
			go("up");
			return;
		}
		if (key.downArrow) {
			go("down");
			return;
		}
		if (key.leftArrow) {
			go("left");
			return;
		}
		if (key.rightArrow) {
			go("right");
			return;
		}
		if (input === "s" && state.screen !== "coverage") {
			go("coverage");
			return;
		}
		if (input === "d" && state.screen === "review" && group) {
			go("detail");
			return;
		}
		if (state.screen === "confirm") {
			if (input === "y") {
				const result = (options.installWorkflow ?? workflowAction)(root, true);
				setFeedback(safeText(result.message));
				go("back");
			}
			if (input === "n") {
				setFeedback("Cancelled; no files written.");
				go("back");
			}
			return;
		}
		if (!key.return) return;
		if (state.screen === "results") {
			if (state.menu === 0) go("review");
			else if (state.menu === 1) void copy(true);
			else if (state.menu === 2) go("confirm");
			else quit();
		} else if (state.screen === "review" || state.screen === "detail")
			void copy(false);
	});

	const detail = [
		`${group?.severity === "error" ? "✖ ERROR" : "⚠ WARNING"} · ${guide?.title ?? group?.rule ?? "No issues"}`,
		group?.rule ?? "",
		occurrence
			? `${path.relative(doc.directory, occurrence.filePath) || path.basename(occurrence.filePath)}:${occurrence.line}:${occurrence.column} · occurrence ${state.occurrence + 1}/${counts[state.group]}`
			: "No diagnostic occurrences.",
		occurrence?.message ?? "",
		"",
		excerpt ?? "Source unavailable",
		"",
		"Why this matters",
		guide?.problem ?? "No guidance available.",
		"",
		"How to fix",
		guide?.fix ?? "",
		"",
		"Documentation:",
		guide?.url ?? "No web documentation available.",
		`Local: ${guide?.localPath ?? "unavailable"}`,
		...(guide?.notice ? [guide.notice] : []),
	].join("\n");
	let lines: string[] = [];
	if (state.screen === "results") {
		lines = [
			"Review issues",
			"Copy repair task for all issues",
			"Set up GitHub Actions",
			"Exit",
		].map((label, i) => `${state.menu === i ? "❯" : " "} ${label}`);
		if (!doc.diagnostics.length)
			lines.push("", "✓ No issues found in analyzed source.");
		if (!compact)
			lines.push(
				"",
				`Docs: ${productLinks.documentation}`,
				`Repository: ${productLinks.repository}`,
				`Feedback: ${productLinks.issues}`,
			);
	} else if (state.screen === "review") {
		if (!groups.length)
			lines = ["No issues to review. Press s for coverage and skipped checks."];
		else {
			const listHeight = compact
				? pageSize
				: Math.min(7, Math.max(1, Math.floor(pageSize / 2)));
			const start = Math.max(
				0,
				Math.min(
					state.group - Math.floor(listHeight / 2),
					groups.length - listHeight,
				),
			);
			lines = groups
				.slice(start, start + listHeight)
				.map(
					(item, index) =>
						`${start + index === state.group ? "❯" : " "} ${item.severity === "error" ? "✖" : "⚠"} ${item.category} · ${guidance[start + index]?.title ?? item.rule} (${item.diagnostics.length})`,
				);
			if (!compact)
				lines.push(
					"─".repeat(Math.min(width, 70)),
					...wrap(detail, width).slice(
						0,
						Math.max(0, pageSize - lines.length - 1),
					),
				);
		}
	} else if (state.screen === "detail") lines = wrap(detail, width);
	else if (state.screen === "coverage")
		lines = wrap(coverageLines(doc).join("\n"), width);
	else if (state.screen === "manual")
		lines = wrap(
			`Manual copy — select/copy this task; ↑/↓ scroll\n${manual}`,
			width,
		);
	else
		lines = wrap(
			`Create GitHub Actions workflow?\n${workflowDestination(root)}\n\nExisting files will be protected.\nPress y to create; n or Esc to cancel.`,
			width,
		);
	if (state.screen === "results" || state.screen === "review")
		lines = lines.map((line) => wrap(line, width)[0] ?? "");
	if (state.screen === "results")
		lines = lines.slice(Math.max(0, state.menu - pageSize + 1));
	maxScroll = Math.max(0, lines.length - pageSize);
	const offset = Math.min(state.scroll, maxScroll);
	const visible = lines.slice(offset, offset + pageSize);
	const errors = doc.diagnostics.filter(
		(item) => item.severity === "error",
	).length;
	const skipped = doc.projects.reduce((n, p) => n + p.skippedChecks.length, 0);
	const analyzed = doc.projects.reduce((n, p) => n + p.analyzedFileCount, 0);
	const hints =
		compact && state.screen === "review"
			? "↑↓ issues · ←→ sites · Enter copy · d · s · Esc · q"
			: state.screen === "results"
				? "↑/↓ select · Enter choose · s coverage · q exit"
				: state.screen === "review"
					? "↑/↓ issues · ←/→ sites · Enter copy · d details · s coverage · Esc back · q exit"
					: state.screen === "confirm"
						? "y confirm · n/Esc cancel · ↑/↓ scroll · q exit"
						: "↑/↓ scroll · ←/→ sites · Enter copy · Esc back · q exit";
	return (
		<Box flexDirection="column" width={Math.max(1, size.columns)}>
			<Text bold color="green">
				{compact ? "[+] BACKEND DOCTOR" : "[ + ]  B A C K E N D   D O C T O R"}
			</Text>
			{!compact && (
				<Text dimColor wrap="truncate">
					{safeText(doc.directory)} · {doc.mode} ·{" "}
					{doc.runtime ? "static + runtime" : "static analysis"}
				</Text>
			)}
			<Text
				color={"value" in score && score.value >= 90 ? "green" : "yellow"}
				wrap="truncate"
			>
				{"value" in score
					? `${score.value}/100 · ${score.label} · Findings score (local heuristic)`
					: `Findings score unavailable: ${score.reason}`}
			</Text>
			{!compact && (
				<Text wrap="truncate">
					{analyzed} files · {errors} errors · {doc.diagnostics.length - errors}{" "}
					warnings · {groups.length} groups · {skipped} skipped checks ·{" "}
					{doc.projects.flatMap((p) => p.frameworks).join(", ") ||
						"no framework detected"}
				</Text>
			)}
			{!compact && <Text dimColor>{"─".repeat(Math.min(width, 70))}</Text>}
			<Box flexDirection="column" minHeight={pageSize}>
				{visible.map((line, index) => (
					<Text
						// biome-ignore lint/suspicious/noArrayIndexKey: Stateless text rows represent fixed viewport positions.
						key={`${offset + index}`}
						wrap="truncate"
						color={
							line.startsWith("❯")
								? "cyan"
								: line.startsWith("✖")
									? "red"
									: undefined
						}
					>
						{safeText(line)}
					</Text>
				))}
			</Box>
			<Text color="green" wrap="truncate">
				{feedback ||
					(lines.length > pageSize &&
					!["review", "results"].includes(state.screen)
						? `Lines ${offset + 1}–${Math.min(lines.length, offset + pageSize)} of ${lines.length}`
						: `${state.screen} · ${state.group + 1}/${Math.max(1, groups.length)}${group ? ` · site ${state.occurrence + 1}/${group.diagnostics.length}` : ""}`)}
			</Text>
			<Text dimColor wrap="truncate">
				{hints}
			</Text>
		</Box>
	);
}

function Progress({
	text,
	target,
	interrupt,
}: {
	text: string;
	target: string;
	interrupt: () => void;
}) {
	useInput((input, key) => {
		if (key.ctrl && input === "c") interrupt();
	});
	return (
		<Box flexDirection="column">
			<Text bold color="green">
				[+] BACKEND DOCTOR
			</Text>
			<Text wrap="truncate">{safeText(target)}</Text>
			<Text color="cyan">› {safeText(text)}</Text>
			<Text dimColor>Ctrl+C interrupt</Text>
		</Box>
	);
}

export function startConsole(options: ConsoleOptions): ConsoleSession {
	const streams = options.streams ?? process;
	const wasRaw = streams.stdin.isRaw === true;
	let instance: ReturnType<typeof render> | undefined;
	let disposed = false;
	let failure: Error | undefined;
	let resolveDone: () => void = () => {};
	let rejectDone: (error: Error) => void = () => {};
	const done = new Promise<void>((resolve, reject) => {
		resolveDone = resolve;
		rejectDone = reject;
	});
	void done.catch(() => {});
	const dispose = () => {
		if (disposed) return;
		disposed = true;
		process.off("SIGINT", onSignalInt);
		process.off("SIGTERM", onSignalTerm);
		streams.stdout.off("error", fail);
		streams.stdin.off("error", fail);
		try {
			instance?.unmount();
			instance?.cleanup();
		} finally {
			if (streams.stdin.isTTY) streams.stdin.setRawMode(wasRaw);
			if (streams.stdout.isTTY) streams.stdout.write("\u001b[?25h");
		}
	};
	const fail = (error: Error) => {
		failure = error;
		dispose();
		rejectDone(error);
	};
	const quit = () => {
		dispose();
		resolveDone();
	};
	const signal = (value: NodeJS.Signals) => {
		quit();
		(options.terminate ?? ((signal) => process.kill(process.pid, signal)))(
			value,
		);
	};
	const onSignalInt = () => signal("SIGINT");
	const onSignalTerm = () => signal("SIGTERM");
	const show = (node: ReactNode) => {
		if (failure) throw failure;
		if (disposed) return;
		const wrapped = <Boundary onError={fail}>{node}</Boundary>;
		if (instance) instance.rerender(wrapped);
		else {
			instance = render(wrapped, {
				...streams,
				debug: options.debug,
				exitOnCtrlC: false,
				patchConsole: false,
			});
			void instance.waitUntilExit().catch(fail);
		}
	};
	process.on("SIGINT", onSignalInt);
	process.on("SIGTERM", onSignalTerm);
	streams.stdout.on("error", fail);
	streams.stdin.on("error", fail);
	try {
		show(
			<Progress
				text="Preparing scan"
				target={options.target}
				interrupt={onSignalInt}
			/>,
		);
	} catch (error) {
		fail(error as Error);
		throw error;
	}
	return {
		stage(text) {
			show(
				<Progress
					text={text}
					target={options.target}
					interrupt={onSignalInt}
				/>,
			);
		},
		async present(doc) {
			show(
				<Results
					doc={doc}
					options={options}
					quit={quit}
					interrupt={onSignalInt}
				/>,
			);
			await done;
		},
		dispose,
	};
}
