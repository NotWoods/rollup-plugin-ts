import {NewLineKind} from "typescript";
import {FileSystem} from "../file-system/file-system";

/**
 * Gets the NewLineCharacter to use for a NewLineKind
 * @param {NewLineKind} newLine
 * @returns {string}
 */
export function getNewLineCharacter(newLine: NewLineKind | undefined, sys: FileSystem): string {
	switch (newLine) {
		case NewLineKind.CarriageReturnLineFeed:
			return "\r\n";
		case NewLineKind.LineFeed:
			return "\n";
		default:
			return sys.newLine;
	}
}
