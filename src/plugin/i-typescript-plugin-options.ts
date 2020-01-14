import {CompilerOptions, ParsedCommandLine, Diagnostic} from "typescript";
import {FileSystem} from "../util/file-system/file-system";

export interface TsConfigResolverWithFileName {
	fileName: string;
	hook(resolvedOptions: CompilerOptions): CompilerOptions;
}

export type TsConfigResolver = TsConfigResolverWithFileName["hook"];

export type OutputPathKind = "declaration" | "declarationMap";
export type OutputPathHook = (path: string, kind: OutputPathKind) => string | undefined;
export type DiagnosticsHook = (diagnostics: readonly Diagnostic[]) => readonly Diagnostic[] | undefined;

export interface HookRecord {
	outputPath: OutputPathHook;
	diagnostics: DiagnosticsHook;
}

export interface InputCompilerOptions extends Omit<CompilerOptions, "module" | "moduleResolution" | "newLine" | "jsx" | "target"> {
	module: string;
	moduleResolution: string;
	newLine: string;
	jsx: string;
	target: string;
}

export interface TypescriptPluginOptions {
	tsconfig?: string | Partial<CompilerOptions> | Partial<InputCompilerOptions> | ParsedCommandLine | TsConfigResolver | TsConfigResolverWithFileName;
	cwd: string;
	resolveTypescriptLibFrom: string;
	include: string[] | string;
	exclude: string[] | string;
	transpileOnly?: boolean;
	fileSystem: FileSystem;
	debug: boolean;
}
