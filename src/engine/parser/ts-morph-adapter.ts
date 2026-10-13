import fs from "node:fs";
import path from "node:path";
import { Node, Project, type SourceFile, SyntaxKind, ts } from "ts-morph";
import type {
	FileLoadFailure,
	ModuleResolution,
	ParserAdapter,
	ProjectLoadResult,
	SourceFilePosition,
	SourceFileView,
} from "./types.js";

/**
 * The only module allowed to import ts-morph at runtime (constitution §4,
 * spec 003 open question 2). Files are loaded from explicit paths. Spec 026
 * consults tsconfig only for resolution, never to select the analyzed set.
 */
export class TsMorphParserAdapter implements ParserAdapter {
	readonly name = "ts-morph";

	createProject(
		filePaths: string[],
		options?: { packageRoot: string },
	): ProjectLoadResult {
		const project = new Project({
			skipAddingFilesFromTsConfig: true,
			skipFileDependencyResolution: true,
		});
		const files: SourceFileView[] = [];
		const failures: FileLoadFailure[] = [];
		const resolutionFailures: FileLoadFailure[] = [];
		const configs = new Map<string, ts.CompilerOptions>();

		for (const filePath of filePaths) {
			const sourceFile = this.loadSourceFile(project, filePath, failures);
			if (!sourceFile) continue;
			const compilerOptions = options
				? compilerOptionsFor(
						filePath,
						options.packageRoot,
						configs,
						resolutionFailures,
					)
				: undefined;
			files.push(new TsMorphSourceFileView(sourceFile, compilerOptions));
		}
		return { files, failures, resolutionFailures };
	}

	positionOf(file: SourceFileView, pos: number): SourceFilePosition {
		const view = file as TsMorphSourceFileView;
		const { line, column } = view.sourceFile.getLineAndColumnAtPos(pos);
		return { line, column };
	}

	private loadSourceFile(
		project: Project,
		filePath: string,
		failures: FileLoadFailure[],
	): SourceFile | null {
		let content: string;
		try {
			content = fs.readFileSync(filePath, "utf8");
		} catch (error) {
			failures.push({
				filePath,
				reason: `read failed — ${(error as Error).message}`,
			});
			return null;
		}
		if (content.includes("\u0000")) {
			failures.push({ filePath, reason: "binary file (NUL byte found)" });
			return null;
		}
		return project.createSourceFile(filePath, content, {
			overwrite: true,
		});
	}
}

class TsMorphSourceFileView implements SourceFileView {
	readonly resolveModuleSpecifier?: (specifier: string) => ModuleResolution;
	constructor(
		readonly sourceFile: SourceFile,
		compilerOptions?: ts.CompilerOptions,
	) {
		if (compilerOptions) {
			const cache = ts.createModuleResolutionCache(
				path.dirname(this.filePath),
				(name) => name,
				compilerOptions,
			);
			this.resolveModuleSpecifier = (specifier) => {
				const resolved = ts.resolveModuleName(
					specifier,
					this.filePath,
					compilerOptions,
					ts.sys,
					cache,
				).resolvedModule;
				if (resolved) {
					if (resolved.isExternalLibraryImport) return { kind: "external" };
					return {
						kind: "internal",
						filePath: path.resolve(resolved.resolvedFileName),
					};
				}
				const declaredAlias = Object.keys(compilerOptions.paths ?? {}).some(
					(key) => matchesAlias(key, specifier),
				);
				if (
					declaredAlias ||
					specifier.startsWith("./") ||
					specifier.startsWith("../")
				) {
					return {
						kind: "unresolved",
						reason: `could not resolve internal module "${specifier}"`,
					};
				}
				return { kind: "external" };
			};
		}
	}

	get filePath(): string {
		return this.sourceFile.getFilePath();
	}

	getRelativePathTo(target: string): string {
		// Plain path math instead of ts-morph's cwd-based getRelativePathTo,
		// normalized to posix separators for stable ids and ordering.
		return path
			.relative(target, this.sourceFile.getFilePath())
			.split(path.sep)
			.join("/");
	}

	forEachDescendant(cb: (node: Node) => "skip" | undefined): void {
		this.sourceFile.forEachDescendant((node) => cb(node));
	}

	getModuleSpecifiers(): string[] {
		const specifiers: string[] = [];
		this.sourceFile.forEachDescendant((node) => {
			if (Node.isImportDeclaration(node)) {
				specifiers.push(node.getModuleSpecifierValue());
				return;
			}
			if (Node.isExportDeclaration(node)) {
				const specifier = node.getModuleSpecifierValue();
				if (specifier !== undefined) specifiers.push(specifier);
				return;
			}
			if (Node.isCallExpression(node)) {
				const expression = node.getExpression();
				const isRequire =
					Node.isIdentifier(expression) && expression.getText() === "require";
				const isDynamicImport =
					expression.getKind() === SyntaxKind.ImportKeyword;
				if (!isRequire && !isDynamicImport) return;
				const argument = node.getArguments()[0];
				if (argument && Node.isStringLiteral(argument)) {
					specifiers.push(argument.getText().slice(1, -1));
				}
			}
		});
		return specifiers;
	}

	getText(node?: Node): string {
		return node ? node.getText() : this.sourceFile.getFullText();
	}
}

/** Pattern recognition is only for loud failures; TS decides target precedence. */
function matchesAlias(pattern: string, specifier: string): boolean {
	const star = pattern.indexOf("*");
	if (star === -1) return pattern === specifier;
	return (
		specifier.length >= pattern.length - 1 &&
		specifier.startsWith(pattern.slice(0, star)) &&
		specifier.endsWith(pattern.slice(star + 1))
	);
}

function compilerOptionsFor(
	filePath: string,
	packageRoot: string,
	cache: Map<string, ts.CompilerOptions>,
	failures: FileLoadFailure[],
): ts.CompilerOptions {
	let boundary = path.resolve(packageRoot);
	// A nested package must not inherit its parent's config accidentally.
	for (
		let dir = path.dirname(filePath);
		dir !== boundary;
		dir = path.dirname(dir)
	) {
		if (fs.existsSync(path.join(dir, "package.json"))) {
			boundary = dir;
			break;
		}
		if (path.dirname(dir) === dir) break;
	}
	let configPath: string | undefined;
	for (let dir = path.dirname(filePath); ; dir = path.dirname(dir)) {
		const candidate = path.join(dir, "tsconfig.json");
		if (fs.existsSync(candidate)) {
			configPath = candidate;
			break;
		}
		if (dir === boundary || path.dirname(dir) === dir) break;
	}
	if (!configPath) return {};
	const cached = cache.get(configPath);
	if (cached) return cached;
	const read = ts.readConfigFile(configPath, ts.sys.readFile);
	const parsed = read.error
		? undefined
		: ts.parseJsonConfigFileContent(
				read.config,
				ts.sys,
				path.dirname(configPath),
				undefined,
				configPath,
			);
	// File selection is ours; TS's empty include/files diagnostics do not affect
	// compiler resolution. Other config errors must remain visible.
	const errors = read.error
		? [read.error]
		: (parsed?.errors ?? []).filter(
				(error) => error.code !== 18003 && error.code !== 18002,
			);
	for (const error of errors) {
		failures.push({
			filePath: configPath,
			reason: ts
				.flattenDiagnosticMessageText(error.messageText, " ")
				.split(packageRoot)
				.join("."),
		});
	}
	const result = parsed?.options ?? {};
	cache.set(configPath, result);
	return result;
}
