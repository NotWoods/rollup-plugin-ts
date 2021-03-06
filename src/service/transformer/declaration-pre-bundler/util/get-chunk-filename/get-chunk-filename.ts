import {setExtension} from "../../../../../util/path/path-util";
import {extname, join, normalize} from "path";
import {SupportedExtensions} from "../../../../../util/get-supported-extensions/get-supported-extensions";
import {ChunkToOriginalFileMap} from "../../../../../util/chunk/get-chunk-to-original-file-map";
import {ChunkForModuleCache, GetChunkFilenameResult} from "../../../declaration/declaration-options";

export interface GetChunkFilenameOptions {
	fileName: string;
	supportedExtensions: SupportedExtensions;
	chunkToOriginalFileMap: ChunkToOriginalFileMap;
	chunkForModuleCache: ChunkForModuleCache;
}

/**
 * Gets the chunk filename that matches the given filename. It may be the same.
 * @param {GetChunkFilenameOptions} options
 * @return {string|undefined}
 */
export function getChunkFilename({
	chunkForModuleCache,
	chunkToOriginalFileMap,
	fileName,
	supportedExtensions
}: GetChunkFilenameOptions): GetChunkFilenameResult | undefined {
	if (chunkForModuleCache.has(fileName)) {
		return chunkForModuleCache.get(fileName)!;
	}
	for (const [chunkFilename, originalSourceFilenames] of chunkToOriginalFileMap) {
		const filenames = [normalize(fileName), join(fileName, "/index")];
		for (const file of filenames) {
			for (const originalSourceFilename of originalSourceFilenames) {
				if (originalSourceFilename === file) {
					const returnValue = {fileName: chunkFilename};
					chunkForModuleCache.set(fileName, returnValue);
					return returnValue;
				}

				for (const extension of [extname(file), ...supportedExtensions]) {
					if (originalSourceFilename === setExtension(file, extension)) {
						const returnValueWithExtension = {fileName: chunkFilename};
						chunkForModuleCache.set(fileName, returnValueWithExtension);
						return returnValueWithExtension;
					}
				}
			}
		}
	}
	chunkForModuleCache.set(fileName, undefined);
	return undefined;
}
