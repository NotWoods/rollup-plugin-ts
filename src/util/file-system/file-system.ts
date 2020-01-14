import {sys, System} from "typescript";

export type FileSystem = Pick<
	System,
	"newLine" | "useCaseSensitiveFileNames" | "fileExists" | "readFile" | "readDirectory" | "realpath" | "getDirectories" | "directoryExists"
>;

export const REAL_FILE_SYSTEM: FileSystem = sys;
