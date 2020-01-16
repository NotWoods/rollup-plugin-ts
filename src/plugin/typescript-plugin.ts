import {OutputBundle, OutputOptions, Plugin, PluginContext, TransformSourceDescription} from "rollup";
import {createLanguageService} from "typescript";
import {getParsedCommandLine} from "../util/get-parsed-command-line/get-parsed-command-line";
import {getForcedCompilerOptions} from "../util/get-forced-compiler-options/get-forced-compiler-options";
import {IncrementalLanguageService} from "../service/language-service/incremental-language-service";
import {getSourceDescriptionFromEmitOutput} from "../util/get-source-description-from-emit-output/get-source-description-from-emit-output";
import {emitDiagnosticsThroughRollup} from "../util/diagnostic/emit-diagnostics-through-rollup";
import {getSupportedExtensions} from "../util/get-supported-extensions/get-supported-extensions";
import {getExtension, isRollupPluginMultiEntry, isTslib} from "../util/path/path-util";
import {TypescriptPluginOptions} from "./i-typescript-plugin-options";
import {getPluginOptions} from "../util/plugin-options/get-plugin-options";
import {ResolveCache} from "../service/cache/resolve-cache/resolve-cache";
import {createFilter} from "rollup-pluginutils";
import {buildResolvers} from "../util/resolve-id/resolve-id";
import {matchAll} from "@wessberg/stringutil";
import {getModuleDependencies, ModuleDependencyMap} from "../util/module/get-module-dependencies";
import {emitDeclarations} from "../declaration/emit-declarations";

/**
 * A Rollup plugin that transpiles the given input with Typescript
 * @param {TypescriptPluginOptions} [pluginInputOptions={}]
 */
