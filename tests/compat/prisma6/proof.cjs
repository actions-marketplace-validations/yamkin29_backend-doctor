// Design experiment only: public query extensions before production changes.
const assert = require("node:assert/strict");
const { PrismaClient } = require("@prisma/client");
const { AsyncLocalStorage } = require("node:async_hooks");

const context = new AsyncLocalStorage();
const events = [];
class InstrumentedClient extends PrismaClient {
	constructor(...args) {
		super(...args);
		// biome-ignore lint/correctness/noConstructorReturn: Prisma query extensions return a client proxy; this proof verifies constructor substitution.
		return this.$extends({
			name: "backend-doctor-compat-proof",
			query: {
				async $allOperations({ model, operation, args, query }) {
					const store = context.getStore();
					if (store) store.count++;
					const started = performance.now();
					try {
						return await query(args);
					} finally {
						events.push({
							model: model ?? null,
							operation,
							duration: performance.now() - started,
							attributed: !!store,
						});
					}
				},
			},
		});
	}
}
class PrismaService extends InstrumentedClient {
	hello() {
		return "subclass-method";
	}
	async onModuleInit() {
		await this.$connect();
	}
	async onModuleDestroy() {
		await this.$disconnect();
	}
}

async function main() {
	const imported = await import("@prisma/client");
	assert.equal(imported.PrismaClient, PrismaClient);
	const client = new PrismaService();
	const shape = {
		hello: typeof client.hello,
		onModuleInit: typeof client.onModuleInit,
		onModuleDestroy: typeof client.onModuleDestroy,
		instanceOfSubclass: client instanceof PrismaService,
	};
	console.log("subclass-shape", JSON.stringify(shape));
	const failures = [];
	for (const name of ["hello", "onModuleInit", "onModuleDestroy"]) {
		if (typeof client[name] !== "function") failures.push(`missing ${name}`);
	}
	try {
		await client.$connect();
		await client.user.deleteMany();
		const created = await client.user.create({ data: { name: "proof" } });
		assert.equal(created.name, "proof");
		assert.equal((await client.$queryRaw`SELECT 1 as value`)[0].value, 1n);
		const app = client.$extends({
			client: {
				appHello() {
					return "app-extension";
				},
			},
		});
		assert.equal(app.appHello(), "app-extension");
		assert.equal(await app.user.count(), 1);
		const before = events.length;
		const lazy = client.user.count();
		assert.equal(events.length, before, "PrismaPromise must remain lazy");
		assert.deepEqual(
			await client.$transaction([lazy, client.user.count()]),
			[1, 1],
		);
		assert.equal(events.length - before, 2, "batch operations count once");
		const store = { count: 0 };
		await context.run(store, async () => {
			const value = await client.$transaction(async (tx) => {
				assert.equal(await tx.user.count(), 1);
				return (await tx.user.findMany())[0].name;
			});
			assert.equal(value, "proof");
		});
		assert.equal(
			store.count,
			2,
			"interactive operations retain ALS attribution",
		);
		await assert.rejects(
			client.user.create({ data: { name: "proof" } }),
			(error) => error.code === "P2002",
		);
		console.log(
			"query-proof",
			JSON.stringify({
				passed: true,
				operations: events.length,
				attributed: events.filter((event) => event.attributed).length,
			}),
		);
	} finally {
		await client.$disconnect();
	}
	assert.deepEqual(
		failures,
		[],
		"Nest subclass lifecycle and methods must survive",
	);
}
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
