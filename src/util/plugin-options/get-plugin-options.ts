import {TypescriptPluginOptions} from "../../plugin/i-typescript-plugin-options";

/**
 * Gets normalized PluginOptions based on the given ones
 * @param {Partial<TypescriptPluginOptions>} options
 * @returns {TypescriptPluginOptions}
 */
export function getPluginOptions (options: Partial<TypescriptPluginOptions>): TypescriptPluginOptions {
	// Destructure the options and provide defaults
	const {
		browserslist,
		transpiler = "typescript",
		cwd = process.cwd(),
		tsconfig,
		transformers,
		include = [],
		exclude = []
	} = options;

	// These options will be used no matter what
	const baseOptions = {
		browserslist,
		cwd,
		exclude,
		include,
		transformers,
		tsconfig
	};

	// If we're to use Typescript, return the Typescript-options
	if (transpiler === "typescript") {
		return {
			...baseOptions,
			transpiler: "typescript"
		};
	} else {
		return {
			...baseOptions,
			...("babelConfig" in options ? {babelConfig: options.babelConfig} : {}),
			transpiler: "babel"
		};
	}
}