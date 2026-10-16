import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { workflowAction } from "../../../src/cli/console/actions.js";

it("requires confirmation, writes at the scanned root and protects existing workflows", () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "doctor-console-ci-"));
	try {
		const destination = path.join(root, ".github/workflows/backend-doctor.yml");
		expect(workflowAction(root, false)).toEqual({
			ok: false,
			message: "Cancelled; no files written.",
		});
		expect(fs.existsSync(destination)).toBe(false);
		expect(workflowAction(root, true)).toMatchObject({
			ok: true,
			message: expect.stringContaining(destination),
		});
		fs.writeFileSync(destination, "hand edited");
		expect(workflowAction(root, true)).toMatchObject({
			ok: false,
			message: expect.stringContaining("already exists"),
		});
		expect(fs.readFileSync(destination, "utf8")).toBe("hand edited");
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}
});
