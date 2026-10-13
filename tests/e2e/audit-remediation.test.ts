import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { expectSuccess, makeTmpDir, runCli } from "./helpers.js";

let root: string;
beforeEach(() => {
	root = makeTmpDir();
	fs.writeFileSync(path.join(root, "package.json"), '{"name":"audit-e2e"}');
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));
function write(name: string, content: string) {
	const file = path.join(root, name);
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, content);
}

test("CLI exposes binary-file skips even with zero issues; JSONL stays diagnostic-only", () => {
	write("broken.ts", "binary\u0000");
	const pretty = runCli(["scan", root]);
	expectSuccess(pretty);
	expect(pretty.stdout).toContain("Analyzed: 0 supported TypeScript files");
	expect(pretty.stdout).toContain("Skipped checks");
	expect(pretty.stdout).toContain("broken.ts: binary file");
	const json = runCli(["scan", root, "--format", "json"]);
	expectSuccess(json);
	expect(JSON.parse(json.stdout).projects[0]).toMatchObject({
		complete: true,
		analyzedFileCount: 0,
	});
	expect(JSON.parse(json.stdout).projects[0].skippedChecks).not.toEqual([]);
	const jsonl = runCli(["scan", root, "--format", "jsonl"]);
	expectSuccess(jsonl);
	expect(jsonl.stdout).toBe("");
});

test("JavaScript-only and scoped-empty scans report no supported source coverage and succeed", () => {
	write("app.js", 'eval("outside static coverage");');
	const full = runCli(["scan", root]);
	expectSuccess(full);
	expect(full.stdout).toContain(
		"no supported TypeScript source files were analyzed",
	);
	expect(spawnSync("git", ["init", "--quiet"], { cwd: root }).status).toBe(0);
	const scoped = runCli(["scan", root, "--scope", "files", "--file", "app.js"]);
	expectSuccess(scoped);
	expect(scoped.stdout).toContain("partial scope");
	expect(scoped.stdout).toContain(
		"no supported TypeScript source files were analyzed",
	);
	expect(scoped.stdout).toContain("project-rules:");
});

test("alias/barrel CLI reports are byte-identical in every format", () => {
	write("tsconfig.json", '{"compilerOptions":{"paths":{"@app/*":["src/*"]}}}');
	write("src/main.ts", 'import { used } from "@app/barrel"; void used;');
	write("src/barrel.ts", 'export { used } from "./service.js";');
	write("src/service.ts", "export const used = 1;");
	for (const format of ["pretty", "json", "jsonl"]) {
		const first = runCli(["scan", root, "--format", format]);
		const second = runCli(["scan", root, "--format", format]);
		expectSuccess(first);
		expectSuccess(second);
		expect(second.stdout).toBe(first.stdout);
		if (format === "json")
			expect(JSON.parse(first.stdout).diagnostics).toEqual([]);
	}
});
