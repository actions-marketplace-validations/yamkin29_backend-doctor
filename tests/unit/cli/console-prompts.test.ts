import { describe, expect, it } from "vitest";
import { groupIssues } from "../../../src/cli/console/model.js";
import {
	buildIssuePrompt,
	buildReportPrompt,
	verificationCommand,
} from "../../../src/cli/console/prompts.js";
import { diagnostic, report } from "../../helpers/console.js";

describe("console repair tasks (spec 028)", () => {
	it("copies all sites of a group, not just the selected occurrence", () => {
		const doc = report({
			diagnostics: [
				diagnostic(),
				diagnostic({ id: "b", line: 9, message: "Second occurrence" }),
			],
		});
		const group = groupIssues(doc.diagnostics)[0];
		if (!group) throw new Error("Missing fixture group");
		const a = buildIssuePrompt(doc, group, {});
		expect(a).toContain("src/a.ts:3:2");
		expect(a).toContain("src/a.ts:9:2");
		expect(a).toContain("Second occurrence");
		expect(a).toContain("root cause");
		expect(a).toContain("do not suppress");
		expect(a).toContain("Rule guide:");
		expect(a).not.toContain("--verbose");
		expect(a).toBe(buildIssuePrompt(doc, group, {}));
	});
	it("preserves config, ignore, selected files, base and trace with shell quoting", () => {
		const args = {
			config: "/configs/it's.ts",
			ignore: ["**/vendor/**"],
			scope: "files" as const,
			file: ["/project/a b.ts"],
			base: "topic",
			trace: "/trace/$x",
		};
		const command = verificationCommand("/project/`bad`", args);
		expect(command).toBe(
			"backend-doctor scan '/project/`bad`' --no-interactive --config '/configs/it'\\''s.ts' --ignore '**/vendor/**' --scope 'files' --base 'topic' --file '/project/a b.ts' --trace '/trace/$x'",
		);
	});
	it("includes all groups and skip limitations in a full task without controls", () => {
		const doc = report({
			mode: "files",
			diagnostics: [
				diagnostic({ message: "bad\u001b[31m" }),
				diagnostic({
					id: "b",
					rule: "backend-doctor/no-floating-promises",
					category: "Correctness",
				}),
			],
		});
		doc.projects[0]?.skippedChecks.push({
			check: "graph",
			reason: "partial scope",
		});
		const task = buildReportPrompt(doc, {});
		expect(task).toContain("backend-doctor/no-eval");
		expect(task).toContain("backend-doctor/no-floating-promises");
		expect(task).toContain("graph: partial scope");
		expect(task).toContain("Scope: files");
		expect(task).not.toContain("\u001b");
	});
});
