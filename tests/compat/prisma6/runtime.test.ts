import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

const fixture = import.meta.dirname;
const hook = path.resolve(fixture, "../../../dist/probe/register.cjs");

test.each(["cjs", "mjs"])(
	"real Prisma 6.14 %s: results, errors, extensions, transactions, ALS and one event per operation",
	(format) => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), "bd-real-prisma-"));
		try {
			const eventsPath = path.join(root, "events.ndjson");
			const result = spawnSync(
				process.execPath,
				[
					"--require",
					hook,
					"--require",
					hook,
					path.join(fixture, `app.${format}`),
				],
				{
					cwd: fixture,
					encoding: "utf8",
					timeout: 20_000,
					env: {
						...process.env,
						PRISMA_PROOF_DB: `file:${path.join(root, "queries.db")}`,
						BACKEND_DOCTOR_PROBE_EVENTS: eventsPath,
						BACKEND_DOCTOR_PROBE_COLLECTORS: JSON.stringify({
							blockThresholdMs: 10,
							lagIntervalMs: 1000,
							n1Threshold: 20,
						}),
					},
				},
			);
			expect(result.status, result.stderr).toBe(0);
			expect(result.stdout).toContain("prisma6-runtime-ok");
			const events = fs
				.readFileSync(eventsPath, "utf8")
				.trim()
				.split("\n")
				.map((line) => JSON.parse(line));
			const queries = events.filter((event) => event.type === "db.query");
			expect(queries).toHaveLength(11);
			expect(queries.filter((event) => event.attributed)).toHaveLength(9);
			expect(
				events.find((event) => event.type === "http.request"),
			).toMatchObject({ route: "/proof", status: 200, dbQueries: 9 });
			expect(
				queries
					.filter((event) => event.model === null)
					.map((event) => event.action),
			).toEqual(["executeRawUnsafe", "queryRaw"]);
			for (const query of queries) {
				expect(query.durationMs).toBeGreaterThanOrEqual(0);
				expect(Object.keys(query).sort()).toEqual([
					"action",
					"attributed",
					"durationMs",
					"model",
					"pid",
					"timestamp",
					"type",
				]);
			}
			expect(JSON.stringify(queries)).not.toContain("private-query-value");
			expect(
				events.filter((event) => event.type === "probe.attach"),
			).toHaveLength(1);
		} finally {
			fs.rmSync(root, { recursive: true, force: true });
		}
	},
);
