import {dirname, join, normalize, relative} from "path";
import {createProgram, LanguageServiceHost, CompilerHost, WriteFileCallback} from "typescript";
import {ExistingRawSourceMap, SourceDescription} from "rollup";
import {ensurePosix} from "../util/path/path-util";
import {DECLARATION_EXTENSION, DECLARATION_MAP_EXTENSION} from "../constant/constant";
import {getChunkFilename} from "../service/transformer/declaration-pre-bundler/util/get-chunk-filename/get-chunk-filename";
import {declarationPreBundler} from "../service/transformer/declaration-pre-bundler/declaration-pre-bundler";
import {DeclarationPreBundlerOptions} from "../service/transformer/declaration-pre-bundler/declaration-pre-bundler-options";

export interface PreBundleDeclarationsForChunkOptions extends Omit<DeclarationPreBundlerOptions, "typeChecker"> {
	languageServiceHost: CompilerHost & Pick<LanguageServiceHost, "getCompilationSettings">;
}

export function preBundleDeclarationsForChunk(options: PreBundleDeclarationsForChunkOptions): SourceDescription {
	const program = createProgram({
		rootNames: options.localModuleNames,
		options: options.languageServiceHost.getCompilationSettings(),
		host: options.languageServiceHost
	});

	const cwd = process.cwd();
	const typeChecker = program.getTypeChecker();

	const compilationSettings = options.languageServiceHost.getCompilationSettings();
	const generatedOutDir = compilationSettings.outDir!;

	let code: string = "";
	let map: ExistingRawSourceMap | undefined;
	const writeFile: WriteFileCallback = (file, data) => {
		const normalizedFile = normalize(file);
		const replacedFile = normalize(normalizedFile.replace(generatedOutDir, "").replace(cwd, ""));
		const replacedFileDir = normalize(dirname(replacedFile));

		if (replacedFile.endsWith(DECLARATION_MAP_EXTENSION)) {
			const parsedData = JSON.parse(data) as ExistingRawSourceMap;
			parsedData.file = options.declarationFilename;
			parsedData.sources = parsedData.sources
				.map(source => {
					const correctedSource = join(replacedFileDir, source);
					const posixSource = ensurePosix(correctedSource);

					// Generated files may follow the structure: '<generated-sub-dir>/<path>', and as such,
					// all sources will be relative to the source content as if they were emitted to a subfolder of
					// cwd. Because, of that, we first need to correct the source path so it is instead relative
					// to cwd
					const sourceFromCwd = posixSource.startsWith("../") ? posixSource.slice("../".length) : posixSource;
					const absoluteSourceFromCwd = join(cwd, sourceFromCwd);
					return relative(options.absoluteDeclarationMapDirname, absoluteSourceFromCwd);
				})
				// Include only those sources that are actually part of the chunk
				.filter(source => {
					const absoluteSource = join(options.absoluteDeclarationMapDirname, source);
					const chunkFileNameResult = getChunkFilename({...options, fileName: absoluteSource});
					return chunkFileNameResult != null && chunkFileNameResult.fileName === options.absoluteChunkFileName;
				})
				// Make sure that the paths are POSIX-based
				.map(ensurePosix);

			// If there are sources for this chunk, include it
			if (parsedData.sources.length > 0) {
				if (map == null) {
					map = parsedData;
				} else {
					map.sources = [...new Set([...map.sources, ...parsedData.sources])];
					map.mappings += parsedData.mappings;
				}
			}
		} else if (replacedFile.endsWith(DECLARATION_EXTENSION)) {
			const replacedData = data.replace(/(\/\/# sourceMappingURL=)(.*\.map)/g, () => "") + "\n";

			// Only add the data if it contains anything else than pure whitespace
			if (/\S/gm.test(replacedData)) {
				code += replacedData;
			}
		}
	};

	const emitOnlyDtsFiles = true;
	const customTransformers = declarationPreBundler({...options, typeChecker});

	program.emit(undefined, writeFile, undefined, emitOnlyDtsFiles, customTransformers);

	return {
		code,
		map: map == null ? undefined : JSON.stringify(map)
	};
}
