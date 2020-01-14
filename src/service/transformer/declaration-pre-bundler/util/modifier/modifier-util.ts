import {createModifier, Modifier, ModifiersArray, Node, SyntaxKind} from "typescript";

export type Modifiers = ModifiersArray | Modifier[];

/**
 * Returns true if the given node has an Export keyword in front of it
 */
export function hasExportModifier(node: Node): boolean {
	return node.modifiers != null && node.modifiers.some(isExportModifier);
}

/**
 * Returns true if the given modifier has an Export keyword in front of it
 */
function isExportModifier(node: Modifier): boolean {
	return node.kind === SyntaxKind.ExportKeyword;
}

/**
 * Returns true if the given modifier has an Default keyword in front of it
 */
function isDefaultModifier(node: Modifier): boolean {
	return node.kind === SyntaxKind.DefaultKeyword;
}

/**
 * Returns true if the given modifier has an declare keyword in front of it
 */
function isDeclareModifier(node: Modifier): boolean {
	return node.kind === SyntaxKind.DeclareKeyword;
}

/**
 * Removes an export modifier from the given ModifiersArray
 */
export function removeExportModifier(modifiers: Modifiers | undefined): Modifier[] | undefined {
	if (modifiers == null) return modifiers;
	return modifiers.filter(modifier => !isExportModifier(modifier) && !isDefaultModifier(modifier));
}

/**
 * Removes an export and/or declare modifier from the given ModifiersArray
 */
export function removeExportAndDeclareModifiers(modifiers: Modifiers | undefined): Modifier[] | undefined {
	if (modifiers == null) return modifiers;
	return modifiers.filter(modifier => !isExportModifier(modifier) && !isDefaultModifier(modifier) && !isDeclareModifier(modifier));
}

/**
 * Removes an export modifier from the given ModifiersArray
 */
export function ensureHasDeclareModifier(modifiers: Modifiers | undefined): Modifier[] | ModifiersArray | undefined {
	if (modifiers == null) return [createModifier(SyntaxKind.DeclareKeyword)];
	if (modifiers.some(m => m.kind === SyntaxKind.DeclareKeyword)) return modifiers;
	return [createModifier(SyntaxKind.DeclareKeyword), ...modifiers];
}

/**
 * Returns true if the given modifiers contain the keywords 'export' and 'default'
 */
export function hasDefaultExportModifier(modifiers: ModifiersArray | undefined): boolean {
	if (modifiers == null) return false;
	return modifiers.some(isExportModifier) && modifiers.some(isDefaultModifier);
}
