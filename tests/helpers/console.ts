import type { Diagnostic, ReportDocument } from "../../src/core/types.js";

export function diagnostic(overrides: Partial<Diagnostic> = {}): Diagnostic {
	return {
		id: "a",
		filePath: "/project/src/a.ts",
		line: 3,
		column: 2,
		rule: "backend-doctor/no-eval",
		category: "Security",
		severity: "warn",
		message: "Avoid eval",
		tags: [],
		...overrides,
	};
}

export function report(
	overrides: Partial<ReportDocument> = {},
): ReportDocument {
	return {
		schemaVersion: 1,
		mode: "full",
		directory: "/project",
		diagnostics: [diagnostic()],
		projects: [
			{
				packageRoot: "/project",
				frameworks: ["nest"],
				analyzedFiles: ["src/a.ts"],
				analyzedFileCount: 1,
				complete: true,
				skippedChecks: [],
			},
		],
		...overrides,
	};
}
