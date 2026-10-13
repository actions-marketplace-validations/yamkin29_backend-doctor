import { spawn } from "node:child_process";

export type ClipboardResult = { ok: true } | { ok: false; error: string };

export async function copyToClipboard(
	text: string,
	options: {
		platform?: string;
		spawnImpl?: typeof spawn;
		timeoutMs?: number;
	} = {},
): Promise<ClipboardResult> {
	const commands: Array<[string, string[]]> =
		(options.platform ?? process.platform) === "darwin"
			? [["pbcopy", []]]
			: (options.platform ?? process.platform) === "win32"
				? [["clip", []]]
				: [
						["wl-copy", []],
						["xclip", ["-selection", "clipboard"]],
						["xsel", ["--clipboard", "--input"]],
					];
	const errors: string[] = [];
	for (const [command, args] of commands) {
		const result = await new Promise<ClipboardResult>((resolve) => {
			let settled = false;
			let timer: ReturnType<typeof setTimeout> | undefined;
			const finish = (result: ClipboardResult) => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				resolve(result);
			};
			try {
				const child = (options.spawnImpl ?? spawn)(command, args, {
					shell: false,
					stdio: ["pipe", "ignore", "pipe"],
				});
				let stderr = "";
				child.stderr?.on("data", (chunk: Buffer) => {
					if (stderr.length < 1000)
						stderr += chunk.toString().slice(0, 1000 - stderr.length);
				});
				child.on("error", (error) =>
					finish({ ok: false, error: `${command}: ${error.message}` }),
				);
				child.on("close", (code) =>
					finish(
						code === 0
							? { ok: true }
							: { ok: false, error: `${command} exited ${code}: ${stderr}` },
					),
				);
				child.stdin?.on("error", (error) => {
					child.kill();
					finish({ ok: false, error: `${command}: ${error.message}` });
				});
				timer = setTimeout(() => {
					child.kill();
					finish({ ok: false, error: `${command} timed out` });
				}, options.timeoutMs ?? 2000);
				child.stdin?.end(text, "utf8");
			} catch (error) {
				finish({ ok: false, error: `${command}: ${(error as Error).message}` });
			}
		});
		if (result.ok) return result;
		errors.push(result.error);
	}
	return {
		ok: false,
		error: `Clipboard unavailable. Use manual copy. ${errors.join("; ")}`,
	};
}
