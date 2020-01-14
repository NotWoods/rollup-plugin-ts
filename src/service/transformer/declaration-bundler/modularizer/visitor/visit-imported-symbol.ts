import {
	createIdentifier,
	createImportClause,
	createImportDeclaration,
	createImportSpecifier,
	createModuleBlock,
	createModuleDeclaration,
	createNamedImports,
	createNamespaceImport,
	createStringLiteral,
	createTypeAliasDeclaration,
	createTypeQueryNode,
	createTypeReferenceNode,
	createVariableDeclaration,
	createVariableDeclarationList,
	createVariableStatement,
	ImportDeclaration,
	ModuleDeclaration,
	NodeFlags,
	Statement,
	SyntaxKind,
	TypeAliasDeclaration,
	TypeQueryNode,
	TypeReferenceNode,
	VariableStatement
} from "typescript";
import {dirname, relative} from "path";
import {ensureHasLeadingDotAndPosix, stripKnownExtension} from "../../../../../util/path/path-util";
import {SupportedExtensions} from "../../../../../util/get-supported-extensions/get-supported-extensions";
import {ChunkToOriginalFileMap} from "../../../../../util/chunk/get-chunk-to-original-file-map";
import {
	ImportedSymbol,
	NamedExportedSymbol,
	NamedImportedSymbol,
	SourceFileToExportedSymbolSet,
	SourceFileToLocalSymbolMap
} from "../../../declaration-pre-bundler/declaration-pre-bundler-options";
import {getChunkFilename} from "../../../declaration-pre-bundler/util/get-chunk-filename/get-chunk-filename";
import {ensureHasDeclareModifier, removeExportAndDeclareModifiers} from "../../../declaration-pre-bundler/util/modifier/modifier-util";
import {ChunkForModuleCache} from "../../../declaration/declaration-options";
import {cloneNode} from "@wessberg/ts-clone-node";

export interface VisitImportedSymbolOptions {
	chunkForModuleCache: ChunkForModuleCache;
	sourceFileToLocalSymbolMap: SourceFileToLocalSymbolMap;
	sourceFileToExportedSymbolSet: SourceFileToExportedSymbolSet;
	importedSymbol: ImportedSymbol;
	module: string;
	supportedExtensions: SupportedExtensions;
	chunkToOriginalFileMap: ChunkToOriginalFileMap;
	absoluteChunkFileName: string;
}

export function createAliasedBinding(
	importedSymbol: NamedImportedSymbol,
	propertyName: string
): ImportDeclaration | TypeAliasDeclaration | VariableStatement {
	switch (importedSymbol.node.kind) {
		case SyntaxKind.ClassDeclaration:
		case SyntaxKind.ClassExpression:
		case SyntaxKind.FunctionDeclaration:
		case SyntaxKind.FunctionExpression:
		case SyntaxKind.EnumDeclaration:
		case SyntaxKind.VariableDeclaration:
		case SyntaxKind.VariableStatement:
		case SyntaxKind.ExportAssignment: {
			return createVariableStatement(
				ensureHasDeclareModifier(undefined),
				createVariableDeclarationList(
					[createVariableDeclaration(createIdentifier(importedSymbol.name), createTypeQueryNode(createIdentifier(propertyName)))],
					NodeFlags.Const
				)
			);
		}

		default: {
			return createTypeAliasDeclaration(
				undefined,
				undefined,
				createIdentifier(importedSymbol.name),
				undefined,
				createTypeReferenceNode(createIdentifier(propertyName), undefined)
			);
		}
	}
}

export function createTypeReferenceOrTypeQueryBasedOnNode(exportedSymbol: NamedExportedSymbol): TypeReferenceNode | TypeQueryNode {
	switch (exportedSymbol.node.kind) {
		case SyntaxKind.ClassDeclaration:
		case SyntaxKind.ClassExpression:
		case SyntaxKind.FunctionDeclaration:
		case SyntaxKind.FunctionExpression:
		case SyntaxKind.EnumDeclaration:
		case SyntaxKind.VariableDeclaration:
		case SyntaxKind.VariableStatement: {
			return createTypeQueryNode(createIdentifier(exportedSymbol.name));
		}

		default: {
			return createTypeReferenceNode(createIdentifier(exportedSymbol.name), undefined);
		}
	}
}

function getAllNamedExportsForModule(moduleName: string, sourceFileToExportedSymbolSet: SourceFileToExportedSymbolSet): NamedExportedSymbol[] {
	const exportedSymbols = sourceFileToExportedSymbolSet.get(moduleName);
	if (exportedSymbols == null) return [];
	const namedExportedSymbols: NamedExportedSymbol[] = [];

	for (const exportedSymbol of exportedSymbols) {
		if ("namespaceExport" in exportedSymbol) {
			if (exportedSymbol.originalModule !== moduleName) {
				namedExportedSymbols.push(...getAllNamedExportsForModule(exportedSymbol.originalModule, sourceFileToExportedSymbolSet));
			}
		} else if (!exportedSymbol.defaultExport) {
			namedExportedSymbols.push(exportedSymbol);
		}
	}

	return namedExportedSymbols;
}

