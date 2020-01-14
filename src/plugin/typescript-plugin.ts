import {InputOptions, OutputBundle, OutputOptions, Plugin, PluginContext, TransformSourceDescription} from "rollup";
import {createDocumentRegistry, createLanguageService, LanguageService} from "typescript";
import {getParsedCommandLine} from "../util/get-parsed-command-line/get-parsed-command-line";
import {getForcedCompilerOptions} from "../util/get-forced-compiler-options/get-forced-compiler-options";
import {IncrementalLanguageService} from "../service/language-service/incremental-language-service";
import {getSourceDescriptionFromEmitOutput} from "../util/get-source-description-from-emit-output/get-source-description-from-emit-output";
import {EmitCache} from "../service/cache/emit-cache/emit-cache";
import {emitDiagnosticsThroughRollup} from "../util/diagnostic/emit-diagnostics-through-rollup";
import {getSupportedExtensions} from "../util/get-supported-extensions/get-supported-extensions";
import {getExtension, isRollupPluginMultiEntry, isTslib} from "../util/path/path-util";
import {ModuleResolutionHost} from "../service/module-resolution-host/module-resolution-host";
import {takeBundledFilesNames} from "../util/take-bundled-filenames/take-bundled-filenames";
import {TypescriptPluginOptions} from "./i-typescript-plugin-options";
import {getPluginOptions} from "../util/plugin-options/get-plugin-options";
import {ResolveCache} from "../service/cache/resolve-cache/resolve-cache";
// @ts-ignore
import {createFilter} from "rollup-pluginutils";
import {resolveId} from "../util/resolve-id/resolve-id";
import {GetParsedCommandLineResult} from "../util/get-parsed-command-line/get-parsed-command-line-result";
import {matchAll} from "@wessberg/stringutil";
import {Resolver} from "../util/resolve-id/resolver";
import {getModuleDependencies, ModuleDependencyMap} from "../util/module/get-module-dependencies";
import {emitDeclarations} from "../declaration/emit-declarations";

/**
 * The name of the Rollup plugin
 * @type {string}
 */
const PLUGIN_NAME = "Typescript";

/**
 * A Rollup plugin that transpiles the given input with Typescript
 * @param {TypescriptPluginOptions} [pluginInputOptions={}]
 */
