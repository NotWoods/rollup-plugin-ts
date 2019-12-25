import {TypescriptPluginOptions} from "../../plugin/i-typescript-plugin-options";
import {REAL_FILE_SYSTEM} from "../file-system/file-system";

/**
 * Gets normalized PluginOptions based on the given ones
 * @param {Partial<TypescriptPluginOptions>} options
 * @returns {TypescriptPluginOptions}
 */
export function getPluginOptions(options: Partial<TypescriptPluginOptions>): TypescriptPluginOptions {
	// Destructure the options and provide defaults
	const {
		cwd = process.cwd(),
		resolveTypescriptLibFrom = cwd,
		tsconfig,
		transformers,
		include = [],
		exclude = [],
		transpileOnly = false,
		debug = false,
		fileSystem = REAL_FILE_SYSTEM,
		hook = {}
	} = options;

	// These options will be used no matter what
	return {
		cwd,
		resolveTypescriptLibFrom,
		exclude,
		include,
		transformers,
		tsconfig,
		transpileOnly,
		debug,
		fileSystem,
		hook
	};
}
