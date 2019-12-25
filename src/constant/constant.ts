export const SOURCE_MAP_EXTENSION = ".map";
export const TS_EXTENSION = ".ts";
export const TSX_EXTENSION = ".tsx";
export const JS_EXTENSION = ".js";
export const JS_MAP_EXTENSION = `${JS_EXTENSION}${SOURCE_MAP_EXTENSION}`;
export const JSX_EXTENSION = ".jsx";
export const JSON_EXTENSION = ".json";
export const MJS_EXTENSION = ".mjs";
export const MJSX_EXTENSION = ".mjsx";
export const DECLARATION_EXTENSION = `.d${TS_EXTENSION}`;
export const DECLARATION_MAP_EXTENSION = `.d${TS_EXTENSION}${SOURCE_MAP_EXTENSION}`;

export const KNOWN_EXTENSIONS = new Set([
	DECLARATION_EXTENSION,
	DECLARATION_MAP_EXTENSION,
	JS_MAP_EXTENSION,
	TS_EXTENSION,
	TSX_EXTENSION,
	JS_EXTENSION,
	JSX_EXTENSION,
	JSON_EXTENSION,
	MJS_EXTENSION,
	MJSX_EXTENSION
] as const);

export const NODE_MODULES = "node_modules";
export const SOURCE_MAP_COMMENT = "\n//# sourceMappingURL";
export const TSLIB_NAME = `tslib${DECLARATION_EXTENSION}`;

export const MAIN_FIELDS = ["module", "es2015", "esm2015", "jsnext:main", "main"];

export const MAIN_FIELDS_BROWSER = ["browser", "module", "es2015", "esm2015", "jsnext:main", "main"];

export const ROLLUP_PLUGIN_MULTI_ENTRY = "\0rollup-plugin-multi-entry:entry-point";

export const DEFAULT_LIB_NAMES: Set<string> = new Set([
	"lib.d.ts",
	"lib.dom.d.ts",
	"lib.dom.iterable.d.ts",
	"lib.es5.d.ts",
	"lib.es6.d.ts",
	"lib.es2015.collection.d.ts",
	"lib.es2015.core.d.ts",
	"lib.es2015.d.ts",
	"lib.es2015.generator.d.ts",
	"lib.es2015.iterable.d.ts",
	"lib.es2015.promise.d.ts",
	"lib.es2015.proxy.d.ts",
	"lib.es2015.reflect.d.ts",
	"lib.es2015.symbol.d.ts",
	`lib.es2015.symbol.wellknown.d.ts`,
	"lib.es2016.array.include.d.ts",
	"lib.es2016.d.ts",
	"lib.es2016.full.d.ts",
	"lib.es2017.d.ts",
	"lib.es2017.full.d.ts",
	"lib.es2017.intl.d.ts",
	"lib.es2017.object.d.ts",
	"lib.es2017.sharedmemory.d.ts",
	"lib.es2017.string.d.ts",
	"lib.es2017.typedarrays.d.ts",
	"lib.es2018.d.ts",
	"lib.es2018.full.d.ts",
	"lib.es2018.intl.d.ts",
	"lib.es2018.promise.d.ts",
	"lib.es2018.regexp.d.ts",
	"lib.es2018.asynciterable.d.ts",
	"lib.es2018.asyncgenerator.d.ts",
	"lib.es2019.array.d.ts",
	"lib.es2019.d.ts",
	"lib.es2019.full.d.ts",
	"lib.es2019.string.d.ts",
	"lib.es2019.object.d.ts",
	"lib.es2019.symbol.d.ts",
	"lib.es2020.d.ts",
	"lib.es2020.full.d.ts",
	"lib.es2020.string.d.ts",
	"lib.es2020.symbol.wellknown.d.ts",
	"lib.esnext.asynciterable.d.ts",
	"lib.esnext.array.d.ts",
	"lib.esnext.d.ts",
	"lib.esnext.bigint.d.ts",
	"lib.esnext.full.d.ts",
	"lib.esnext.intl.d.ts",
	"lib.esnext.symbol.d.ts",
	"lib.scripthost.d.ts",
	"lib.webworker.d.ts",
	"lib.webworker.importscripts.d.ts"
]);

export const DEBUG =
	process.env.ROLLUP_PLUGIN_TS_DEBUG === "true" || process.env.ROLLUP_PLUGIN_TS_DEBUG === "" || process.env.ROLLUP_PLUGIN_TS_DEBUG === "1";
