import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	loadGuidance,
	productLinks,
	sourceExcerpt,
} from "../../../src/cli/console/content.js";
import { allProjectRules, allRules } from "../../../src/engine/registry.js";
import "../../../src/rules/index.js";
import { diagnostic } from "../../helpers/console.js";

const dirs: string[] = [];
function tmp() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "doctor-console-"));
	dirs.push(dir);
	return dir;
}
afterEach(() => {
	for (const dir of dirs.splice(0))
		fs.rmSync(dir, { recursive: true, force: true });
});

describe("console guidance and code (spec 028)", () => {
	it("loads every registered rule's shipped explanation and good example", () => {
		for (const rule of [...allRules(), ...allProjectRules()]) {
			const g = loadGuidance(rule.id);
			expect(g.title).toBe(rule.title);
			expect(g.problem.length, rule.id).toBeGreaterThan(15);
			expect(g.fix.length, rule.id).toBeGreaterThan(15);
			expect(g.notice, rule.id).toBeUndefined();
			expect(g.url).toBe(`${productLinks.repository}/blob/main/${rule.docs}`);
			expect(fs.existsSync(g.localPath ?? "")).toBe(true);
		}
	});
	it("provides runtime guidance without inventing a registered-rule doc", () => {
		for (const id of ["runtime-blocking-call", "runtime-possible-n1"]) {
			const g = loadGuidance(`backend-doctor/${id}`);
			expect(g.url).toContain("#runtime-probe");
			expect(g.fix.length).toBeGreaterThan(20);
			expect(g.url).not.toContain("docs/rules");
		}
	});
	it("reports unknown, missing and malformed docs visibly", () => {
		expect(loadGuidance("backend-doctor/unknown").notice).toContain(
			"unavailable",
		);
		const root = tmp();
		expect(loadGuidance("backend-doctor/no-eval", root).notice).toContain(
			"unavailable",
		);
		fs.mkdirSync(path.join(root, "docs/rules/backend-doctor"), {
			recursive: true,
		});
		fs.writeFileSync(
			path.join(root, "docs/rules/backend-doctor/no-eval.md"),
			"# no-eval\nNo sections",
		);
		expect(loadGuidance("backend-doctor/no-eval", root).notice).toContain(
			"sections",
		);
	});
	it("shows bounded source and a caret, for directory and file targets", () => {
		const root = tmp(),
			file = path.join(root, "a.ts");
		fs.writeFileSync(file, "one\ntwo\nabc\nfour\nfive\nsix\n");
		const d = diagnostic({ filePath: file });
		const out = sourceExcerpt(root, d);
		expect(out).toContain("> 3 | abc");
		expect(out).toContain("^");
		expect(out).not.toContain("six");
		expect(sourceExcerpt(file, d)).toBe(out);
	});
	it("reports external, symlink escaping, missing, invalid and oversized sources", () => {
		const root = tmp(),
			outside = tmp(),
			file = path.join(outside, "a.ts");
		fs.writeFileSync(file, "abc\n");
		expect(sourceExcerpt(root, diagnostic({ filePath: file }))).toContain(
			"outside",
		);
		const link = path.join(root, "link.ts");
		fs.symlinkSync(file, link);
		expect(sourceExcerpt(root, diagnostic({ filePath: link }))).toContain(
			"outside",
		);
		expect(
			sourceExcerpt(
				root,
				diagnostic({ filePath: path.join(root, "missing.ts") }),
			),
		).toContain("unavailable");
		const local = path.join(root, "a.ts");
		fs.writeFileSync(local, "abc\n");
		expect(
			sourceExcerpt(root, diagnostic({ filePath: local, line: 99 })),
		).toContain("location");
		fs.writeFileSync(local, "a".repeat(1024 * 1024 + 1));
		expect(sourceExcerpt(root, diagnostic({ filePath: local }))).toContain(
			"large",
		);
	});
});
