import type { ChildProcess, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { copyToClipboard } from "../../../src/cli/console/clipboard.js";

function fakeSpawn(
	outcomes: Array<"ok" | "missing" | "failed" | "timeout" | "pipe">,
) {
	const calls: Array<{
		command: string;
		args: readonly string[];
		text: string;
		shell: unknown;
		killed: boolean;
	}> = [];
	const spawnImpl = ((
		command: string,
		args: readonly string[],
		options: { shell?: boolean },
	) => {
		const child = new EventEmitter() as ChildProcess;
		const stdin = new PassThrough();
		const stderr = new PassThrough();
		Object.assign(child, { stdin, stderr });
		const call = {
			command,
			args,
			text: "",
			shell: options.shell,
			killed: false,
		};
		calls.push(call);
		stdin.on("data", (chunk) => {
			call.text += chunk.toString();
		});
		child.kill = () => {
			call.killed = true;
			return true;
		};
		const outcome = outcomes.shift();
		setImmediate(() => {
			if (outcome === "missing")
				child.emit(
					"error",
					Object.assign(new Error("not found"), { code: "ENOENT" }),
				);
			else if (outcome === "pipe")
				stdin.emit("error", new Error("broken pipe"));
			else if (outcome !== "timeout") {
				stderr.write("tool message");
				child.emit("close", outcome === "ok" ? 0 : 1);
			}
		});
		return child;
	}) as typeof spawn;
	return { spawnImpl, calls };
}
describe("clipboard platform tools", () => {
	it.each([
		["darwin", "pbcopy"],
		["win32", "clip"],
		["linux", "wl-copy"],
	])("writes stdin only on %s", async (platform, command) => {
		const fake = fakeSpawn(["ok"]);
		expect(
			await copyToClipboard("hello $(no) `no` 'world'", {
				platform,
				spawnImpl: fake.spawnImpl,
			}),
		).toEqual({ ok: true });
		expect(fake.calls[0]).toMatchObject({
			command,
			text: "hello $(no) `no` 'world'",
			shell: false,
		});
		expect(fake.calls[0]?.args).not.toContain("hello");
	});
	it("tries Linux alternatives and explains missing tools", async () => {
		const fake = fakeSpawn(["missing", "missing", "ok"]);
		expect(
			await copyToClipboard("x", {
				platform: "linux",
				spawnImpl: fake.spawnImpl,
			}),
		).toEqual({ ok: true });
		expect(fake.calls.map((c) => c.command)).toEqual([
			"wl-copy",
			"xclip",
			"xsel",
		]);
		const missing = fakeSpawn(["missing", "missing", "missing"]);
		expect(
			await copyToClipboard("x", {
				platform: "linux",
				spawnImpl: missing.spawnImpl,
			}),
		).toMatchObject({ ok: false, error: expect.stringContaining("manual") });
	});
	it.each(["failed", "pipe", "timeout"] as const)(
		"reports %s without rejecting",
		async (outcome) => {
			const fake = fakeSpawn([outcome]);
			expect(
				await copyToClipboard("x", {
					platform: "darwin",
					spawnImpl: fake.spawnImpl,
					timeoutMs: 10,
				}),
			).toMatchObject({ ok: false, error: expect.any(String) });
			if (outcome === "timeout") expect(fake.calls[0]?.killed).toBe(true);
		},
	);
});
