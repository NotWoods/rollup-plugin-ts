import {EmitOutput, LanguageService} from "typescript";

interface IGetEmitOutputWithCachingOptions {
	languageService: LanguageService;
	fileName: string;
	dtsOnly?: boolean;
}

/**
 * A cache over EmitOutputs
 */
export class EmitCache {
	/**
	 * A memory-persistent cache of EmitOutputs for files over time
	 */
	private readonly EMIT_CACHE: Map<string, EmitOutput> = new Map();

	/**
	 * Gets an EmitOutput from the emit cache
	 */
	public getFromCache(fileName: string, dtsOnly: boolean = false): EmitOutput | undefined {
		return this.EMIT_CACHE.get(EmitCache.computeCacheKey(fileName, dtsOnly));
	}

	/**
	 * Deletes the entry matching the combination of fileName and whether or not only to emit declarations from the cache
	 */
	public delete(fileName: string): boolean {
		const dtsCacheResult = this.EMIT_CACHE.delete(EmitCache.computeCacheKey(fileName, true));
		const nonDtsCacheResult = this.EMIT_CACHE.delete(EmitCache.computeCacheKey(fileName, false));
		return dtsCacheResult || nonDtsCacheResult;
	}

	/**
	 * Sets the given EmitOutput in the emit cache
	 */
	public setInCache(emitOutput: EmitOutput, fileName: string, dtsOnly: boolean = false): EmitOutput {
		this.EMIT_CACHE.set(EmitCache.computeCacheKey(fileName, dtsOnly), emitOutput);
		return emitOutput;
	}

	/**
	 * Gets EmitOut and optionally retrieves it from the cache if it exists there already.
	 * If not, it will compute it, update the cache, and then return it
	 */
	public get({fileName, dtsOnly, languageService}: IGetEmitOutputWithCachingOptions): EmitOutput {
		const cacheResult = this.getFromCache(fileName, dtsOnly);
		if (cacheResult != null) {
			return cacheResult;
		}

		// Otherwise, generate new emit output and cache it before returning it
		const freshResult = languageService.getEmitOutput(fileName, dtsOnly);
		return this.setInCache(freshResult, fileName, dtsOnly);
	}

	/**
	 * Computes a cache key from the given combination of a file name and whether or not only to emit
	 * declaration files
	 */
	private static computeCacheKey(fileName: string, dtsOnly: boolean): string {
		return `${fileName}.${Number(dtsOnly)}`;
	}
}
