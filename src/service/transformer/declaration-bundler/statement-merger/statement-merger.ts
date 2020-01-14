import {createExportDeclaration, createNamedExports, SourceFile, TransformerFactory, updateSourceFileNode} from "typescript";

import {DeclarationBundlerOptions} from "../declaration-bundler-options";
import {normalize} from "path";
import {mergeExports} from "../util/merge-exports/merge-exports";
import {mergeImports} from "../util/merge-imports/merge-imports";
import {mergeTypeReferenceDirectives} from "../util/merge-file-references/merge-type-reference-directives";
import {mergeLibReferenceDirectives} from "../util/merge-file-references/merge-lib-reference-directives";

export function statementMerger({declarationFilename, ...options}: DeclarationBundlerOptions): TransformerFactory<SourceFile> {
	return _ => {
		return sourceFile => {
			const sourceFileName = normalize(sourceFile.fileName);

			// If the SourceFile is not part of the local module names, remove all statements from it and return immediately
			if (sourceFileName !== normalize(declarationFilename)) return updateSourceFileNode(sourceFile, [], true);

			const mergedStatements = mergeExports(mergeImports([...sourceFile.statements]));

			const result = updateSourceFileNode(
				sourceFile,
				mergedStatements.length < 1
					? // Create an 'export {}' declaration to mark the declaration file as module-based
					  [createExportDeclaration(undefined, undefined, createNamedExports([]))]
					: mergedStatements,
				sourceFile.isDeclarationFile,
				sourceFile.referencedFiles,
				mergeTypeReferenceDirectives(sourceFile),
				sourceFile.hasNoDefaultLib,
				mergeLibReferenceDirectives(sourceFile)
			);

			return result;
		};
	};
}
