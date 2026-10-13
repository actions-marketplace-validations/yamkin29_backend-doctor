import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, expect, it } from "vitest";
import { startConsole } from "../../src/cli/console/session.js";
import { diagnostic, report } from "../helpers/console.js";

const disposers: Array<() => void> = [];
afterEach(() => {
	for (const dispose of disposers.splice(0)) dispose();
});
const tick = () => new Promise<void>((r) => setTimeout(r, 60));
function terminal(rows = 30, columns = 100) {
	const input = new PassThrough();
	const output = new PassThrough();
	const error = new PassThrough();
	const raw: boolean[] = [];
	let text = "";
	Object.assign(input, {
		isTTY: true,
		isRaw: false,
		setRawMode: (value: boolean) => {
			raw.push(value);
			Object.assign(input, { isRaw: value });
		},
		ref: () => {},
		unref: () => {},
	});
	Object.assign(output, { isTTY: true, rows, columns });
	output.on("data", (chunk) => {
		text += chunk.toString();
	});
	return {
		stdin: input as unknown as NodeJS.ReadStream,
		stdout: output as unknown as NodeJS.WriteStream,
		stderr: error as unknown as NodeJS.WriteStream,
		raw,
		read: () => text,
		clear: () => {
			text = "";
		},
		key: async (text: string) => {
			input.write(text);
			await tick();
		},
	};
}
it("renders progress, navigates groups/sites, copies all sites and restores the terminal", async () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "doctor-console-ui-"));
	try {
		fs.writeFileSync(
			path.join(root, "index.ts"),
			"const x=1;\nconst y=2;\neval('x');\neval('y');\n",
		);
		const doc = report({
			directory: root,
			diagnostics: [
				diagnostic({ filePath: path.join(root, "index.ts"), column: 1 }),
				diagnostic({
					id: "b",
					filePath: path.join(root, "index.ts"),
					line: 4,
					column: 1,
				}),
			],
		});
		const tty = terminal();
		const copied: string[] = [];
		// cli-cursor installs a process-lifetime exit hook once; test session cleanup after initialization.
		const warm = startConsole({
			target: root,
			scanOptions: {},
			streams: terminal(),
			debug: true,
		});
		await tick();
		warm.dispose();
		await tick();
		const count = process.listenerCount("SIGINT");
		const session = startConsole({
			target: root,
			scanOptions: {},
			streams: tty,
			copy: async (text) => {
				copied.push(text);
				return { ok: true };
			},
			debug: true,
		});
		disposers.push(session.dispose);
		session.stage("Parsing source");
		await tick();
		expect(tty.read()).toContain("Parsing source");
		const done = session.present(doc);
		await tick();
		expect(tty.read()).toContain("Findings score");
		await tty.key("\r");
		expect(tty.read()).toContain("Security");
		await tty.key("\u001b[C");
		expect(tty.read()).toContain("2/2");
		await tty.key("d");
		for (let i = 0; i < 45; i++) await tty.key("\u001b[B");
		expect(tty.read()).toContain("Documentation:");
		expect(tty.read()).toContain("no-eval.md");
		expect(tty.read()).toContain("^");
		await tty.key("\r");
		expect(copied[0]).toContain("index.ts:3:1");
		expect(copied[0]).toContain("index.ts:4:1");
		expect(tty.read()).toContain("Copied repair task");
		await tty.key("\u001b");
		await tty.key("s");
		expect(tty.read()).toContain("Scope: full");
		Object.assign(tty.stdout, { columns: 60, rows: 8 });
		tty.stdout.emit("resize");
		await tick();
		await tty.key("q");
		await done;
		expect(tty.raw[0]).toBe(true);
		expect(tty.raw.at(-1)).toBe(false);
		expect(tty.stdin.listenerCount("readable")).toBe(0);
		expect(process.listenerCount("SIGINT")).toBe(count);
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
});
it("shows manual-copy fallback, coverage skips and no score for an empty scan", async () => {
	const tty = terminal(8, 60);
	const doc = report({
		diagnostics: [],
		projects: [
			{
				packageRoot: "/project",
				frameworks: [],
				analyzedFiles: [],
				analyzedFileCount: 0,
				complete: true,
				skippedChecks: [{ check: "read", reason: "binary source" }],
			},
		],
	});
	const session = startConsole({
		target: "/project",
		scanOptions: {},
		streams: tty,
		copy: async () => ({ ok: false, error: "No clipboard tool" }),
		debug: true,
	});
	disposers.push(session.dispose);
	const done = session.present(doc);
	await tick();
	expect(tty.read()).toContain("unavailable");
	await tty.key("\u001b[B");
	await tty.key("\r");
	expect(tty.read()).toContain("Manual copy");
	for (let i = 0; i < 30; i++) await tty.key("\u001b[B");
	expect(tty.read()).toContain("--no-interactive");
	await tty.key("\u001b");
	await tty.key("s");
	for (let i = 0; i < 8; i++) await tty.key("\u001b[B");
	expect(tty.read()).toContain("binary source");
	await tty.key("q");
	await done;
});
it("confirms workflow creation and cancellation explicitly", async () => {
	const tty = terminal();
	const calls: boolean[] = [];
	const session = startConsole({
		target: "/project",
		scanOptions: {},
		streams: tty,
		installWorkflow: (_root, confirmed) => {
			calls.push(confirmed);
			return { ok: true, message: "Created workflow" };
		},
		debug: true,
	});
	disposers.push(session.dispose);
	const done = session.present(report());
	await tick();
	await tty.key("\u001b[B");
	await tty.key("\u001b[B");
	await tty.key("\r");
	expect(tty.read()).toContain("/project/.github/workflows/backend-doctor.yml");
	expect(calls).toEqual([]);
	await tty.key("\u001b");
	expect(calls).toEqual([]);
	await tty.key("\r");
	await tty.key("y");
	expect(calls).toEqual([true]);
	await tty.key("q");
	await done;
});
it("rejects presentation failures after cleanup and handles Ctrl+C as a signal", async () => {
	const tty = terminal();
	const signals: string[] = [];
	const session = startConsole({
		target: "/project",
		scanOptions: {},
		streams: tty,
		terminate: (signal) => signals.push(signal),
		debug: true,
	});
	disposers.push(session.dispose);
	const done = session.present(report());
	await tick();
	await tty.key("\u0003");
	await done;
	expect(signals).toEqual(["SIGINT"]);
	expect(tty.raw.at(-1)).toBe(false);
	const broken = terminal();
	const failed = startConsole({
		target: "/project",
		scanOptions: {},
		streams: broken,
		debug: true,
	});
	disposers.push(failed.dispose);
	const pending = failed.present(report());
	await tick();
	broken.stdout.emit("error", new Error("renderer broken"));
	await expect(pending).rejects.toThrow("renderer broken");
	expect(broken.raw.at(-1)).toBe(false);
});
