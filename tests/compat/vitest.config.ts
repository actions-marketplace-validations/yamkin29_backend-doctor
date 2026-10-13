import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globalSetup: ["./tests/globalSetup.ts"],
		include: ["tests/compat/prisma6/runtime.test.ts"],
		testTimeout: 30_000,
		env: { NO_COLOR: "1" },
	},
});