export default function typescriptRollupPlugin(pluginInputOptions: Partial<TypescriptPluginOptions> = {}): Plugin {
	const pluginOptions: TypescriptPluginOptions = getPluginOptions(pluginInputOptions);
	const {include, exclude, tsconfig, cwd, resolveTypescriptLibFrom} = pluginOptions;

	/**
	 * The ParsedCommandLine to use with Typescript
	 * @type {GetParsedCommandLineResult?}
	 */
	let parsedCommandLineResult: GetParsedCommandLineResult;

	/**
	 * The (Incremental) LanguageServiceHost to use
	 * @type {IncrementalLanguageService?}
	 */
	let languageServiceHost: IncrementalLanguageService;

	/**
	 * The host to use for when resolving modules
	 * @type {ModuleResolutionHost}
	 */
	let moduleResolutionHost: ModuleResolutionHost;

	/**
	 * The LanguageService to use
	 * @type {LanguageService?}
	 */
	let languageService: LanguageService;

	/**
	 * A function that given an id and a parent resolves the full path for a dependency. The Module Resolution Algorithm depends on the CompilerOptions as well
	 * as the supported extensions
	 * @type {Resolver}
	 */
	let resolver: Resolver;

	/**
	 * A function that given an id and a parent resolves the full path for a dependency, prioritizing ambient files (.d.ts). The Module Resolution Algorithm depends on the CompilerOptions as well
	 * as the supported extensions
	 * @type {Resolver}
	 */
	let ambientResolver: Resolver;

	/** The EmitCache to use */
	const emitCache = new EmitCache();

	const moduleDependencyCache = new Map<string, Set<string>>();

	/** The ResolveCache to use */
	const resolveCache = new ResolveCache({fileSystem: pluginOptions.fileSystem});

	/**
	 * A Map between file names and the Set of absolute paths they depend on. Not all will be part of Rollup's chunk modules (specifically, emit-less ones won't be).
	 * This is going to be important in the declaration bundling and tree-shaking phase since this information would otherwise be lost.
	 * @type {Map<string, Set<string>>}
	 */
	const moduleDependencyMap: ModuleDependencyMap = new Map();

	/**
	 * The filter function to use
	 */
	const filter: (id: string) => boolean = createFilter(include, exclude);

	/**
	 * The Set of all transformed files.
	 */
	let transformedFiles = new Set<string>();

	/**
	 * All supported extensions
	 * @type {string[]}
	 */
	let SUPPORTED_EXTENSIONS: Set<string>;

	/**
	 * The InputOptions provided to Rollup
	 * @type {InputOptions}
	 */
	let rollupInputOptions: InputOptions;

	/**
	 * A Set of the entry filenames for when using rollup-plugin-multi-entry (we need to track this for generating valid declarations)
	 * @type {Set<string>?}
	 */
	let MULTI_ENTRY_FILE_NAMES: Set<string> | undefined;

	/**
	 * Returns true if Typescript can emit something for the given file
	 * @param {string} id
	 * @param {string[]} supportedExtensions
	 * @returns {boolean}
	 */
	let canEmitForFile: (id: string) => boolean;

	return {
		name: PLUGIN_NAME,

		/**
		 * Invoked when Input options has been received by Rollup
		 * @param {InputOptions} options
		 */
		options(options: InputOptions): undefined {
			// Break if the options aren't different from the previous ones
			if (options === rollupInputOptions) return;

			// Re-assign the input options
			rollupInputOptions = options;

			// Clear resolve-related caches
			moduleDependencyMap.clear();
			moduleDependencyCache.clear();
			resolveCache.clear();

			// Make sure we have a proper ParsedCommandLine to work with
			parsedCommandLineResult = getParsedCommandLine({
				tsconfig,
				cwd,
				forcedCompilerOptions: getForcedCompilerOptions({pluginOptions, rollupInputOptions}),
				fileSystem: pluginOptions.fileSystem
			});

			SUPPORTED_EXTENSIONS = getSupportedExtensions(
				Boolean(parsedCommandLineResult.parsedCommandLine.options.allowJs),
				Boolean(parsedCommandLineResult.parsedCommandLine.options.resolveJsonModule)
			);

			canEmitForFile = (id: string) => filter(id) && SUPPORTED_EXTENSIONS.has(getExtension(id));

			const resolve = (id: string, parent: string) =>
				resolveId({
					id,
					parent,
					cwd,
					options: parsedCommandLineResult.parsedCommandLine.options,
					moduleResolutionHost,
					resolveCache,
					supportedExtensions: SUPPORTED_EXTENSIONS
				});

			resolver = (id: string, parent: string) => {
				const resolved = resolve(id, parent);
				return resolved?.resolvedFileName;
			};

			ambientResolver = (id: string, parent: string) => {
				const resolved = resolve(id, parent);
				return resolved?.resolvedAmbientFileName ?? resolved?.resolvedFileName;
			};

			// Hook up a LanguageServiceHost and a LanguageService
			languageServiceHost = new IncrementalLanguageService({
				cwd,
				resolveTypescriptLibFrom,
				emitCache,
				resolveCache,
				rollupInputOptions,
				supportedExtensions: SUPPORTED_EXTENSIONS,
				fileSystem: pluginOptions.fileSystem,
				parsedCommandLine: parsedCommandLineResult.parsedCommandLine,
				languageService: () => languageService
			});

			languageService = createLanguageService(
				languageServiceHost,
				createDocumentRegistry(languageServiceHost.useCaseSensitiveFileNames(), languageServiceHost.getCurrentDirectory())
			);

			// Hook up a new ModuleResolutionHost
			moduleResolutionHost = new ModuleResolutionHost({languageServiceHost, extensions: SUPPORTED_EXTENSIONS});

			return undefined;
		},

		/**
		 * Transforms the given code and file
		 * @param {string} code
		 * @param {string} file
		 * @returns {Promise<TransformSourceDescription?>}
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
						supportedExtensions: SUPPORTED_EXTENSIONS,
						cache: moduleDependencyCache
					})
				);

				// Get some EmitOutput, optionally from the cache if the file contents are unchanged
				const emitOutput = emitCache.get({fileName: file, languageService});

				// Return the emit output results to Rollup
				sourceDescription = getSourceDescriptionFromEmitOutput(emitOutput);
			}

			// If nothing was emitted, simply return undefined
			if (sourceDescription == null) {
				return undefined;
			} else {
				transformedFiles.add(file);
				// Simply return the emitted results
				return sourceDescription;
			}
		},

		/**
		 * Attempts to resolve the given id via the LanguageServiceHost
		 * @param {string} id
		 * @param {string} parent
		 * @returns {string | null}
		 */
		resolveId(this: PluginContext, id: string, parent: string | undefined) {
			// Don't proceed if there is no parent (in which case this is an entry module)
			if (parent == null) return null;

			// Handle tslib differently
			if (isTslib(id)) {
				const tslibPath = resolveCache.findHelperFromNodeModules("tslib/tslib.es6.js", cwd);
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
		 * @param {OutputOptions} outputOptions
		 * @param {OutputBundle} bundle
		 * @returns {void | Promise<void>}
		 */
		generateBundle(this: PluginContext, outputOptions: OutputOptions, bundle: OutputBundle): void {
			// Only emit diagnostics if the plugin options allow it
			if (!Boolean(pluginOptions.transpileOnly)) {
				// Emit all reported diagnostics
				emitDiagnosticsThroughRollup({languageServiceHost, languageService, pluginOptions, context: this});
			}

			// Emit declaration files if required
			if (Boolean(parsedCommandLineResult.parsedCommandLine.options.declaration)) {
				emitDeclarations({
					bundle,
					pluginContext: this,
					supportedExtensions: SUPPORTED_EXTENSIONS,
					fileSystem: pluginOptions.fileSystem,
					resolver: ambientResolver,
					cwd,
					outputOptions,
					pluginOptions,
					languageServiceHost,
					compilerOptions: parsedCommandLineResult.parsedCommandLine.options,
					multiEntryFileNames: MULTI_ENTRY_FILE_NAMES,
					canEmitForFile,
					moduleDependencyMap
				});
			}

			const bundledFilenames = takeBundledFilesNames(bundle);

			// Walk through all of the files of the LanguageService and make sure to remove them if they are not part of the bundle
			for (const fileName of languageServiceHost.publicFiles) {
				if (!bundledFilenames.has(fileName)) {
					languageServiceHost.deleteFile(fileName);
				}
			}
		}
	};
}
