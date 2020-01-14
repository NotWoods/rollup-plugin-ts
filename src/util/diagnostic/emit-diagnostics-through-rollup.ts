import {
	DiagnosticCategory,
	flattenDiagnosticMessageText,
	formatDiagnosticsWithColorAndContext,
	getPreEmitDiagnostics,
	Diagnostic,
	LanguageService
} from "typescript";
import {PluginContext, RollupLogProps} from "rollup";
import {IncrementalLanguageService} from "../../service/language-service/incremental-language-service";

interface IGetDiagnosticsOptions {
	languageService: LanguageService;
	languageServiceHost: IncrementalLanguageService;
	context: PluginContext;
}

/**
 * Gets diagnostics for the given fileName
 * @param {IGetDiagnosticsOptions} options
 */
export function emitDiagnosticsThroughRollup({languageService, languageServiceHost, context}: IGetDiagnosticsOptions): void {
	const program = languageService.getProgram();
	if (program == null) return;

	const diagnostics = getPreEmitDiagnostics(program);

	// Don't proceed if the hook returned null or undefined
	if (diagnostics == null) return;

	diagnostics.forEach((diagnostic: Diagnostic) => {
		const message = flattenDiagnosticMessageText(diagnostic.messageText, "\n");

		// Color-format the diagnostics
		const colorFormatted = formatDiagnosticsWithColorAndContext([diagnostic], languageServiceHost);

		// Isolate the frame
		const newLine = languageServiceHost.getNewLine();
		let frame = colorFormatted.slice(colorFormatted.indexOf(message) + message.length);

		// Remove the trailing newline from the frame if it has one
		if (frame.startsWith(newLine)) {
			frame = frame.slice(frame.indexOf(newLine) + newLine.length);
		}

		const warning: RollupLogProps = {
			frame,
			pluginCode: `TS${diagnostic.code}`,
			message
		};
		if (diagnostic.file != null) {
			warning.pos = diagnostic.file.pos;

			const position = diagnostic.start == null ? undefined : diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
			if (position != null) {
				warning.loc = {
					file: diagnostic.file.fileName,
					line: position.line + 1,
					column: position.character + 1
				};
			}
		}

		if (diagnostic.category === DiagnosticCategory.Error) {
			context.error(warning);
		} else {
			context.warn(warning);
		}
	});
}
