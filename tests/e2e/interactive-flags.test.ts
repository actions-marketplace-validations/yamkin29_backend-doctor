import fs from "node:fs";
import { expect, it } from "vitest";
import { runCli } from "./helpers.js";

const target = "tests/fixtures/engine/bad-app";
it("keeps piped/machine output identical with opt-out and rejects explicit interactive conflicts", () => {
	for (const format of ["pretty", "json", "jsonl"]) {
		expect(
			runCli(["scan", target, "--format", format, "--no-interactive"]),
		).toEqual(runCli(["scan", target, "--format", format]));
	}
	for (const args of [
		["--format", "json"],
		["--format", "jsonl"],
		["--dump-config"],
		[],
	]) {
		const res = runCli([
			"scan",
			"/nonexistent-target",
			"--interactive",
			...args,
		]);
		expect(res.exitCode).toBe(2);
		expect(res.stdout).toBe("");
		expect(res.stderr).toContain("--interactive");
		expect(res.stderr).not.toContain("Path does not exist");
	}
	const source = fs.readFileSync("dist/bin/backend-doctor.js", "utf8");
	expect(source).not.toMatch(/from ["'](?:ink|react)["']/);
});
