import {LanguageService, ParsedCommandLine} from "typescript";
import {EmitCache} from "../cache/emit-cache/emit-cache";
import {InputOptions} from "rollup";
import {TypescriptPluginOptions} from "../../plugin/i-typescript-plugin-options";
import {CustomTransformersFunction} from "../../util/merge-transformers/i-custom-transformer-options";
import {FileSystem} from "../../util/file-system/file-system";
import {ResolveCache} from "../cache/resolve-cache/resolve-cache";
import {SupportedExtensions} from "../../util/get-supported-extensions/get-supported-extensions";

export interface ILanguageServiceOptions {
	parsedCommandLine: ParsedCommandLine;
	cwd: TypescriptPluginOptions["cwd"];
	resolveTypescriptLibFrom: TypescriptPluginOptions["resolveTypescriptLibFrom"];
	transformers?: CustomTransformersFunction;
	emitCache: EmitCache;
	resolveCache: ResolveCache;
	rollupInputOptions: InputOptions;
	supportedExtensions: SupportedExtensions;
	languageService(): LanguageService;
	fileSystem: FileSystem;
}
