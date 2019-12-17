import {visitNode} from "./visitor/visit-node";
import {TS} from "../../../../../type/ts";
import {ChildVisitResult, IncludeSourceFileOptions, ModuleMergerVisitorOptions, PayloadMap, VisitResult} from "./module-merger-visitor-options";
import {DeclarationTransformer} from "../../declaration-bundler-options";
import {applyTransformers} from "../../util/apply-transformers";
import {getNodePlacementQueue} from "../../util/get-node-placement-queue";
import {findMatchingImportedSymbol} from "../../util/find-matching-imported-symbol";
import {cloneNodeWithSymbols} from "../../util/clone-node-with-symbols";
import {ImportedSymbol} from "../track-imports-transformer/track-imports-transformer-visitor-options";

export function moduleMerger(...transformers: DeclarationTransformer[]): DeclarationTransformer {
	return options => {
		const nodePlacementQueue = getNodePlacementQueue({typescript: options.typescript});

		// Prepare some VisitorOptions
		const visitorOptions: Omit<ModuleMergerVisitorOptions<TS.Node>, "node"> = {
			...options,
			...nodePlacementQueue,
			transformers,
			payload: undefined,

			childContinuation: <U extends TS.Node>(node: U, payload: PayloadMap[U["kind"]]): ChildVisitResult<U> => {
				return options.typescript.visitEachChild(
					node,
					nextNode =>
						nodePlacementQueue.wrapVisitResult(
							visitNode({
								...visitorOptions,
								payload,
								node: nextNode
							})
						),
					options.context
				);
			},

			continuation: <U extends TS.Node>(node: U, payload: PayloadMap[U["kind"]]): VisitResult<U> => {
				return nodePlacementQueue.wrapVisitResult(
					visitNode({
						...visitorOptions,
						payload,
						node
					} as ModuleMergerVisitorOptions<U>)
				) as VisitResult<U>;
			},

			shouldPreserveImportedSymbol(importedSymbol: ImportedSymbol): boolean {
				let importedSymbols = options.preservedImports.get(importedSymbol.moduleSpecifier);
				if (importedSymbols == null) {
					importedSymbols = new Set();
					options.preservedImports.set(importedSymbol.moduleSpecifier, importedSymbols);
				}

				// Preserve the import of there is no matching imported symbol already
				if (findMatchingImportedSymbol(importedSymbol, importedSymbols) != null) {
					return false;
				}

				// Otherwise, the import should be preserved!
				importedSymbols.add(importedSymbol);
				return true;
			},

			getMatchingSourceFile(moduleSpecifier: string, from: TS.SourceFile): TS.SourceFile | undefined {
				const sourceFileWithChunk = options.moduleSpecifierToSourceFileMap.get(moduleSpecifier);
				return sourceFileWithChunk == null || sourceFileWithChunk.sourceFile === from || !sourceFileWithChunk.isSameChunk
					? undefined
					: sourceFileWithChunk.sourceFile;
			},

			includeSourceFile(
				sourceFile: TS.SourceFile,
				{allowDuplicate = false, transformers: extraTransformers = [], ...otherOptions}: Partial<IncludeSourceFileOptions> = {}
			): Iterable<TS.Statement> {
				// Never include the same SourceFile twice
				if (options.includedSourceFiles.has(sourceFile) && !allowDuplicate) return [];
				options.includedSourceFiles.add(sourceFile);

				const transformedSourceFile = applyTransformers({
					visitorOptions: {
						...visitorOptions,
						...otherOptions,
						sourceFile
					},
					transformers: [moduleMerger(...transformers, ...extraTransformers), ...transformers, ...extraTransformers]
				});

				// Keep track of the original symbols which will be lost when the nodes are cloned
				return transformedSourceFile.statements.map(node => cloneNodeWithSymbols({...options, node}));
			}
		};

		const result = visitorOptions.childContinuation(options.sourceFile, undefined);

		// There may be prepended or appended nodes that hasn't been added yet. Do so!
		const [missingPrependNodes, missingAppendNodes] = nodePlacementQueue.flush();
		if (missingPrependNodes.length > 0 || missingAppendNodes.length > 0) {
			return options.typescript.updateSourceFileNode(
				result,
				[...(missingPrependNodes as TS.Statement[]), ...result.statements, ...(missingAppendNodes as TS.Statement[])],
				result.isDeclarationFile,
				result.referencedFiles,
				result.typeReferenceDirectives,
				result.hasNoDefaultLib,
				result.libReferenceDirectives
			);
		}

		// Otherwise, return the result as it is
		return result;
	};
}