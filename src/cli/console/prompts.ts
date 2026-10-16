import path from "node:path";
import type { ReportDocument } from "../../core/types.js";
import type { ScopeOption } from "../../scope/types.js";
import { loadGuidance } from "./content.js";
import {
	coverageLines,
	groupIssues,
	type IssueGroup,
	safeText,
} from "./model.js";

export interface RepairScanOptions {
	config?: string;
	ignore?: string[];
	scope?: ScopeOption;
	base?: string;
	file?: string[];
	trace?: string;
}
function quote(value: string): string {
	return `'${safeText(value).replace(/'/g, "'\\''")}'`;
}
export function verificationCommand(
	target: string,
	opts: RepairScanOptions,
): string {
	const args = ["backend-doctor", "scan", quote(target), "--no-interactive"];
	if (opts.config) args.push("--config", quote(opts.config));
	for (const ignore of opts.ignore ?? []) args.push("--ignore", quote(ignore));
	if (opts.scope) args.push("--scope", quote(opts.scope));
	if (opts.base) args.push("--base", quote(opts.base));
	for (const file of opts.file ?? []) args.push("--file", quote(file));
	if (opts.trace) args.push("--trace", quote(opts.trace));
	return args.join(" ");
}

function groupTask(doc: ReportDocument, group: IssueGroup): string {
	const guidance = loadGuidance(group.rule);
	return safeText(
		[
			`${group.severity.toUpperCase()} ${group.category}: ${guidance.title} (${group.rule}, ${group.diagnostics.length} occurrence(s))`,
			"Affected locations:",
			...group.diagnostics.map(
				(d) =>
					`- ${path.relative(doc.directory, d.filePath) || path.basename(d.filePath)}:${d.line}:${d.column}: ${d.message}`,
			),
			"",
			"Explanation:",
			guidance.problem,
			"",
			"Repair guidance:",
			guidance.fix,
			...(guidance.notice ? [guidance.notice] : []),
			...(guidance.url ? [`Rule guide: ${guidance.url}`] : []),
			...(guidance.localPath
				? [`Local documentation: ${guidance.localPath}`]
				: []),
		].join("\n"),
	);
}

const CONSTRAINTS =
	"Fix the root cause; do not suppress, disable or silence the rule. Keep unrelated refactors out of this pass.";
export function buildIssuePrompt(
	doc: ReportDocument,
	group: IssueGroup,
	opts: RepairScanOptions,
): string {
	return safeText(
		[
			`Fix one Backend Doctor rule in ${doc.directory}:`,
			"",
			groupTask(doc, group),
			"",
			CONSTRAINTS,
			"",
			"Scan coverage:",
			...coverageLines(doc),
			"",
			`Verify with: ${verificationCommand(doc.directory, opts)}`,
		].join("\n"),
	);
}
export function buildReportPrompt(
	doc: ReportDocument,
	opts: RepairScanOptions,
): string {
	return safeText(
		[
			`Fix the Backend Doctor findings in ${doc.directory}:`,
			"",
			...coverageLines(doc),
			"",
			CONSTRAINTS,
			"",
			...groupIssues(doc.diagnostics).map((g) => groupTask(doc, g)),
			"",
			`Verify with: ${verificationCommand(doc.directory, opts)}`,
		].join("\n"),
	);
}
