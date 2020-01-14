import {
	CompilerHost,
	CompilerOptions,
	getDefaultLibFileName,
	IScriptSnapshot,
	LanguageServiceHost,
	ResolvedModuleFull,
	ScriptKind,
	ScriptSnapshot,
	SourceFile,
	getDefaultLibFilePath
} from "typescript";
import {join, dirname} from "path";
import {getNewLineCharacter} from "../../util/get-new-line-character/get-new-line-character";
import {ILanguageServiceOptions} from "./i-language-service-options";
import {IFile, IFileInput} from "./i-file";
import {getScriptKindFromPath} from "../../util/get-script-kind-from-path/get-script-kind-from-path";
import {DEFAULT_LIB_NAMES} from "../../constant/constant";
import {ensureAbsolute, isInternalFile} from "../../util/path/path-util";
import {IExtendedDiagnostic} from "../../diagnostic/i-extended-diagnostic";
import {resolveId} from "../../util/resolve-id/resolve-id";
import {FileSystem} from "../../util/file-system/file-system";

/**
 * An implementation of a LanguageService for Typescript
 */
export class IncrementalLanguageService implements LanguageServiceHost, CompilerHost {
	/**
	 * A Map between filenames and emitted code
	 * @type {Map<string, string>}
	 */
	public emittedFiles: Map<string, string> = new Map();

	/**
	 * The Set of all files that has been added manually via the public API
	 * @type {Set<string>}
	 */
	public publicFiles: Set<string> = new Set();

	/**
	 * A Map between file names and their IFiles
	 */
	private readonly files: Map<string, IFile> = new Map();

	constructor(private readonly options: ILanguageServiceOptions) {
		this.addDefaultLibs();
		this.addDefaultFileNames();

		this.realpath = this.options.fileSystem.realpath;
		this.readDirectory = this.options.fileSystem.readDirectory;
		this.getDefaultLibFileName = getDefaultLibFileName;
	}

	/**
	 * Writes a file. Will simply put it in the emittedFiles Map
	 */
	public writeFile(fileName: string, data: string): void {
		this.emittedFiles.set(fileName, data);
	}

	/**
	 * Gets a SourceFile from the given fileName
	 */
	public getSourceFile(fileName: string): SourceFile | undefined {
		const program = this.options.languageService().getProgram();
		if (program == null) return undefined;
		return program.getSourceFile(fileName);
	}

	/**
	 * Gets all diagnostics reported of transformers for the given filename
	 */
	public getTransformerDiagnostics(fileName?: string): ReadonlyArray<IExtendedDiagnostic> {
		// If diagnostics for only a specific file should be retrieved, try to get it from the files map and return its transformer diagnostics
		if (fileName != null) {
			const fileMatch = this.files.get(fileName);
			if (fileMatch == null) return [];
			return fileMatch.transformerDiagnostics;
		}

		// Otherwise, take all transformer diagnostics for all files
		else {
			return ([] as IExtendedDiagnostic[]).concat.apply(
				[],
				[...this.files.values()].map(v => v.transformerDiagnostics)
			);
		}
	}

	/**
	 * Adds a File to the CompilerHost
	 */
	public addFile(file: IFileInput, internal: boolean = false): void {
		const existing = this.files.get(file.file);

		// Don't proceed if the file contents are completely unchanged
		if (existing != null && existing.code === file.code) return;

		this.files.set(file.file, {
			...file,
			scriptKind: getScriptKindFromPath(file.file),
			snapshot: ScriptSnapshot.fromString(file.code),
			version: existing != null ? existing.version + 1 : 0,
			transformerDiagnostics: []
		});

		if (!internal) {
			// Add the file to the Set of files that has been added manually by the user
			this.publicFiles.add(file.file);
		}

		// Remove the file from the emit cache
		this.options.emitCache.delete(file.file);
	}

	/**
	 * Deletes a file from the LanguageService
	 */
	public deleteFile(fileName: string): boolean {
		const filesResult = this.files.delete(fileName);
		const publicFilesResult = this.publicFiles.delete(fileName);
		const cacheResult = this.options.emitCache.delete(fileName);
		return filesResult || publicFilesResult || cacheResult;
	}

	/**
	 * Returns true if the given file exists
	 */
	public fileExists(fileName: string): boolean {
		// Check if the file exists cached
		if (this.files.has(fileName)) return true;

		// Otherwise, check if it exists on disk
		return this.options.fileSystem.fileExists(fileName);
	}

	/**
	 * Gets the current directory
	 */
	public getCurrentDirectory(): string {
		return this.options.cwd;
	}

	/**
	 * Reads the given file
	 * @param {string} fileName
	 * @param {string} [encoding]
	 * @returns {string | undefined}
	 */
	public readFile(fileName: string, encoding?: string): string | undefined {
		// Check if the file exists within the cached files and return it if so
		const result = this.files.get(fileName);
		if (result != null) return result.code;

		// Otherwise, try to properly resolve the file
		return this.options.fileSystem.readFile(fileName, encoding);
	}

