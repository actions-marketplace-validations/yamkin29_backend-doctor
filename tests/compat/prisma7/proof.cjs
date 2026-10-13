// Compile generated/client/client.ts to generated/built/client.cjs with tsup.
const assert = require("node:assert/strict");
const Module = require("node:module");
const loads = [];
const originalLoad = Module._load;
Module._load = function (id, ...args) {
	const value = originalLoad.call(this, id, ...args);
	if (value && typeof value.PrismaClient === "function") {
		const matches = ["@prisma/client", ".prisma/client"].some(
			(name) => id === name || id.includes(`node_modules/${name}/`),
		);
		loads.push({ id, matches });
	}
	return value;
};
const { PrismaClient } = require("./generated/built/client.cjs");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
async function main() {
	const client = new PrismaClient({
		adapter: new PrismaBetterSqlite3({ url: "file:./proof.db" }),
	});
	try {
		await client.user.deleteMany();
		const value = await client.user.create({ data: { name: "proof7" } });
		assert.equal(value.name, "proof7");
		assert.equal(await client.user.count(), 1);
		console.log("prisma7-loads", JSON.stringify(loads));
		console.log(
			"prisma7-real-query",
			JSON.stringify({
				passed: true,
				extends: typeof client.$extends,
				interceptedClientLoads: loads.filter((load) => load.matches).length,
			}),
		);
		assert.equal(
			loads.filter((load) => load.matches).length,
			0,
			"default generator bypasses existing hook's class interception",
		);
	} finally {
		await client.$disconnect();
	}
}
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
