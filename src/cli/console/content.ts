import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Diagnostic } from "../../core/types.js";
import { allProjectRules, allRules } from "../../engine/registry.js";
import "../../rules/index.js";
import { safeText } from "./model.js";

export const productLinks = {
	repository: "https://github.com/yamkin29/backend-doctor",
	documentation: "https://github.com/yamkin29/backend-doctor#readme",
	issues: "https://github.com/yamkin29/backend-doctor/issues",
};

export function installedPackageRoot(): string {
	const builtRoot = fileURLToPath(new URL("../../", import.meta.url));
	return fs.existsSync(path.join(builtRoot, "package.json"))
		? builtRoot
		: fileURLToPath(new URL("../../../", import.meta.url));
}

export interface Guidance {
	title: string;
	problem: string;
	fix: string;
	url?: string;
	localPath?: string;
	notice?: string;
}

function section(markdown: string, name: string): string {
	const heading = `## ${name}`;
	const lines = markdown.split(/\r?\n/);
	const start = lines.indexOf(heading);
	if (start < 0) return "";
	const end = lines.findIndex((line, i) => i > start && /^## /.test(line));
	return safeText(
		lines
			.slice(start + 1, end < 0 ? undefined : end)
			.join("\n")
			.trim(),
	);
}

export function loadGuidance(
	ruleId: string,
	root = installedPackageRoot(),
): Guidance {
	const runtime: Record<string, [string, string, string]> = {
		"backend-doctor/runtime-blocking-call": [
			"Blocking call observed at runtime",
			"A synchronous operation blocked the event loop during the recorded execution.",
			"Move blocking I/O to asynchronous APIs; move CPU work to a worker when appropriate. Repeat the probe and compare the recorded call site.",
		],
		"backend-doctor/runtime-possible-n1": [
			"Possible N+1 observed at runtime",
			"An endpoint issued enough database queries to exceed the probe threshold. This is a runtime signal, not proof of N+1.",
			"Inspect the endpoint's query pattern, batch related reads or load relations, then repeat the probe with the same workload.",
		],
	};
	const r = runtime[ruleId];
	if (r)
		return {
			title: r[0],
			problem: r[1],
			fix: r[2],
			url: `${productLinks.documentation.split("#")[0]}#runtime-probe`,
			localPath: path.join(root, "README.md"),
		};
	const rule = [...allRules(), ...allProjectRules()].find(
		(r) => r.id === ruleId,
	);
	if (!rule)
		return {
			title: safeText(ruleId),
			problem: "Inspect the reported diagnostic.",
			fix: "Inspect the root cause at the reported location.",
			notice: "Rule documentation unavailable: rule is not registered.",
		};
	const localPath = path.join(root, rule.docs);
	const base = {
		title: safeText(rule.title),
		url: `${productLinks.repository}/blob/main/${rule.docs}`,
		localPath,
	};
	try {
		const markdown = fs.readFileSync(localPath, "utf8");
		const problem = section(markdown, "Problem"),
			fix = section(markdown, "Good");
		return {
			...base,
			problem: problem || "Explanation unavailable.",
			fix: fix || "Repair example unavailable.",
			...(!problem || !fix
				? {
						notice:
							"Rule documentation sections unavailable: expected Problem and Good.",
					}
				: {}),
		};
	} catch (error) {
		return {
			...base,
			problem: "Explanation unavailable.",
			fix: "Repair example unavailable.",
			notice: safeText(
				`Rule documentation unavailable: ${(error as Error).message}`,
			),
		};
	}
}

const MAX_SOURCE_BYTES = 1024 * 1024;
export function sourceExcerpt(scanTarget: string, d: Diagnostic): string {
	let fd: number | undefined;
	try {
		const root = fs.realpathSync(scanTarget),
			file = fs.realpathSync(d.filePath);
		const rootIsFile = fs.statSync(root).isFile();
		const relative = path.relative(root, file);
		if (
			rootIsFile
				? file !== root
				: relative.startsWith(`..${path.sep}`) ||
					relative === ".." ||
					path.isAbsolute(relative)
		)
			return "Source excerpt unavailable: file is outside the scan target.";
		const stat = fs.statSync(file);
		if (!stat.isFile())
			return "Source excerpt unavailable: not a regular file.";
		if (stat.size > MAX_SOURCE_BYTES)
			return "Source excerpt unavailable: file is too large (limit 1 MiB).";
		fd = fs.openSync(file, "r");
		const buffer = Buffer.alloc(MAX_SOURCE_BYTES + 1);
		const bytes = fs.readSync(fd, buffer, 0, buffer.length, 0);
		if (bytes > MAX_SOURCE_BYTES)
			return "Source excerpt unavailable: file is too large (limit 1 MiB).";
		const lines = buffer.subarray(0, bytes).toString("utf8").split(/\r?\n/);
		const line = lines[d.line - 1];
		if (
			!Number.isInteger(d.line) ||
			!Number.isInteger(d.column) ||
			d.line < 1 ||
			d.column < 1 ||
			line === undefined ||
			d.column > line.length + 1
		)
			return "Source excerpt unavailable: invalid source location.";
		const start = Math.max(0, d.line - 3),
			end = Math.min(lines.length, d.line + 2),
			width = String(end).length;
		return lines
			.slice(start, end)
			.flatMap((text, i) => {
				const number = start + i + 1;
				const row = `${number === d.line ? ">" : " "} ${String(number).padStart(width)} | ${safeText(text)}`;
				return number === d.line
					? [
							row,
							`${" ".repeat(width + 5 + safeText(line.slice(0, d.column - 1)).length)}^`,
						]
					: [row];
			})
			.join("\n");
	} catch (error) {
		return safeText(`Source excerpt unavailable: ${(error as Error).message}`);
	} finally {
		if (fd !== undefined) fs.closeSync(fd);
	}
}
