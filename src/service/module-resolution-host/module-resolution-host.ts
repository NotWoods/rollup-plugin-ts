import {ModuleResolutionHost as TSModuleResolutionHost, LanguageServiceHost} from "typescript";
import {getExtension} from "../../util/path/path-util";

interface IModuleResolutionHostOptions {
	languageServiceHost: Required<Pick<LanguageServiceHost, "fileExists" | "readFile">>;
	extensions: Set<string>;
}

/**
 * A ModuleResolutionHost can resolve files
 */
export class ModuleResolutionHost implements TSModuleResolutionHost {
	constructor(private readonly options: IModuleResolutionHostOptions) {}

	/**
	 * Returns true if the given file exists
	 */
	public fileExists(fileName: string): boolean {
		return this.options.extensions.has(getExtension(fileName)) && this.options.languageServiceHost.fileExists(fileName);
	}

	/**
	 * Reads the given file
	 */
	public readFile(fileName: string, encoding?: string): string | undefined {
		return this.options.languageServiceHost.readFile(fileName, encoding);
	}
}
