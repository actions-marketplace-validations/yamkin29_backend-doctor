import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { expect, it } from "vitest";
import { runCli } from "./helpers.js";

const target = "tests/fixtures/engine/bad-app";
it("suppresses Ink color/style escapes with NO_COLOR even when color is forced", () => {
	const source = `
	import {PassThrough} from 'node:stream';
	import {startConsole} from './dist/bin/console.js';
	const stdin=new PassThrough();const stdout=new PassThrough();
	Object.assign(stdin,{isTTY:true,setRawMode(){},ref(){},unref(){}});
	Object.assign(stdout,{isTTY:true,columns:80,rows:24});
	stdout.on('data',chunk=>process.stdout.write(chunk));
	const session=startConsole({target:'/project',scanOptions:{},streams:{stdin,stdout,stderr:process.stderr},debug:true});
	setTimeout(()=>{session.dispose();},100);
	`;
	const output = execFileSync(
		process.execPath,
		["--input-type=module", "-e", source],
		{
			encoding: "utf8",
			env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "1" },
		},
	);
	expect(output).toContain("BACKEND DOCTOR");
	// biome-ignore lint/suspicious/noControlCharactersInRegex: Assert that ANSI style escapes are absent.
	expect(output).not.toMatch(/\u001b\[[\d;]*m/);
});
it("keeps piped/machine output identical with opt-out and rejects explicit interactive conflicts", () => {
	for (const format of ["pretty", "json", "jsonl"]) {
		expect(
			runCli(["scan", target, "--format", format, "--no-interactive"]),
		).toEqual(runCli(["scan", target, "--format", format]));
	}
	for (const args of [
		["--format", "json"],
		["--format", "jsonl"],
		["--dump-config"],
		[],
	]) {
		const res = runCli([
			"scan",
			"/nonexistent-target",
			"--interactive",
			...args,
		]);
		expect(res.exitCode).toBe(2);
		expect(res.stdout).toBe("");
		expect(res.stderr).toContain("--interactive");
		expect(res.stderr).not.toContain("Path does not exist");
	}
	const source = fs.readFileSync("dist/bin/backend-doctor.js", "utf8");
	expect(source).not.toMatch(/from ["'](?:ink|react)["']/);
});
