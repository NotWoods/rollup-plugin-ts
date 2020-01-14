import {createSourceFile, ScriptKind, ScriptTarget, SourceFile, transform, TransformerFactory} from "typescript";
import {SourceDescription} from "rollup";
import {declarationBundler} from "../service/transformer/declaration-bundler/declaration-bundler";
import {PreBundleDeclarationsForChunkOptions} from "./pre-bundle-declarations-for-chunk";

export interface BundleDeclarationsForChunkOptions extends PreBundleDeclarationsForChunkOptions {
	generateMap: boolean;
	preBundleResult: SourceDescription;
}

export function bundleDeclarationsForChunk(options: BundleDeclarationsForChunkOptions): SourceDescription {
	// Run a tree-shaking pass on the code
	const result = transform(
		createSourceFile(options.declarationFilename, options.preBundleResult.code, ScriptTarget.ESNext, true, ScriptKind.TS),
		declarationBundler({
			...options
		}).afterDeclarations! as TransformerFactory<SourceFile>[],
		options.languageServiceHost.getCompilationSettings()
	);

	// Print the Source code and update the code with it
	let code = options.printer.printFile(result.transformed[0]);

	// Add a source mapping URL if a map should be generated
	if (options.generateMap) {
		if (!code.endsWith("\n")) code += "\n";
		code += `//# sourceMappingURL=${options.declarationMapFilename}`;
	}

	return {
		...options.preBundleResult,
		code
	};
}
