import {
	ExportDeclaration,
	ImportDeclaration,
	ModuleDeclaration,
	SourceFile,
	TransformerFactory,
	TypeAliasDeclaration,
	updateSourceFileNode,
	VariableStatement
} from "typescript";
import {DeclarationBundlerOptions} from "../declaration-bundler-options";
import {normalize} from "path";
import {visitImportedSymbol} from "./visitor/visit-imported-symbol";
import {visitExportedSymbol} from "./visitor/visit-exported-symbol";

export function modularizer({declarationFilename, ...options}: DeclarationBundlerOptions): TransformerFactory<SourceFile> {
	return _ => {
		return sourceFile => {
			const sourceFileName = normalize(sourceFile.fileName);

			// If the SourceFile is not part of the local module names, remove all statements from it and return immediately
			if (sourceFileName !== normalize(declarationFilename)) return updateSourceFileNode(sourceFile, [], true);

			const importDeclarations: (ImportDeclaration | TypeAliasDeclaration | VariableStatement | ModuleDeclaration)[] = [];
			const exportDeclarations: ExportDeclaration[] = [];

			for (const module of options.localModuleNames) {
				const importedSymbols = options.sourceFileToImportedSymbolSet.get(module);
				const exportedSymbols = options.sourceFileToExportedSymbolSet.get(module);

				// For each imported symbol for the module,
				// check if we need to add it back in, potentially importing from another module
				// We might not need to do so in case this chunk already includes all of the bindings it references.

				if (importedSymbols != null) {
					for (const importedSymbol of importedSymbols) {
						importDeclarations.push(
							...visitImportedSymbol({
								...options,
								importedSymbol,
								module
							})
						);
					}
				}

				// For each exported symbol for the module,
				// check if we need to add it back in, potentially exporting from another module
				// We only need to add back the export if:
				// the symbol is part of the entry module for the chunk
				if (exportedSymbols != null) {
					for (const exportedSymbol of exportedSymbols) {
						exportDeclarations.push(
							...visitExportedSymbol({
								...options,
								exportedSymbol,
								module,
								isEntryModule: options.entryFileNames.includes(module),
								isEntryChunk: options.isEntryChunk
							})
						);
					}
				}
			}

			const updatedSourceFile = updateSourceFileNode(
				sourceFile,
				[...importDeclarations, ...sourceFile.statements, ...exportDeclarations],
				sourceFile.isDeclarationFile,
				sourceFile.referencedFiles,
				sourceFile.typeReferenceDirectives,
				sourceFile.hasNoDefaultLib,
				sourceFile.libReferenceDirectives
			);

			return updatedSourceFile;
		};
	};
}
