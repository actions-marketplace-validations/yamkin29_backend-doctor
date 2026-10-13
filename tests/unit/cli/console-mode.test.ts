import { describe, expect, it } from "vitest";
import { resolveConsoleMode } from "../../../src/cli/console-mode.js";

const terminal = {
	stdinTTY: true,
	stdoutTTY: true,
	rawMode: true,
	term: "xterm-256color",
	ci: false,
};
describe("console activation", () => {
	it("activates only on a usable pretty terminal", () => {
		expect(resolveConsoleMode({ format: "pretty" }, terminal)).toEqual({
			enabled: true,
		});
		for (const facts of [
			{ ...terminal, stdinTTY: false },
			{ ...terminal, stdoutTTY: false },
			{ ...terminal, rawMode: false },
			{ ...terminal, term: "dumb" },
			{ ...terminal, term: "" },
			{ ...terminal, ci: true },
		]) {
			expect(resolveConsoleMode({ format: "pretty" }, facts)).toEqual({
				enabled: false,
			});
			expect(
				resolveConsoleMode({ format: "pretty", interactive: true }, facts)
					.error,
			).toBeTruthy();
		}
	});
	it("keeps machine reports/dumps/opt-out outside the renderer", () => {
		for (const opts of [
			{ format: "json" },
			{ format: "jsonl" },
			{ format: "pretty", dumpConfig: true },
			{ format: "pretty", interactive: false },
		]) {
			expect(resolveConsoleMode(opts, terminal)).toEqual({ enabled: false });
		}
		for (const opts of [
			{ format: "json" },
			{ format: "jsonl" },
			{ format: "pretty", dumpConfig: true },
		]) {
			expect(
				resolveConsoleMode({ ...opts, interactive: true }, terminal).error,
			).toContain("--interactive");
		}
	});
});
