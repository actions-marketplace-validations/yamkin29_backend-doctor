const assert = require("node:assert/strict");
const http = require("node:http");

module.exports = async function scenario(PrismaClient) {
	class PrismaService extends PrismaClient {
		ready = false;
		hello() {
			return "subclass-method";
		}
		async onModuleInit() {
			await this.$connect();
			this.ready = true;
		}
		async onModuleDestroy() {
			await this.$disconnect();
			this.ready = false;
		}
	}
	const client = new PrismaService({
		datasourceUrl: process.env.PRISMA_PROOF_DB,
	});
	let server;
	try {
		assert.equal(client.hello(), "subclass-method");
		await client.onModuleInit();
		assert.equal(client.ready, true);
		await client.$executeRawUnsafe(
			'CREATE TABLE "User" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "name" TEXT NOT NULL UNIQUE)',
		);
		const created = await client.user.create({
			data: { name: "private-query-value" },
		});
		assert.equal(created.name, "private-query-value");
		const handle = async () => {
			assert.equal((await client.$queryRaw`SELECT 1 as value`)[0].value, 1n);
			const lazy = client.user.count();
			assert.equal(lazy[Symbol.toStringTag], "PrismaPromise");
			assert.deepEqual(
				await client.$transaction([lazy, client.user.count()]),
				[1, 1],
			);
			assert.equal(
				await client.$transaction(async (tx) => {
					assert.equal(await tx.user.count(), 1);
					return (await tx.user.findMany())[0].name;
				}),
				"private-query-value",
			);
			let extensionCalls = 0;
			const extended = client.$extends({
				client: {
					appHello() {
						return this.hello();
					},
				},
				query: {
					user: {
						async findMany({ args, query }) {
							extensionCalls++;
							return query(args);
						},
					},
				},
			});
			assert.equal(extended.appHello(), "subclass-method");
			assert.equal(
				(await extended.user.findMany())[0].name,
				"private-query-value",
			);
			assert.equal(extensionCalls, 1);
			await assert.rejects(
				client.user.create({ data: { name: "private-query-value" } }),
				(error) => error.code === "P2002",
			);
			const rollback = new Error("host-rollback");
			await assert.rejects(
				client.$transaction(async (tx) => {
					await tx.user.create({ data: { name: "rolled-back" } });
					throw rollback;
				}),
				(error) => error === rollback,
			);
			assert.equal(
				await client.user.count({ where: { name: "rolled-back" } }),
				0,
			);
		};
		server = http.createServer((_req, res) => {
			handle().then(
				() => res.end("host-behavior-preserved"),
				(error) => {
					res.statusCode = 500;
					res.end(String(error));
				},
			);
		});
		await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
		const response = await fetch(
			`http://127.0.0.1:${server.address().port}/proof`,
		);
		assert.equal(await response.text(), "host-behavior-preserved");
		assert.equal(response.status, 200);
		console.log("prisma6-runtime-ok");
	} finally {
		if (server) {
			server.closeAllConnections();
			await new Promise((resolve) => server.close(resolve));
		}
		await client.onModuleDestroy();
		assert.equal(client.ready, false);
	}
};
