import {ExtendedResolvedModule, ResolveCache} from "../../service/cache/resolve-cache/resolve-cache";
import {IGetResolvedIdWithCachingOptions} from "../../service/cache/resolve-cache/resolve-cache";

interface IResolveModuleOptions extends IGetResolvedIdWithCachingOptions {
	resolveCache: ResolveCache;
}

export type Resolver = (id: string, parent: string) => string | undefined;

/**
 * Resolves an id from the given parent
 * @param {IResolveModuleOptions} opts
 * @returns {ExtendedResolvedModule|null}
 */
export function resolveId({resolveCache, ...options}: IResolveModuleOptions): ExtendedResolvedModule | null {
	// Don't proceed if there is no parent (in which case this is an entry module)
	if (options.parent == null) return null;

	return resolveCache.get(options);
}
