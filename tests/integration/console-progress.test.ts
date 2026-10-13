import path from "node:path";
import { expect, it } from "vitest";
import { defaultConfig } from "../../src/config/types.js";
import { runScan } from "../../src/core/scan.js";

it("observes actual pipeline stages without changing analysis", async () => {
	const input = {
		directory: path.resolve("tests/fixtures/engine/bad-app"),
		ignore: [],
		config: defaultConfig(),
	};
	const original = await runScan(input);
	const stages: string[] = [];
	const observed = await runScan(input, (stage) => {
		stages.push(stage);
	});
	expect(stages).toEqual([
		"Collecting files",
		"Parsing source",
		"Detecting frameworks",
		"Checking file rules",
		"Checking project rules",
	]);
	expect(observed).toEqual(original);
});
