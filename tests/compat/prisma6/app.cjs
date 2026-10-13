const assert = require("node:assert/strict");
const { PrismaClient } = require("@prisma/client");
assert.equal(PrismaClient, require(".prisma/client/default").PrismaClient);
assert.equal(PrismaClient, require(".prisma/client/index").PrismaClient);
require("./scenario.cjs")(PrismaClient).catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
