import * as vscode from 'vscode';

// Taken directly from Editor.vue inside Zap's docs
const Keywords = ['event', 'opt', 'type'] as const;

const TypeKeywords = ['enum', 'struct', 'map'] as const;

const Operators = ['true', 'false'] as const;

const Locations = ['Server', 'Client'] as const;

const Brand = ['Reliable', 'Unreliable'] as const;

const Calls = ['SingleSync', 'SingleAsync', 'ManySync', 'ManyAsync'] as const;

const Options = [
	'typescript',
	'write_checks',
	'casing',
	'server_output',
	'client_output',
	'manual_event_loop',
	'yield_type',
	'async_lib',
] as const;

const Casing = ['PascalCase', 'camelCase', 'snake_case'].map((value) => `"${value}"`);
const YieldType = ['yield', 'future', 'promise'].map((value) => `"${value}"`);

const setting = [...Locations, ...Brand, ...Calls, ...Casing] as const;

const types = [
	'u8',
	'u16',
	'u32',
	'i8',
	'i16',
	'i32',
	'f32',
	'f64',
	'boolean',
	'string',
	'buffer',
	'unknown',
	'Instance',
	'Color3',
	'Vector3',
	'AlignedCFrame',
	'CFrame',
] as const;

const EventParamToArray = {
	from: Locations,
	type: Brand,
	call: Calls,
	data: [],
} as const;

const WordToArray = {
	...EventParamToArray,

	opt: Options,

	casing: Casing,
	yield_type: YieldType,

	typescript: Operators,
	write_checks: Operators,
	manual_event_loop: Operators,

	output_server: [],
	output_client: [],
	async_lib: [],
} as const;

// Monaco function ports
// This function will go through all words on this line, and return the closest word before the cursor position
function getWordUntilPosition(document: vscode.TextDocument, position: vscode.Position) {
	const text = document.lineAt(position.line).text;
	const word = document.getWordRangeAtPosition(position);

	if (!word) {
		return {
			text: '',
			startColumn: 0,
			endColumn: 0,
		};
	}

	const wordStart = word.start.character - 1 < 0 ? 0 : word.start.character - 1;
	const wordBefore = document.getWordRangeAtPosition(
		new vscode.Position(position.line, wordStart)
	);

	const wordString = wordBefore
		? text.slice(word.start.character, word.end.character)
		: word;

	return {
		text: wordString,
		startColumn: word.start.character,
		endColumn: word.end.character,
	};
}

// This function goes through all words, and returns the word that is currently inside the cursor position
function getWordAtPosition(document: vscode.TextDocument, position: vscode.Position) {
	const text = document.lineAt(position.line).text;
	const word = document.getWordRangeAtPosition(position);

	if (!word) {
		return {
			text: '',
			startColumn: 0,
			endColumn: 0,
		};
	}

	const wordString = word ? text.slice(word.start.character, word.end.character) : '';

	return {
		text: wordString,
		startColumn: word.start.character,
		endColumn: word.end.character,
	};
}

export function activate(context: vscode.ExtensionContext) {
	const provider = vscode.languages.registerCompletionItemProvider(
		'zap',
		{
			provideCompletionItems: (document, position, token, context) => {
				// Modified version of Editor.vue Monaco autocomplete
				const word = getWordUntilPosition(document, position);
				const range = new vscode.Range(
					position.line,
					word.startColumn,
					position.line,
					word.endColumn
				);

				if (range.start.character === 0) {
					const suggestions = [
						{
							label: 'type',
							kind: vscode.CompletionItemKind.Snippet,
							insertText: new vscode.SnippetString('type ${1} = ${2}\n'),
							documentation: 'Type Statement',
							range: range,
						},
						{
							label: 'opt',
							kind: vscode.CompletionItemKind.Snippet,
							insertText: new vscode.SnippetString('opt ${1} = ${2}\n'),
							documentation: 'Settings',
							range: range,
						},
						{
							label: 'event',
							kind: vscode.CompletionItemKind.Snippet,
							insertText: new vscode.SnippetString(
								[
									'event ${1} = {',
									'\tfrom: ${2},',
									'\ttype: ${3},',
									'\tcall: ${4},',
									'\tdata: ${5}',
									'}\n',
								].join('\n')
							),
							documentation: 'Event',
							range: range,
						},
						{
							label: 'funct',
							kind: vscode.CompletionItemKind.Snippet,
							insertText: new vscode.SnippetString(
								[
									'funct ${1} = {',
									'\tcall: ${2},',
									'\targs: ${3},',
									'\trets: ${4},',
									'}\\n',
								].join('\\n')
							),
							documentation: 'Event',
							range: range,
						},
					];
					return suggestions;
				} else {
					let i = -1;
					let wordBefore = getWordAtPosition(document, position);
					const keyIndex = wordBefore.text as keyof typeof WordToArray;

					while (!wordBefore && word.startColumn + i > 0) {
						wordBefore = getWordAtPosition(
							document,
							new vscode.Position(position.line, word.startColumn + i)
						);
						i--;
					}

					const arr = !wordBefore
						? Object.keys(EventParamToArray)
						: WordToArray[keyIndex] ?? types;

					const identifiers = arr.map((k) => {
						return new vscode.CompletionItem(
							k,
							vscode.CompletionItemKind.Variable
						);
					});

					if (wordBefore && !WordToArray[keyIndex]) {
						identifiers.push(
							new vscode.CompletionItem(
								'enum',
								vscode.CompletionItemKind.Variable
							),
							new vscode.CompletionItem(
								'map',
								vscode.CompletionItemKind.Snippet
							),
							new vscode.CompletionItem(
								'struct',
								vscode.CompletionItemKind.Snippet
							)
						);
					}

					return identifiers;
				}
			},
		},
		'.'
	);

	context.subscriptions.push(provider);
}
