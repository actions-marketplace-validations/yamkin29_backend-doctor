export interface TerminalFacts {
	stdinTTY: boolean;
	stdoutTTY: boolean;
	rawMode: boolean;
	term: string;
	ci: boolean;
}

export function resolveConsoleMode(
	opts: { format: string; interactive?: boolean; dumpConfig?: boolean },
	terminal: TerminalFacts,
): { enabled: boolean; error?: string } {
	if (opts.interactive === false) return { enabled: false };
	const reason =
		opts.format !== "pretty"
			? "requires --format pretty"
			: opts.dumpConfig
				? "cannot be combined with --dump-config"
				: terminal.ci
					? "is unavailable in CI"
					: !terminal.stdinTTY ||
							!terminal.stdoutTTY ||
							!terminal.rawMode ||
							!terminal.term ||
							terminal.term === "dumb"
						? "requires an interactive terminal with raw input and a usable TERM"
						: undefined;
	if (reason)
		return opts.interactive === true
			? { enabled: false, error: `--interactive ${reason}` }
			: { enabled: false };
	return { enabled: true };
}

export function terminalFacts(): TerminalFacts {
	return {
		stdinTTY: process.stdin.isTTY === true,
		stdoutTTY: process.stdout.isTTY === true,
		rawMode: typeof process.stdin.setRawMode === "function",
		term: process.env.TERM ?? "",
		ci: Boolean(
			process.env.CI && !["false", "0"].includes(process.env.CI.toLowerCase()),
		),
	};
}
