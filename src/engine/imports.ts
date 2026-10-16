import fs from "node:fs";
import path from "node:path";
import type { ModuleResolution } from "./parser/types.js";

/**
 * The import-graph machinery for project rules (spec 013, design §1).
 * Compiler-independent graph over the analyzed set: sources may supply
 * resolution evidence through the parser boundary (spec 026); structural
 * sources retain relative path resolution. Edges come from module specifiers, and
 * everything downstream (entries, cycles, reachability) derives from the
 * same adjacency. All iteration that produces output walks sorted keys.
 */

/**
 * Structural edge source — every `SourceFileView` satisfies it, so the
 * graph never has to name the parser boundary.
 */
export interface ImportEdgeSource {
	readonly filePath: string;
	getModuleSpecifiers(): string[];
	resolveModuleSpecifier?(specifier: string): ModuleResolution;
}

export interface ImportGraph {
	/** Analyzed file paths (absolute, sorted). */
	readonly files: string[];
	readonly failures: { filePath: string; reason: string }[];
	/** Resolved edge targets of the file (absolute, sorted). */
	edgesOf(filePath: string): string[];
	/** Resolve one specifier from one file against the analyzed set. */
	resolve(fromFile: string, specifier: string): string | undefined;
	/**
	 * Import cycles as canonical chains `[smallest, …, smallest]`: one
	 * chain per strongly connected component, rotated so the
	 * lexicographically smallest member comes first, walking sorted edges.
	 */
	cycles(): string[][];
	/** Files reachable from the given entries (entries included). */
	reachableFrom(entries: readonly string[]): Set<string>;
}

/**
 * The TypeScript/ESM extension idiom: sources import `./x.js` while the
 * analyzed file is `x.ts` (this repository's own convention). Extensionless
 * specifiers try the supported extensions and `/index` variants.
 */
const EXTENSION_SWAPS: ReadonlyMap<string, string> = new Map([
	[".js", ".ts"],
	[".mjs", ".mts"],
	[".cjs", ".cts"],
]);

const SUPPORTED: readonly string[] = [".ts", ".tsx", ".mts", ".cts"];

/**
 * Extensions that end a specifier's stem. Anything else (`""`, but also
 * Nest-idiomatic dotted stems like `./app.module` or `./users.service.dto`)
 * means the dot belongs to the name, so the supported suffixes apply.
 */
const KNOWN_EXTENSIONS: ReadonlySet<string> = new Set([
	...SUPPORTED,
	".js",
	".mjs",
	".cjs",
]);

function candidatePaths(base: string): string[] {
	const extension = path.extname(base);
	if (!KNOWN_EXTENSIONS.has(extension)) {
		return [...SUPPORTED, ...SUPPORTED.map((ext) => `/index${ext}`)].map(
			(suffix) => (suffix.startsWith("/") ? `${base}${suffix}` : base + suffix),
		);
	}
	const swap = EXTENSION_SWAPS.get(extension);
	return swap ? [base, base.slice(0, -extension.length) + swap] : [base];
}

function isRelative(specifier: string): boolean {
	return specifier.startsWith("./") || specifier.startsWith("../");
}

export function buildImportGraph(
	sources: readonly ImportEdgeSource[],
): ImportGraph {
	const files = sources.map((source) => source.filePath).sort();
	const analyzed = new Set(files);
	const edges = new Map<string, string[]>();
	const sourceByPath = new Map(
		sources.map((source) => [source.filePath, source]),
	);
	const failures: { filePath: string; reason: string }[] = [];
	const resolvedByFile = new Map<string, Map<string, string | undefined>>();

	for (const filePath of files) {
		const source = sourceByPath.get(filePath);
		if (!source) continue;
		const targets = new Set<string>();
		const resolutions = new Map<string, string | undefined>();
		for (const specifier of source.getModuleSpecifiers()) {
			if (resolutions.has(specifier)) continue;
			const evidence = source.resolveModuleSpecifier?.(specifier);
			let target =
				evidence?.kind === "internal" && analyzed.has(evidence.filePath)
					? evidence.filePath
					: resolveSpecifier(filePath, specifier, analyzed);
			if (evidence?.kind === "internal" && !analyzed.has(evidence.filePath)) {
				failures.push({
					filePath,
					reason: `internal module "${specifier}" resolves outside the analyzed file set`,
				});
				target = undefined;
			} else if (evidence?.kind === "unresolved" && !target) {
				failures.push({ filePath, reason: evidence.reason });
			}
			resolutions.set(specifier, target);
			if (target && target !== filePath) targets.add(target);
		}
		resolvedByFile.set(filePath, resolutions);
		edges.set(filePath, [...targets].sort());
	}

	const cycleChains = findCycleChains(files, edges);

	return {
		files,
		failures,
		edgesOf: (filePath) => edges.get(filePath) ?? [],
		resolve: (fromFile, specifier) => {
			const cached = resolvedByFile.get(fromFile);
			if (cached?.has(specifier)) return cached.get(specifier);
			const evidence = sourceByPath
				.get(fromFile)
				?.resolveModuleSpecifier?.(specifier);
			if (evidence?.kind === "internal")
				return analyzed.has(evidence.filePath) ? evidence.filePath : undefined;
			return resolveSpecifier(fromFile, specifier, analyzed);
		},
		cycles: () => cycleChains.map((chain) => [...chain]),
		reachableFrom: (entries) => reachableFrom(entries, edges),
	};
}