export function visitImportedSymbol(
	options: VisitImportedSymbolOptions
): (ImportDeclaration | TypeAliasDeclaration | ModuleDeclaration | VariableStatement)[] {
	const {importedSymbol, sourceFileToExportedSymbolSet, sourceFileToLocalSymbolMap, absoluteChunkFileName, module} = options;
	const otherChunkFileName = getChunkFilename({...options, fileName: importedSymbol.originalModule});
	const importDeclarations: (ImportDeclaration | TypeAliasDeclaration | ModuleDeclaration)[] = [];

	// Generate a module specifier that points to the referenced module, relative to the current sourcefile
	const relativeToSourceFileDirectory =
		importedSymbol.isExternal && importedSymbol.rawModuleSpecifier != null
			? importedSymbol.rawModuleSpecifier
			: otherChunkFileName == null
			? importedSymbol.originalModule
			: relative(dirname(absoluteChunkFileName), otherChunkFileName.fileName);
	const moduleSpecifier =
		importedSymbol.isExternal && importedSymbol.rawModuleSpecifier != null
			? importedSymbol.rawModuleSpecifier
			: ensureHasLeadingDotAndPosix(stripKnownExtension(relativeToSourceFileDirectory), false);

	// Find the local symbols for the referenced module
	const otherModuleLocalSymbols = sourceFileToLocalSymbolMap.get(importedSymbol.originalModule);

	// Find the local symbols for the current module
	const currentModuleLocalSymbols = sourceFileToLocalSymbolMap.get(module);

	// Find the exported symbols for the referenced module
	const otherModuleExportedSymbols = sourceFileToExportedSymbolSet.get(importedSymbol.originalModule);

	// If the module originates from a file not part of the compilation (such as an external module),
	// always include the import
	if (otherChunkFileName == null || importedSymbol.isExternal) {
		return [
			...importDeclarations,
			createImportDeclaration(
				undefined,
				undefined,
				createImportClause(
					"defaultImport" in importedSymbol && importedSymbol.defaultImport ? createIdentifier(importedSymbol.name) : undefined,
					"namespaceImport" in importedSymbol
						? createNamespaceImport(createIdentifier(importedSymbol.name))
						: importedSymbol.defaultImport
						? undefined
						: createNamedImports([
								createImportSpecifier(
									importedSymbol.propertyName != null ? createIdentifier(importedSymbol.propertyName) : undefined,
									createIdentifier(importedSymbol.name)
								)
						  ])
				),
				createStringLiteral(moduleSpecifier)
			)
		];
	}

	// If the import originates from a module within the same chunk,
	if (absoluteChunkFileName === otherChunkFileName.fileName) {
		// Most likely, the import should be left out, given that the symbol
		// might already be part of the chunk.
		// But, there can be plenty reasons why that would not be the case.
		// For example, it may be a default import in which case the name may not be equal to that of
		// the original binding.
		// Or, it may be something like 'export {...} from "..."'
		// in which case *that* might be part of a different chunk (or none at all).
		if (otherModuleExportedSymbols != null) {
			const propertyName =
				"propertyName" in importedSymbol && importedSymbol.propertyName != null ? importedSymbol.propertyName : importedSymbol.name;
			const matchingExportedSymbol = [...otherModuleExportedSymbols].find(exportedSymbol =>
				"defaultImport" in importedSymbol && importedSymbol.defaultImport
					? "defaultExport" in exportedSymbol && exportedSymbol.defaultExport
					: !("namespaceExport" in exportedSymbol) && exportedSymbol.name === propertyName
			);

			if (matchingExportedSymbol != null) {
				const matchingExportedSymbolChunk = getChunkFilename({...options, fileName: matchingExportedSymbol.originalModule});

				// If the chunk in which the exported binding resides isn't part of the same chunk, import the binding into the current module
				if (
					matchingExportedSymbolChunk == null ||
					matchingExportedSymbol.isExternal ||
					absoluteChunkFileName !== matchingExportedSymbolChunk.fileName
				) {
					const otherRelativeToSourceFileDirectory =
						matchingExportedSymbol.isExternal && matchingExportedSymbol.rawModuleSpecifier != null
							? matchingExportedSymbol.rawModuleSpecifier
							: relative(dirname(importedSymbol.originalModule), matchingExportedSymbol.originalModule);
					const otherUpdatedModuleSpecifierText =
						matchingExportedSymbol.isExternal && matchingExportedSymbol.rawModuleSpecifier != null
							? matchingExportedSymbol.rawModuleSpecifier
							: ensureHasLeadingDotAndPosix(stripKnownExtension(otherRelativeToSourceFileDirectory), false);

					importDeclarations.push(
						createImportDeclaration(
							undefined,
							undefined,
							createImportClause(
								"defaultExport" in matchingExportedSymbol && matchingExportedSymbol.defaultExport ? createIdentifier(importedSymbol.name) : undefined,
								"namespaceExport" in matchingExportedSymbol
									? createNamespaceImport(createIdentifier(importedSymbol.name))
									: "defaultExport" in matchingExportedSymbol && matchingExportedSymbol.defaultExport
									? undefined
									: createNamedImports([
											createImportSpecifier(
												matchingExportedSymbol.propertyName != null ? createIdentifier(matchingExportedSymbol.propertyName) : undefined,
												createIdentifier(importedSymbol.name)
											)
									  ])
							),
							createStringLiteral(otherUpdatedModuleSpecifierText)
						)
					);
				} else if (
					"defaultImport" in importedSymbol &&
					importedSymbol.defaultImport &&
					"name" in matchingExportedSymbol &&
					matchingExportedSymbol.name !== importedSymbol.name
				) {
					return [...importDeclarations, createAliasedBinding(importedSymbol, matchingExportedSymbol.name)];
				}
			}
		}

		// Create a TypeAlias that aliases the imported property
		if ("propertyName" in importedSymbol && importedSymbol.propertyName != null) {
			let hasLocalConflict = false;

			if (currentModuleLocalSymbols != null) {
				for (const localSymbol of currentModuleLocalSymbols.values()) {
					if (localSymbol.deconflictedName != null && localSymbol.deconflictedName === importedSymbol.name) {
						hasLocalConflict = true;
						break;
					}
				}
			}

			if (!hasLocalConflict) {
				return [...importDeclarations, createAliasedBinding(importedSymbol, importedSymbol.propertyName)];
			}
		}

		// If a namespace is imported, create a type literal under the same name as the namespace binding
		if ("namespaceImport" in importedSymbol) {
			const namedExportsForModule = getAllNamedExportsForModule(importedSymbol.originalModule, sourceFileToExportedSymbolSet);
			return [
				...importDeclarations,
				createModuleDeclaration(
					undefined,
					ensureHasDeclareModifier([]),
					createIdentifier(importedSymbol.name),
					createModuleBlock(
						namedExportsForModule.map(namedExport => {
							return cloneNode(namedExport.node, {
								hook: {
									modifiers: removeExportAndDeclareModifiers
								}
							}) as Statement;
						})
					),
					NodeFlags.Namespace
				)
			];
		}

		// Otherwise, leave out the import as it will be part of the merged local declarations already,
		else {
			return importDeclarations;
		}
	}

	// If the whole namespace is imported, just add a namespace import and do no more
	if ("namespaceImport" in importedSymbol) {
		return [
			...importDeclarations,
			createImportDeclaration(
				undefined,
				undefined,
				createImportClause(undefined, createNamespaceImport(createIdentifier(importedSymbol.name))),
				createStringLiteral(moduleSpecifier)
			)
		];
	}

	// Otherwise, if it is a default import, add an ImportDeclaration that imports the default binding under whatever name is given
	else if ("defaultImport" in importedSymbol && importedSymbol.defaultImport) {
		return [
			...importDeclarations,
			createImportDeclaration(
				undefined,
				undefined,
				createImportClause(createIdentifier(importedSymbol.name), undefined),
				createStringLiteral(moduleSpecifier)
			)
		];
	}

	// Otherwise, it may be as easy as adding an import with NamedImports pointing to an ImportSpecifier pointing to
	// one of the named exports of the other module. However, that named export may have been renamed and given another binding name
	else {
		const {name, propertyName} = importedSymbol;
		if (otherModuleLocalSymbols != null) {
			const match = otherModuleLocalSymbols.get(propertyName ?? name);
			const actualPropertyName = propertyName ?? name;
			const deconflictedPropertyName = match == null ? actualPropertyName : match.deconflictedName ?? actualPropertyName;

			if (match != null) {
				return [
					...importDeclarations,
					createImportDeclaration(
						undefined,
						undefined,
						createImportClause(
							undefined,
							createNamedImports([
								createImportSpecifier(
									deconflictedPropertyName === name ? undefined : createIdentifier(deconflictedPropertyName),
									createIdentifier(name)
								)
							])
						),
						createStringLiteral(moduleSpecifier)
					)
				];
			}
		}

		// If no exported symbol could be found, assume that the import binding is OK as it is
		return [
			...importDeclarations,
			createImportDeclaration(
				undefined,
				undefined,
				createImportClause(
					undefined,
					createNamedImports([
						createImportSpecifier(propertyName == null || propertyName === name ? undefined : createIdentifier(propertyName), createIdentifier(name))
					])
				),
				createStringLiteral(moduleSpecifier)
			)
		];
	}
}
