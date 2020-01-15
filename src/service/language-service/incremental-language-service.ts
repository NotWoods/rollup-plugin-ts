import {
	CompilerHost,
	getDefaultLibFileName,
	IScriptSnapshot,
	LanguageServiceHost,
	ResolvedModuleFull,
	ScriptKind,
	ScriptSnapshot,
	SourceFile,
	getDefaultLibFilePath,
	LanguageService,
	ParsedCommandLine,
	ModuleResolutionHost
} from "typescript";
import {join, dirname} from "path";
import {getNewLineCharacter} from "../../util/get-new-line-character/get-new-line-character";
import {getScriptKindFromPath} from "../../util/get-script-kind-from-path/get-script-kind-from-path";
import {DEFAULT_LIB_NAMES} from "../../constant/constant";
import {ensureAbsolute, isInternalFile} from "../../util/path/path-util";
import {resolveId} from "../../util/resolve-id/resolve-id";
import {FileSystem} from "../../util/file-system/file-system";
import {EmitCache} from "../cache/emit-cache/emit-cache";
import {ResolveCache} from "../cache/resolve-cache/resolve-cache";
import {SupportedExtensions} from "../../util/get-supported-extensions/get-supported-extensions";

interface IFile {
	file: string;
	code: string;
	scriptKind: ScriptKind;
	snapshot: IScriptSnapshot;
	version: number;
}

interface ILanguageServiceOptions {
	parsedCommandLine: ParsedCommandLine;
	emitCache: EmitCache;
	resolveCache: ResolveCache;
	supportedExtensions: SupportedExtensions;
	languageService(): LanguageService;
	fileSystem: FileSystem;
}

/**
 * An implementation of a LanguageService for Typescript
 */
export class IncrementalLanguageService implements LanguageServiceHost, CompilerHost, ModuleResolutionHost {
	/**
	 * A Map between filenames and emitted code
	 */
	public emittedFiles: Map<string, string> = new Map();

	/**
	 * The Set of all files that has been added manually via the public API
	 */
	public publicFiles: Set<string> = new Set();

	/**
	 * A Map between file names and their IFiles
	 */
	private readonly files: Map<string, IFile> = new Map();

	constructor(private readonly options: ILanguageServiceOptions) {
		const sys = options.fileSystem;
		this.addDefaultLibs();
		this.addDefaultFileNames();

		this.realpath = sys.realpath;
		this.readDirectory = sys.readDirectory;
		this.getDefaultLibFileName = getDefaultLibFileName;
		this.getCurrentDirectory = () => process.cwd();
		this.getNewLine = () => getNewLineCharacter(options.parsedCommandLine.options.newLine, sys);
		this.useCaseSensitiveFileNames = () => sys.useCaseSensitiveFileNames;
		this.getCompilationSettings = () => options.parsedCommandLine.options;
		this.getDirectories = sys.getDirectories;
		this.directoryExists = sys.directoryExists;
	}

	/** Gets the current working directory */
	public getCurrentDirectory: LanguageServiceHost["getCurrentDirectory"];
	/** Reads the given directory */
	public readDirectory: LanguageServiceHost["readDirectory"];
	/** Gets the real path for the given path. Meant to resolve symlinks */
	public realpath: LanguageServiceHost["realpath"];
	/** Gets the default lib file name based on the given CompilerOptions */
	public getDefaultLibFileName: LanguageServiceHost["getDefaultLibFileName"];
	/** Gets the newline to use */
	public getNewLine: CompilerHost["getNewLine"];
	/** Returns true if file names should be treated as case-sensitive */
	public useCaseSensitiveFileNames: CompilerHost["useCaseSensitiveFileNames"];
	/** Gets the CompilerOptions provided in the constructor */
	public getCompilationSettings: LanguageServiceHost["getCompilationSettings"];
	/** Gets all directories within the given directory path */
	public getDirectories: LanguageServiceHost["getDirectories"];
	/** Returns true if the given directory exists */
	public directoryExists: LanguageServiceHost["directoryExists"];

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
		return this.options
			.languageService()
			.getProgram()
			?.getSourceFile(fileName);
	}

	/**
	 * Adds a File to the CompilerHost
	 */
	public addFile(file: string, code: string, internal: boolean = false): void {
		const existing = this.files.get(file);

		// Don't proceed if the file contents are completely unchanged
		if (existing?.code === code) return;

		this.files.set(file, {
			file,
			code,
			scriptKind: getScriptKindFromPath(file),
			snapshot: ScriptSnapshot.fromString(code),
			version: existing != null ? existing.version + 1 : 0
		});

		if (!internal) {
			// Add the file to the Set of files that has been added manually by the user
			this.publicFiles.add(file);
		}

		// Remove the file from the emit cache
		this.options.emitCache.delete(file);
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

	/** Reads the given file */
	public readFile(fileName: string, encoding?: string): string | undefined {
		// Check if the file exists within the cached files and return it if so
		const result = this.files.get(fileName);
		if (result != null) return result.code;

		// Otherwise, try to properly resolve the file
		return this.options.fileSystem.readFile(fileName, encoding);
	}

	public resolveModuleNames(moduleNames: string[], containingFile: string): (ResolvedModuleFull | undefined)[] {
		return moduleNames.map(moduleName => {
			// try to use standard resolution
			let result = resolveId({
				parent: containingFile,
				id: moduleName,
				moduleResolutionHost: this,
				options: this.getCompilationSettings(),
				resolveCache: this.options.resolveCache,
				supportedExtensions: this.options.supportedExtensions
			});
			if (result?.resolvedAmbientFileName != null) {
				return {...result, resolvedFileName: result.resolvedAmbientFileName};
			} else if (result?.resolvedFileName != null) {
				return {...result, resolvedFileName: result.resolvedFileName};
			} else {
				return undefined;
			}
		});
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
		return this.assertHasFileName(fileName).snapshot;
	}

	/**
	 * Gets the Script version for the given file name
	 */
	public getScriptVersion(fileName: string): string {
		return this.assertHasFileName(fileName).version.toString();
	}

	/**
	 * Gets the canonical filename for the given file
	 */
	public getCanonicalFileName(fileName: string): string {
		return this.useCaseSensitiveFileNames() ? fileName : fileName.toLowerCase();
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

			this.addFile(libName, code, true);
		});
	}

	/**
	 * Adds all default declaration files to the LanguageService
	 */
	private addDefaultFileNames(): void {
		const cwd = process.cwd();
		this.options.parsedCommandLine.fileNames.forEach(file => {
			const code = this.options.fileSystem.readFile(ensureAbsolute(cwd, file));
			if (code != null) {
				this.addFile(file, code, true);
			}
		});
	}

	/**
	 * Asserts that the given file name exists within the LanguageServiceHost
	 */
	private assertHasFileName(fileName: string): IFile {
		const cwd = process.cwd();
		if (!this.files.has(fileName)) {
			const absoluteFileName = DEFAULT_LIB_NAMES.has(fileName) ? fileName : ensureAbsolute(cwd, fileName);

			// If the file exists on disk, add it
			const code = this.options.fileSystem.readFile(absoluteFileName);
			if (code != null) {
				this.addFile(absoluteFileName, code, isInternalFile(absoluteFileName));
				return this.files.get(absoluteFileName)!;
			} else {
				throw new ReferenceError(`The given file: '${absoluteFileName}' doesn't exist!`);
			}
		} else {
			return this.files.get(fileName)!;
		}
	}
}
