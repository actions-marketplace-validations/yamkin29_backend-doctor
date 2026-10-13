import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { defaultConfig } from "../../src/config/types.js";
import { runScan } from "../../src/core/scan.js";

let root: string;
beforeEach(() => {
	root = fs.mkdtempSync(path.join(os.tmpdir(), "backend-doctor-audit-"));
	write("package.json", JSON.stringify({ name: "audit-regression" }));
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

function write(name: string, content: string): string {
	const file = path.join(root, name);
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, content);
	return file;
}
function scan(ignore: string[] = []) {
	return runScan({ directory: root, ignore, config: defaultConfig() });
}

test.each(["syntax", "binary"])(
	"%s failure keeps healthy rules running and suppresses unsafe unused claims",
	async (kind) => {
		write("src/main.ts", 'eval("healthy-file");');
		write(
			"src/broken.ts",
			kind === "syntax"
				? 'eval("broken-file"); export function broken( {'
				: "binary\u0000",
		);
		write("src/orphan.ts", "export const orphan = 1;");
		const result = await scan();
		expect(result.projects[0]?.analyzedFiles).toEqual([
			"src/main.ts",
			"src/orphan.ts",
		]);
		expect(result.projects[0]?.complete).toBe(true);
		expect(result.diagnostics.map((d) => d.rule)).toEqual([
			"backend-doctor/no-eval",
		]);
		expect(
			result.projects[0]?.skippedChecks.some(
				(s) => s.check === "read" && s.reason.startsWith("src/broken.ts:"),
			),
		).toBe(true);
		expect(
			result.projects[0]?.skippedChecks.filter((s) =>
				s.check.includes("unused"),
			),
		).toHaveLength(3);
		expect(await scan()).toEqual(result);
	},
);

test("unreadable tsconfig is visible even without module references", async () => {
	fs.mkdirSync(path.join(root, "tsconfig.json"));
	write("src/main.ts", "const value = 1;");
	const result = await scan();
	expect(
		result.projects[0]?.skippedChecks.some(
			(s) =>
				s.check === "module-resolution" &&
				s.reason.startsWith("tsconfig.json:"),
		),
	).toBe(true);
});

test("barrel chains keep used files reachable and report re-export cycles", async () => {
	write("src/main.ts", 'import { used } from "./barrel.js"; void used;');
	write("src/barrel.ts", 'export { used } from "./all.js";');
	write("src/all.ts", 'export * from "./service.js";');
	write("src/service.ts", "export const used = 1;");
	expect((await scan()).diagnostics).toEqual([]);
	write(
		"src/service.ts",
		'export const used = 1;\nexport * from "./barrel.js";',
	);
	const result = await scan();
	expect(
		result.diagnostics.filter(
			(d) => d.rule === "backend-doctor/circular-dependency",
		),
	).toHaveLength(3);
	expect(
		result.diagnostics.find(
			(d) =>
				d.filePath.endsWith("service.ts") &&
				d.rule === "backend-doctor/circular-dependency",
		)?.line,
	).toBe(2);
	expect(
		result.diagnostics.some((d) => d.rule === "backend-doctor/unused-file"),
	).toBe(false);
	expect(await scan()).toEqual(result);
});

test("tsconfig aliases resolve exact, best wildcard, ordered fallback and baseUrl imports", async () => {
	write(
		"tsconfig.json",
		JSON.stringify({
			compilerOptions: {
				baseUrl: ".",
				paths: {
					exact: ["src/service.ts"],
					"@app/*": ["missing/*", "src/*"],
					"@app/special/*": ["special/*"],
				},
			},
			include: ["nothing/**/*.ts"],
			exclude: ["src"],
		}),
	);
	write(
		"src/main.ts",
		'import { used } from "exact"; import "@app/other"; import "@app/special/target"; import "src/base"; void used;',
	);
	write("src/service.ts", "export const used = 1;");
	write("src/other.ts", "export const other = 1;");
	write("special/target.ts", "export const special = 1;");
	write("src/base.ts", "export const base = 1;");
	const result = await scan();
	expect(result.diagnostics).toEqual([]);
	expect(result.projects[0]?.analyzedFileCount).toBe(5);
	expect(result.projects[0]?.skippedChecks).toEqual([]);
});

test("inherited paths retain config origin and nearest config wins for nested importers", async () => {
	write(
		"config/base.json",
		JSON.stringify({
			compilerOptions: { paths: { "origin/*": ["../src/*"] } },
		}),
	);
	write("tsconfig.json", JSON.stringify({ extends: "./config/base.json" }));
	write("src/main.ts", 'import "origin/service"; import "./nested/entry.js";');
	write("src/service.ts", "export const value = 1;");
	write(
		"src/nested/tsconfig.json",
		JSON.stringify({
			compilerOptions: { baseUrl: ".", paths: { nested: ["./target.ts"] } },
		}),
	);
	write("src/nested/entry.ts", 'import "nested";');
	write("src/nested/target.ts", "export const value = 1;");
	expect((await scan()).diagnostics).toEqual([]);
	write(
		"config/base.json",
		JSON.stringify({
			compilerOptions: { baseUrl: "..", paths: { "origin/*": ["src/*"] } },
		}),
	);
	expect((await scan()).diagnostics).toEqual([]);
});

test.each(["invalid", "missing-extends", "unresolved", "ignored"])(
	"%s internal resolution is visible and prevents speculative unused findings",
	async (mode) => {
		write("src/main.ts", 'import "@app/service";');
		write("src/service.ts", "export const value = 1;");
		const config =
			mode === "invalid"
				? "{"
				: JSON.stringify(
						mode === "missing-extends"
							? { extends: "./missing.json" }
							: {
									compilerOptions: {
										paths: {
											"@app/*": [mode === "unresolved" ? "missing/*" : "src/*"],
										},
									},
								},
					);
		write("tsconfig.json", config);
		const result = await scan(mode === "ignored" ? ["src/service.ts"] : []);
		expect(
			result.projects[0]?.skippedChecks.some(
				(s) => s.check === "module-resolution",
			),
		).toBe(true);
		expect(
			result.projects[0]?.skippedChecks.some(
				(s) => s.check === "backend-doctor/unused-file",
			),
		).toBe(true);
		expect(result.diagnostics.filter((d) => d.rule.includes("unused"))).toEqual(
			[],
		);
		expect(await scan(mode === "ignored" ? ["src/service.ts"] : [])).toEqual(
			result,
		);
	},
);

test("an internal alias does not count as importing the same-named npm package", async () => {
	write(
		"package.json",
		JSON.stringify({
			name: "alias-package",
			dependencies: { alias: "1.0.0", external: "1.0.0" },
		}),
	);
	write(
		"tsconfig.json",
		JSON.stringify({
			compilerOptions: { paths: { alias: ["src/service.ts"] } },
		}),
	);
	write("src/main.ts", 'import "alias"; import "external/subpath";');
	write("src/service.ts", "export const value = 1;");
	const result = await scan();
	expect(
		result.diagnostics.map((d) => [d.rule, d.message.split(" ")[0]]),
	).toEqual([["backend-doctor/unused-dependency", "alias"]]);
});
