import {ModuleFormat} from "rollup";
import {ModuleKind} from "typescript";

/**
 * Gets a proper ModuleKind for Typescript based on the format given from the Rollup options
 */
export function getModuleKindFromRollupFormat(format: ModuleFormat | undefined): ModuleKind {
	switch (format) {
		case "amd":
			return ModuleKind.AMD;
		case "cjs":
		case "commonjs":
			return ModuleKind.CommonJS;
		case "system":
			return ModuleKind.System;
		case "umd":
			return ModuleKind.UMD;
		case "iife":
			return ModuleKind.None;
		case "es":
		case "esm":
		case "module":
		default:
			return ModuleKind.ESNext;
	}
}
