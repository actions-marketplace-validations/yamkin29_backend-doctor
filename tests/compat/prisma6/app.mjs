import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { PrismaClient } from "@prisma/client";
import scenario from "./scenario.cjs";

assert.equal(
	PrismaClient,
	createRequire(import.meta.url)(".prisma/client/default").PrismaClient,
);
await scenario(PrismaClient);
