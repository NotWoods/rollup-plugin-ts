import {CompilerOptions, parseConfigFileTextToJson, ParsedCommandLine, parseJsonConfigFileContent, findConfigFile} from "typescript";
import {ensureAbsolute} from "../path/path-util";
import {DECLARATION_EXTENSION} from "../../constant/constant";
import {
	TypescriptPluginOptions,
	InputCompilerOptions,
	TsConfigResolver,
	TsConfigResolverWithFileName
} from "../../plugin/i-typescript-plugin-options";
import {FileSystem} from "../file-system/file-system";

interface IGetParsedCommandLineOptions {
	tsconfig?: TypescriptPluginOptions["tsconfig"];
	forcedCompilerOptions?: CompilerOptions;
	fileSystem: FileSystem;
}

export interface GetParsedCommandLineResult {
	parsedCommandLine: ParsedCommandLine;
}

/**
 * Returns true if the given tsconfig are raw, JSON-serializable CompilerOptions
 * @param {IGetParsedCommandLineOptions["tsconfig"]} tsconfig
 * @returns {tsconfig is Partial<Record<keyof CompilerOptions, string | number | boolean>>}
 */
function isRawCompilerOptions(tsconfig?: IGetParsedCommandLineOptions["tsconfig"]): tsconfig is Partial<InputCompilerOptions> {
	return tsconfig != null && typeof tsconfig === "object" && !("options" in tsconfig) && !("hook" in tsconfig);
}

/**
 * Gets a ParsedCommandLine based on the given options
 * @param {IGetParsedCommandLineOptions} options
 * @returns {GetParsedCommandLineResult}
 */
export function getParsedCommandLine({tsconfig, fileSystem, forcedCompilerOptions = {}}: IGetParsedCommandLineOptions): GetParsedCommandLineResult {
	const cwd = process.cwd();
	let parsedCommandLine: ParsedCommandLine;

	// If the user provided JSON-serializable ("raw") CompilerOptions directly, use those to build a ParsedCommandLine
	if (isRawCompilerOptions(tsconfig)) {
		parsedCommandLine = parseJsonConfigFileContent({compilerOptions: tsconfig}, fileSystem, cwd, forcedCompilerOptions);
	}

	// Otherwise, attempt to resolve it and parse it
	else {
		let tsconfigPath: string | undefined;
		let tsconfigContent: string | undefined;
		if (tsconfig !== false) {
			tsconfigPath = findConfigFile(cwd, fileSystem.fileExists, typeof tsconfig === "string" ? tsconfig : undefined);

			// If the file exists, read the tsconfig on that location
			tsconfigContent = tsconfigPath ? fileSystem.readFile(tsconfigPath) : undefined;
		}

		// Otherwise, if the user hasn't provided any tsconfig at all, start from an empty one (and only use the forced options)
		if (tsconfigContent == null && (tsconfig == null || typeof tsconfig === "boolean")) {
			tsconfigContent = "";
		}

		// Finally, if the user has provided a file that doesn't exist, throw
		else if (tsconfigContent == null) {
			throw new ReferenceError(`The given tsconfig: '${tsconfigPath}' doesn't exist!`);
		}

		parsedCommandLine = parseJsonConfigFileContent(
			parseConfigFileTextToJson(tsconfigPath!, tsconfigContent).config,
			fileSystem,
			cwd,
			forcedCompilerOptions,
			tsconfigPath
		);
	}

	// Remove all non-declaration files from the default file names since these will be handled separately by Rollup
	parsedCommandLine.fileNames = parsedCommandLine.fileNames.filter(file => file.endsWith(DECLARATION_EXTENSION));

	return {
		parsedCommandLine
	};
}
