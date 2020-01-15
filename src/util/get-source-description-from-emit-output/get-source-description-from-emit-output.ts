import {EmitOutput, OutputFile} from "typescript";
import {SourceDescription} from "rollup";
import {SOURCE_MAP_COMMENT, DECLARATION_EXTENSION, DECLARATION_MAP_EXTENSION, SOURCE_MAP_EXTENSION} from "../../constant/constant";
import {getExtension} from "../path/path-util";

/**
 * Returns true if the given OutputFile represents code
 */
function isCodeOutputFile({name}: OutputFile): boolean {
	const extension = getExtension(name);
	return ![SOURCE_MAP_EXTENSION, DECLARATION_EXTENSION, DECLARATION_MAP_EXTENSION].includes(extension);
}

/**
 * Returns true if the given OutputFile represents some source map
 */
function isMapOutputFile({name}: OutputFile): boolean {
	const extension = getExtension(name);
	return [SOURCE_MAP_EXTENSION, DECLARATION_MAP_EXTENSION].includes(extension);
}

/**
 * Gets a SourceDescription from the given EmitOutput
 * @param {EmitOutput} output
 * @returns {Partial<SourceDescription>}
 */
export function getSourceDescriptionFromEmitOutput(output: EmitOutput): SourceDescription | undefined {
	const code = output.outputFiles.find(isCodeOutputFile);
	if (code == null) return undefined;

	const map = output.outputFiles.find(isMapOutputFile);

	// Remove the SourceMap comment from the code if it is given. Rollup is the decider of whether or not to emit SourceMaps and if they should be inlined
	const inlinedSourcemapIndex = code.text.indexOf(SOURCE_MAP_COMMENT);

	if (inlinedSourcemapIndex >= 0) {
		code.text = code.text.slice(0, inlinedSourcemapIndex);
	}

	return {
		code: code.text,
		map: map?.text
	};
}
