import {JS_EXTENSION, JSON_EXTENSION, JSX_EXTENSION, MJS_EXTENSION, MJSX_EXTENSION, TS_EXTENSION, TSX_EXTENSION} from "../../constant/constant";

export type SupportedExtensions = Set<string>;

/**
 * Gets the extensions that are supported by Typescript, depending on whether or not to allow JS and JSON
 * @param {boolean} allowJs
 * @param {boolean} allowJson
 * @returns {SupportedExtensions}
 */
export function getSupportedExtensions(allowJs: boolean | undefined, allowJson: boolean | undefined): SupportedExtensions {
	const extensions = [TS_EXTENSION, TSX_EXTENSION];
	if (allowJs) extensions.push(JS_EXTENSION, JSX_EXTENSION, MJS_EXTENSION, MJSX_EXTENSION);
	if (allowJson) extensions.push(JSON_EXTENSION);
	return new Set(extensions);
}
