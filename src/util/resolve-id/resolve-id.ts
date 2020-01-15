import {ExtendedResolvedModule, ResolveCache, IGetResolvedIdWithCachingOptions} from "../../service/cache/resolve-cache/resolve-cache";

interface IResolveModuleOptions extends IGetResolvedIdWithCachingOptions {
	resolveCache: ResolveCache;
}

type IBuildResolversOptions = Omit<IResolveModuleOptions, "id" | "parent">;

export type Resolver = (id: string, parent: string) => string | undefined;

interface Resolvers {
	resolver: Resolver;
	ambientResolver: Resolver;
}

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

export function buildResolvers(options: IBuildResolversOptions): Resolvers {
	const resolve = (id: string, parent: string) => resolveId({...options, id, parent});

	return {
		/**
		 * A function that given an id and a parent resolves the full path for a dependency. The Module Resolution Algorithm depends on the CompilerOptions as well
		 * as the supported extensions
		 */
		resolver(id, parent) {
			const resolved = resolve(id, parent);
			return resolved?.resolvedFileName;
		},
		/**
		 * A function that given an id and a parent resolves the full path for a dependency, prioritizing ambient files (.d.ts).
		 * The Module Resolution Algorithm depends on the CompilerOptions as well
		 * as the supported extensions
		 */
		ambientResolver(id, parent) {
			const resolved = resolve(id, parent);
			return resolved?.resolvedAmbientFileName ?? resolved?.resolvedFileName;
		}
	};
}