export default function typescriptRollupPlugin(pluginInputOptions: Partial<TypescriptPluginOptions> = {}): Plugin {
	const pluginOptions: TypescriptPluginOptions = getPluginOptions(pluginInputOptions);
	const {include, exclude, tsconfig} = pluginOptions;

	/** The parsed Typescript configuration */
	const parsedCommandLineResult = getParsedCommandLine({
		tsconfig,
		forcedCompilerOptions: getForcedCompilerOptions({pluginOptions}),
		fileSystem: pluginOptions.fileSystem
	});

	const moduleDependencyCache = new Map<string, Set<string>>();

	/** The ResolveCache to use */
	const resolveCache = new ResolveCache({fileSystem: pluginOptions.fileSystem});

	/**
	 * A Map between file names and the Set of absolute paths they depend on. Not all will be part of Rollup's chunk modules (specifically, emit-less ones won't be).
	 * This is going to be important in the declaration bundling and tree-shaking phase since this information would otherwise be lost.
	 * @type {Map<string, Set<string>>}
	 */
	const moduleDependencyMap: ModuleDependencyMap = new Map();

	/** The filter function to use */
	const filter: (id: string) => boolean = createFilter(include, exclude);

	/** All supported extensions */
	const supportedExtensions = getSupportedExtensions(
		parsedCommandLineResult.parsedCommandLine.options.allowJs,
		parsedCommandLineResult.parsedCommandLine.options.resolveJsonModule
	);

	/** Returns true if Typescript can emit something for the given file */
	const canEmitForFile = (id: string) => filter(id) && supportedExtensions.has(getExtension(id));

	/** The (Incremental) LanguageServiceHost to use */
	const languageServiceHost = new IncrementalLanguageService({
		resolveCache,
		supportedExtensions,
		fileSystem: pluginOptions.fileSystem,
		parsedCommandLine: parsedCommandLineResult.parsedCommandLine,
		languageService: () => languageService
	});

	/** The LanguageService to use */
	const languageService = createLanguageService(languageServiceHost);

	const {resolver, ambientResolver} = buildResolvers({
		options: parsedCommandLineResult.parsedCommandLine.options,
		moduleResolutionHost: languageServiceHost,
		resolveCache,
		supportedExtensions
	});

	/** The Set of all transformed files. */
	let transformedFiles = new Set<string>();

	/** A Set of the entry filenames for when using rollup-plugin-multi-entry (we need to track this for generating valid declarations) */
	let MULTI_ENTRY_FILE_NAMES: Set<string> | undefined;

	return {
		name: "Typescript",

		/**
		 * Transforms the given code and file
		 */
		async transform(this: PluginContext, code: string, file: string): Promise<TransformSourceDescription | undefined> {
			// If this file represents ROLLUP_PLUGIN_MULTI_ENTRY, we need to parse its' contents to understand which files it aliases.
			// Following that, there's nothing more to do
			if (isRollupPluginMultiEntry(file)) {
				MULTI_ENTRY_FILE_NAMES = new Set(matchAll(code, /(import|export)\s*(\*\s*from\s*)?["'`]([^"'`]*)["'`]/).map(([, , , path]) => path));
				return undefined;
			}

			// Skip the file if it doesn't match the filter or if the helper cannot be transformed
			if (!filter(file)) {
				return undefined;
			}

			// Only pass the file through Typescript if it's extension is supported.
			// Otherwise, return bind undefined
			let sourceDescription;
			if (canEmitForFile(file)) {
				if (transformedFiles.has(file)) {
					// Remove the file from the resolve cache, now that it has changed.
					resolveCache.delete(file);
					moduleDependencyCache.delete(file);
				}

				// Add the file to the LanguageServiceHost
				languageServiceHost.addFile(file, code);
				moduleDependencyMap.set(
					file,
					getModuleDependencies({
						resolver: ambientResolver,
						languageServiceHost,
						file,
						supportedExtensions,
						cache: moduleDependencyCache
					})
				);

				// Get some EmitOutput, optionally from the cache if the file contents are unchanged
				const emitOutput = languageService.getEmitOutput(file);

				// Return the emit output results to Rollup
				sourceDescription = getSourceDescriptionFromEmitOutput(emitOutput);
			}

			// If nothing was emitted, simply return undefined
			if (sourceDescription != null) {
				transformedFiles.add(file);
			}
			return sourceDescription;
		},

		/**
		 * Attempts to resolve the given id via the LanguageServiceHost
		 */
		resolveId(this: PluginContext, id: string, parent: string | undefined) {
			// Don't proceed if there is no parent (in which case this is an entry module)
			if (parent == null) return null;

			// Handle tslib differently
			if (isTslib(id)) {
				const tslibPath = resolveCache.findHelperFromNodeModules("tslib/tslib.es6.js", process.cwd());
				if (tslibPath != null) {
					return tslibPath;
				}
			}

			const resolveResult = resolver(id, parent);
			return resolveResult;
		},

		/**
		 * Invoked when a full bundle is generated. Will take all modules for all chunks and make sure to remove all removed files
		 * from the LanguageService
		 */
		generateBundle(this: PluginContext, outputOptions: OutputOptions, bundle: OutputBundle): void {
			// Only emit diagnostics if the plugin options allow it
			if (!pluginOptions.transpileOnly) {
				// Emit all reported diagnostics
				emitDiagnosticsThroughRollup({languageServiceHost, languageService, context: this});
			}

			// Emit declaration files if required
			if (parsedCommandLineResult.parsedCommandLine.options.declaration) {
				emitDeclarations({
					bundle,
					pluginContext: this,
					supportedExtensions,
					fileSystem: pluginOptions.fileSystem,
					resolver: ambientResolver,
					outputOptions,
					pluginOptions,
					languageServiceHost,
					compilerOptions: parsedCommandLineResult.parsedCommandLine.options,
					multiEntryFileNames: MULTI_ENTRY_FILE_NAMES,
					canEmitForFile,
					moduleDependencyMap
				});
			}
		}
	};
}
