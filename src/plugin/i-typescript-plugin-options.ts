import {CompilerOptions, ParsedCommandLine} from "typescript";
import {FileSystem} from "../util/file-system/file-system";

export interface TsConfigResolverWithFileName {
	fileName: string;
	hook(resolvedOptions: CompilerOptions): CompilerOptions;
}

export type TsConfigResolver = TsConfigResolverWithFileName["hook"];

export interface InputCompilerOptions extends Omit<CompilerOptions, "module" | "moduleResolution" | "newLine" | "jsx" | "target"> {
	module: string;
	moduleResolution: string;
	newLine: string;
	jsx: string;
	target: string;
}

export interface TypescriptPluginOptions {
	tsconfig?: string | Partial<CompilerOptions> | Partial<InputCompilerOptions> | ParsedCommandLine | TsConfigResolver | TsConfigResolverWithFileName;
	include: string[] | string;
	exclude: string[] | string;
	transpileOnly?: boolean;
	fileSystem: FileSystem;
}
