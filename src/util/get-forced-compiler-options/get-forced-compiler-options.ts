import {CompilerOptions, ModuleKind, ModuleResolutionKind} from "typescript";
import {InputOptions, OutputOptions} from "rollup";
import {TypescriptPluginOptions} from "../../plugin/i-typescript-plugin-options";
import {getModuleKindFromRollupFormat} from "../get-module-kind-from-rollup-format/get-module-kind-from-rollup-format";
import {getOutDir} from "../get-out-dir/get-out-dir";

interface IGetForcedCompilerOptionsOptions {
	pluginOptions: TypescriptPluginOptions;
	rollupInputOptions: InputOptions;
	rollupOutputOptions?: OutputOptions;
}

/**
 * Gets the ModuleKind to force
 * @param {IGetForcedCompilerOptionsOptions} options
 * @returns {object}
 */
function getForcedModuleKindOption({rollupOutputOptions}: IGetForcedCompilerOptionsOptions): ModuleKind {
	// If no OutputOptions is given, or if no format is given in the OutputOptions, use ESNext. Otherwise, convert the
	// Rollup option into one that Typescript can understand
	return getModuleKindFromRollupFormat(rollupOutputOptions?.format);
}

/**
 * Retrieves the CompilerOptions that will be forced
 * @param {IGetForcedCompilerOptionsOptions} options
 * @returns {Partial<CompilerOptions>}
 */
export function getForcedCompilerOptions(options: IGetForcedCompilerOptionsOptions): Partial<CompilerOptions> {
	return {
		module: getForcedModuleKindOption(options),
		outDir: getOutDir(process.cwd(), options.rollupOutputOptions),
		baseUrl: ".",
		// Rollup, not Typescript, is the decider of where to put files
		outFile: undefined,
		// Always generate SourceMaps. Rollup will then decide if it wants to use them or not
		sourceMap: true,
		// Never use inline source maps. Let Rollup inline the returned SourceMap if it can and if sourcemaps should be emitted in the OutputOptions,
		inlineSourceMap: false,
		// Since we never use inline source maps, inline sources aren't supported
		inlineSources: false,
		// Helpers should *always* be imported. We don't want them to be duplicated multiple times within generated chunks
		importHelpers: true,
		// Node resolution is required when 'importHelpers' are true
		moduleResolution: ModuleResolutionKind.NodeJs,
		// Typescript should always be able to emit - otherwise we cannot transform source files
		noEmit: false,
		// Typescript should always be able to emit - otherwise we cannot transform source files
		noEmitOnError: false,
		// Typescript should always be able to emit other things than declarations - otherwise we cannot transform source files
		emitDeclarationOnly: false,
		// Typescript should always be able to emit helpers - since we force 'importHelpers'
		noEmitHelpers: false,
		// Typescript should always be able to resolve things - otherwise compilation will break
		noResolve: false,
		// Typescript should never watch files. That is the job of Rollup
		watch: false,
		// Typescript should never watch files. That is the job of Rollup
		preserveWatchOutput: false,
		skipLibCheck: true
	};
}