function resolveSpecifier(
	fromFile: string,
	specifier: string,
	analyzed: ReadonlySet<string>,
): string | undefined {
	if (!isRelative(specifier)) return undefined;
	const base = path.resolve(path.dirname(fromFile), specifier);
	for (const candidate of candidatePaths(base)) {
		if (analyzed.has(candidate)) return candidate;
	}
	return undefined;
}

/**
 * Tarjan-style SCC pass over the adjacency; components with more than one
 * member are cycles (self-edges were dropped at build time). Each becomes
 * a canonical chain via a sorted-edge DFS from the smallest member.
 */
function findCycleChains(
	files: readonly string[],
	edges: ReadonlyMap<string, string[]>,
): string[][] {
	const indexOf = new Map<string, number>();
	const low = new Map<string, number>();
	const onStack = new Set<string>();
	const stack: string[] = [];
	const components: string[][] = [];
	let counter = 0;

	const strongConnect = (node: string): void => {
		indexOf.set(node, counter);
		low.set(node, counter);
		counter += 1;
		stack.push(node);
		onStack.add(node);
		for (const next of edges.get(node) ?? []) {
			if (!indexOf.has(next)) {
				strongConnect(next);
				low.set(node, Math.min(low.get(node) ?? 0, low.get(next) ?? 0));
			} else if (onStack.has(next)) {
				low.set(node, Math.min(low.get(node) ?? 0, indexOf.get(next) ?? 0));
			}
		}
		if (low.get(node) !== indexOf.get(node)) return;
		const component: string[] = [];
		for (;;) {
			const member = stack.pop();
			if (member === undefined) break;
			onStack.delete(member);
			component.push(member);
			if (member === node) break;
		}
		if (component.length > 1) components.push(component);
	};

	for (const file of files) {
		if (!indexOf.has(file)) strongConnect(file);
	}

	return components
		.map((component) => canonicalChain(new Set(component), edges))
		.sort((a, b) => {
			const firstA = a[0] ?? "";
			const firstB = b[0] ?? "";
			if (firstA !== firstB) return firstA < firstB ? -1 : 1;
			return 0;
		});
}

function canonicalChain(
	component: ReadonlySet<string>,
	edges: ReadonlyMap<string, string[]>,
): string[] {
	const start = [...component].sort()[0] ?? "";
	const path: string[] = [start];

	const visit = (node: string): boolean => {
		for (const next of edges.get(node) ?? []) {
			if (next === start) return true;
			if (!component.has(next) || path.includes(next)) continue;
			path.push(next);
			if (visit(next)) return true;
			path.pop();
		}
		return false;
	};

	visit(start);
	return [...path, start];
}

function reachableFrom(
	entries: readonly string[],
	edges: ReadonlyMap<string, string[]>,
): Set<string> {
	const reachable = new Set<string>();
	const queue = [...entries];
	while (queue.length > 0) {
		const node = queue.pop();
		if (node === undefined || reachable.has(node)) continue;
		reachable.add(node);
		queue.push(...(edges.get(node) ?? []));
	}
	return reachable;
}

/**
 * Entry files for reachability (spec 013 resolution 3): package.json
 * `main`/`bin` targets plus the conventional bootstrap files, kept only
 * when they are analyzed files.
 */
export function findEntryFiles(
	packageRoot: string,
	analyzed: ReadonlySet<string>,
	surface: { main?: string; bin?: string | Record<string, string> },
): string[] {
	const candidates: string[] = [];
	if (surface.main) candidates.push(path.resolve(packageRoot, surface.main));
	if (typeof surface.bin === "string") {
		candidates.push(path.resolve(packageRoot, surface.bin));
	} else if (surface.bin) {
		for (const value of Object.values(surface.bin)) {
			candidates.push(path.resolve(packageRoot, value));
		}
	}
	for (const conventional of [
		"src/main.ts",
		"src/index.ts",
		"main.ts",
		"index.ts",
	]) {
		const absolute = path.join(packageRoot, conventional);
		if (fs.existsSync(absolute)) candidates.push(absolute);
	}
	return [...new Set(candidates)]
		.filter((candidate) => analyzed.has(candidate))
		.sort();
}
