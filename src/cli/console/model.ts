import path from "node:path";
import {
	DIAGNOSTIC_CATEGORIES,
	type Diagnostic,
	type ReportDocument,
	type Severity,
} from "../../core/types.js";

export interface IssueGroup {
	key: string;
	rule: string;
	category: Diagnostic["category"];
	severity: Severity;
	diagnostics: Diagnostic[];
}

/** Escape terminal instructions from untrusted paths, source and diagnostics. */
export function safeText(text: string): string {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: deliberately escape terminal controls in untrusted text.
	return text.replace(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/g, (char) =>
		char === "\t"
			? "    "
			: `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
	);
}

export function groupIssues(diagnostics: readonly Diagnostic[]): IssueGroup[] {
	const groups = new Map<string, IssueGroup>();
	for (const d of diagnostics) {
		const key = JSON.stringify([d.category, d.rule, d.severity]);
		let group = groups.get(key);
		if (!group) {
			group = {
				key,
				rule: d.rule,
				category: d.category,
				severity: d.severity,
				diagnostics: [],
			};
			groups.set(key, group);
		}
		group.diagnostics.push(d);
	}
	return [...groups.values()].sort(
		(a, b) =>
			DIAGNOSTIC_CATEGORIES.indexOf(a.category) -
				DIAGNOSTIC_CATEGORIES.indexOf(b.category) ||
			Number(b.severity === "error") - Number(a.severity === "error") ||
			(a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : 0),
	);
}

export type FindingsScore =
	| { value: number; label: "Good" | "Needs attention" | "Critical" }
	| { reason: string };
export function scoreReport(doc: ReportDocument): FindingsScore {
	if (doc.mode !== "full" || doc.projects.some((p) => !p.complete))
		return { reason: "partial scan scope" };
	if (doc.projects.some((p) => p.skippedChecks.length > 0))
		return { reason: "one or more checks were skipped" };
	if (doc.projects.reduce((n, p) => n + p.analyzedFileCount, 0) === 0)
		return { reason: "no supported TypeScript files analyzed" };
	const groups = groupIssues(doc.diagnostics);
	const value = Math.max(
		0,
		100 - groups.reduce((n, g) => n + (g.severity === "error" ? 10 : 2), 0),
	);
	return {
		value,
		label: value >= 90 ? "Good" : value >= 70 ? "Needs attention" : "Critical",
	};
}

export function coverageLines(doc: ReportDocument): string[] {
	return [
		`Scope: ${doc.mode}`,
		...doc.projects.flatMap((p) => [
			`Project: ${path.relative(doc.directory, p.packageRoot) || "."}`,
			`Frameworks: ${p.frameworks.join(", ") || "none detected"}`,
			`Analyzed: ${p.analyzedFileCount} supported TypeScript files (${p.complete ? "full" : "partial"} scope)`,
			...(p.analyzedFileCount === 0
				? ["Coverage: no supported TypeScript source files were analyzed."]
				: []),
			`Skipped checks: ${p.skippedChecks.length}`,
			...p.skippedChecks.map((s) => `${s.check}: ${s.reason}`),
		]),
		...(doc.runtime ? [`Runtime trace: ${doc.runtime.sessionDir}`] : []),
	].map(safeText);
}