	public resolveModuleNames(moduleNames: string[], containingFile: string): (ResolvedModuleFull | undefined)[] {
		const resolvedModules: (ResolvedModuleFull | undefined)[] = [];
		for (const moduleName of moduleNames) {
			// try to use standard resolution
			let result = resolveId({
				cwd: this.options.cwd,
				parent: containingFile,
				id: moduleName,
				moduleResolutionHost: this,
				options: this.getCompilationSettings(),
				resolveCache: this.options.resolveCache,
				supportedExtensions: this.options.supportedExtensions
			});
			if (result != null && result.resolvedAmbientFileName != null) {
				resolvedModules.push({...result, resolvedFileName: result.resolvedAmbientFileName});
			} else if (result != null && result.resolvedFileName != null) {
				resolvedModules.push({...result, resolvedFileName: result.resolvedFileName});
			} else {
				resolvedModules.push(undefined);
			}
		}
		return resolvedModules;
	}

	/**
	 * Reads the given directory
	 */
	public readDirectory: FileSystem["readDirectory"];

	/**
	 * Gets the real path for the given path. Meant to resolve symlinks
	 */
	public realpath: FileSystem["realpath"];

	/**
	 * Gets the default lib file name based on the given CompilerOptions
	 * @param {CompilerOptions} options
	 * @returns {string}
	 */
	public getDefaultLibFileName: LanguageServiceHost["getDefaultLibFileName"];

	/**
	 * Gets the newline to use
	 */
	public getNewLine(): string {
		return getNewLineCharacter(this.options.parsedCommandLine.options.newLine, this.options.fileSystem);
	}

	/**
	 * Returns true if file names should be treated as case-sensitive
	 */
	public useCaseSensitiveFileNames(): boolean {
		return this.options.fileSystem.useCaseSensitiveFileNames;
	}

	/**
	 * Gets the CompilerOptions provided in the constructor
	 */
	public getCompilationSettings(): CompilerOptions {
		return this.options.parsedCommandLine.options;
	}

	/**
	 * Gets all Script file names
	 */
	public getScriptFileNames(): string[] {
		return [...this.files.keys()];
	}

	/**
	 * Gets the ScriptKind for the given file name
	 */
	public getScriptKind(fileName: string): ScriptKind {
		return this.assertHasFileName(fileName).scriptKind;
	}

	/**
	 * Gets a ScriptSnapshot for the given file
	 */
	public getScriptSnapshot(fileName: string): IScriptSnapshot | undefined {
		const file = this.assertHasFileName(fileName);
		return file.snapshot;
	}

	/**
	 * Gets the Script version for the given file name
	 */
	public getScriptVersion(fileName: string): string {
		return String(this.assertHasFileName(fileName).version);
	}

	/**
	 * Gets the canonical filename for the given file
	 */
	public getCanonicalFileName(fileName: string): string {
		return this.useCaseSensitiveFileNames() ? fileName : fileName.toLowerCase();
	}

	/**
	 * Gets all directories within the given directory path
	 */
	public getDirectories(directoryName: string): string[] {
		return this.options.fileSystem.getDirectories(directoryName);
	}

	/**
	 * Returns true if the given directory exists
	 */
	public directoryExists(directoryName: string): boolean {
		return this.options.fileSystem.directoryExists(directoryName);
	}

	/**
	 * Adds all default lib files to the LanguageService
	 */
	private addDefaultLibs(): void {
		const libDirectory = dirname(getDefaultLibFilePath(this.options.parsedCommandLine.options));
		DEFAULT_LIB_NAMES.forEach(libName => {
			const path = join(libDirectory, libName);
			const code = this.options.fileSystem.readFile(path);
			if (code == null) return;

			this.addFile({file: libName, code}, true);
		});
	}

	/**
	 * Adds all default declaration files to the LanguageService
	 */
	private addDefaultFileNames(): void {
		this.options.parsedCommandLine.fileNames.forEach(file => {
			const code = this.options.fileSystem.readFile(ensureAbsolute(this.options.cwd, file));
			if (code != null) {
				this.addFile(
					{
						file: file,
						code
					},
					true
				);
			}
		});
	}

	/**
	 * Asserts that the given file name exists within the LanguageServiceHost
	 */
	private assertHasFileName(fileName: string): IFile {
		if (!this.files.has(fileName)) {
			const absoluteFileName = DEFAULT_LIB_NAMES.has(fileName) ? fileName : ensureAbsolute(this.options.cwd, fileName);

			// If the file exists on disk, add it
			const code = this.options.fileSystem.readFile(absoluteFileName);
			if (code != null) {
				this.addFile({file: absoluteFileName, code}, isInternalFile(absoluteFileName));
				return this.files.get(absoluteFileName)!;
			} else {
				throw new ReferenceError(`The given file: '${absoluteFileName}' doesn't exist!`);
			}
		} else {
			return this.files.get(fileName)!;
		}
	}
}
