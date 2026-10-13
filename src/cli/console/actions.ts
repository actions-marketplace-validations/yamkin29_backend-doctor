import path from "node:path";
import { ciInstallCommand } from "../commands/ci.js";

export function workflowDestination(packageRoot: string): string {
	return path.join(packageRoot, ".github", "workflows", "backend-doctor.yml");
}

export function workflowAction(
	packageRoot: string,
	confirmed: boolean,
): { ok: boolean; message: string } {
	if (!confirmed) return { ok: false, message: "Cancelled; no files written." };
	let message = "";
	const write = (text: string) => {
		message += text;
	};
	const code = ciInstallCommand({}, packageRoot, {
		stdout: { write },
		stderr: { write },
	});
	return { ok: code === 0, message: message.trim() };
}
