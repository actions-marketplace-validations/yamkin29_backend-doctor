import path from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { scanCommand } from "../../src/cli/commands/scan.js";
import { loadConsole, resolveConsoleMode } from "../../src/cli/console-mode.js";

vi.mock("../../src/cli/console-mode.js", () => ({
	loadConsole: vi.fn(),
	resolveConsoleMode: vi.fn(),
	terminalFacts: vi.fn(),
}));
afterEach(() => vi.restoreAllMocks());
it.each(["load", "stage", "present"])(
	"falls back visibly after a %s failure without changing the verdict",
	async (phase) => {
		const out = vi
			.spyOn(process.stdout, "write")
			.mockImplementation(() => true);
		const err = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		const opts = {
			format: "pretty" as const,
			ignore: [],
			scope: "all" as const,
			file: [],
		};
		const target = path.resolve("tests/fixtures/engine/bad-app");
		vi.mocked(resolveConsoleMode).mockReturnValue({ enabled: false });
		const original = await scanCommand(target, opts);
		const bytes = out.mock.calls.map((c) => c[0]).join("");
		out.mockClear();
		const dispose = vi.fn();
		vi.mocked(resolveConsoleMode).mockReturnValue({ enabled: true });
		const fail = () => {
			throw new Error(`broken ${phase}`);
		};
		if (phase === "load")
			vi.mocked(loadConsole).mockRejectedValue(new Error("broken load"));
		else
			vi.mocked(loadConsole).mockResolvedValue({
				startConsole: () => ({
					stage: phase === "stage" ? fail : () => {},
					present: phase === "present" ? fail : async () => {},
					dispose,
				}),
			});
		expect(await scanCommand(target, opts)).toBe(original);
		expect(out.mock.calls.map((c) => c[0]).join("")).toBe(bytes);
		expect(err.mock.calls.map((c) => c[0]).join("")).toContain(
			`Interactive console unavailable: broken ${phase}`,
		);
		if (phase !== "load") expect(dispose).toHaveBeenCalledOnce();
	},
);
