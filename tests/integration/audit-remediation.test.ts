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
