import * as vscode from 'vscode';

const Operators = ['false', 'true'] as const;
const Locations = ['Client', 'Server'] as const;
const Brand = ['Reliable', 'Unreliable'] as const;
const YieldTypes = ['Coroutine', 'Future', 'Promise'] as const;
const Calls = ['ManyAsync', 'SingleAsync', 'ManySync', 'SingleSync'] as const;
const Casing = ['Pascal', 'Camel', 'Snake'].map((value) => `"${value}"`);

const Options = [
    'Typescript',
    'WriteValidations',
    'Casing',
    'ServerOutput',
    'ClientOutput',
    'TypesOutput',
    'ManualReplication',
    'UsePolling',
    'FutureLibrary',
    'PromiseLibrary',
] as const;
const OptionsJoined = Options.join();

const types = [
    'u8',
    'u16',
    'u32',
    'i8',
    'i16',
    'i32',
    'f16',
    'f32',
    'f64',
    'boolean',
    'string',
    'buffer',
    'unknown',
    'Instance',
    'Color3',
    'vector',
    'CFrame',
] as const;

const WordToArray = {
    option: Options,

    Casing: Casing,

    Typescript: Operators,
    WriteValidations: Operators,
    ManualReplication: Operators,
    UsePolling: Operators,

    ServerOutput: [],
    ClientOutput: [],
    FutureLibrary: [],
    PromiseLibrary: [],
} as const;

const autocompleteKeys = {
    event: {
        From: Locations,
        Type: Brand,
        Call: Calls,
        Poll: Operators,
        Data: [],
    },
    function: {
        Yield: YieldTypes,
        Data: [],
        Return: [],
    },
};

const eventSnippet = [
    'event ${1:EventName} {',
    `\tFrom: \${2|${Locations.join()}|}`,
    `\tType: \${3|${Brand.join()}|}`,
    `\tCall: \${4|${Calls.join()}|}`,
    `\tPoll: \${5|${Operators.join()}|}`,
    '\tData: $0\n}',
].join('\n');
const functionSnippet = [
    'function ${1:FuncName} {',
    `\tYield: \${2|${YieldTypes.join()}|}`,
    `\tReturn: $3`,
    '\tData: $0\n}',
].join('\n');

// Monaco function ports
// This function will go through all words on this line, and return the closest word before the cursor position
function getWordUntilPosition(
    document: vscode.TextDocument,
    position: vscode.Position
) {
    const word = document.getWordRangeAtPosition(position);

    let wordStart = word
        ? word.start.character - 1 < 0
            ? 0
            : word.start.character - 1
        : position.character - 1 < 0
          ? 0
          : position.character - 1;
    let wordBefore = document.getWordRangeAtPosition(
        new vscode.Position(position.line, wordStart),
        /[\w.-]+(?=\s+.*?[\w.-]?)/i
    );
    while (wordStart > 0 && wordBefore === undefined) {
        wordStart -= 1;
        wordBefore = document.getWordRangeAtPosition(
            new vscode.Position(position.line, wordStart),
            /[\w.-]+(?=\s+.*?[\w.-]?)/i
        );
    }

    const text = document.lineAt(position.line).text;
    if (wordBefore !== undefined) {
        return {
            text: text.slice(
                wordBefore.start.character,
                wordBefore.end.character
            ),
            startColumn: wordBefore.start.character,
            endColumn: wordBefore.end.character,
        };
    } else {
        return {
            text: word
                ? text.slice(word.start.character, word.end.character)
                : '',
            startColumn: word ? word.start.character : 0,
            endColumn: word ? word.end.character : 0,
        };
    }
}

const tableTypeRegex =
    /(event|function)\s*\w+\s*[{,;]\s*[A-Za-z]*\s*:?[^,}]*$/i;
const isValueRegex = /([{,;])\s*([A-Za-z]+\s*):[^{,]*$/i;
const isKeyRegex = /([{,;])\s*([A-Za-z]*\s*)$/i;

function getTableType(
    slicedText: string[],
    regex: RegExp,
    startPosition: number
) {
    let variableType: string | null = null;
    let currentPosition = startPosition;

    while (currentPosition > 0) {
        const text = slicedText
            .join('\n')
            .slice(0, currentPosition + 1)
            .replace(/,$/, '');
        const match = text.match(regex);

        if (match) {
            if ((match[1] == ',' || match[1] == ';') && match.index) {
                currentPosition = match.index;
                continue;
            }

            // encountered closing bracket
            const varTypeMatch = text.match(tableTypeRegex);

            if (varTypeMatch) {
                variableType = varTypeMatch[1];
            }
        }

        break;
    }

    return variableType;
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            'blink',
            {
                provideCompletionItems: (document, position) => {
                    // Modified version of Editor.vue Monaco autocomplete
                    //const word = getWordAtPosition(document, position);
                    const range = new vscode.Range(
                        position.line,
                        0,
                        position.line,
                        0
                    );
                    const lineEmpty = document.lineAt(
                        position.line
                    ).isEmptyOrWhitespace;

                    if (lineEmpty) {
                        const suggestions = [
                            {
                                label: 'type',
                                kind: vscode.CompletionItemKind.Snippet,
                                insertText: new vscode.SnippetString(
                                    'type ${1:TypeName} = $0'
                                ),
                                documentation: 'Type Statement',
                                range: range,
                            },
                            {
                                label: 'option',
                                kind: vscode.CompletionItemKind.Snippet,
                                insertText: new vscode.SnippetString(
                                    `option \${1|${OptionsJoined}|} = $0`
                                ),
                                documentation: 'Settings',
                                range: range,
                            },
                            {
                                label: 'event',
                                kind: vscode.CompletionItemKind.Snippet,
                                insertText: new vscode.SnippetString(
                                    eventSnippet
                                ),
                                documentation: 'Event',
                                range: range,
                            },
                            {
                                label: 'function',
                                kind: vscode.CompletionItemKind.Snippet,
                                insertText: new vscode.SnippetString(
                                    functionSnippet
                                ),
                                documentation: 'Function',
                                range: range,
                            },
                            {
                                label: 'enum',
                                kind: vscode.CompletionItemKind.Snippet,
                                insertText: new vscode.SnippetString(
                                    'enum ${1:EnumName} = {$0}'
                                ),
                                documentation: 'Enum Statement',
                                range: range,
                            },
                            {
                                label: 'tagged enum',
                                kind: vscode.CompletionItemKind.Snippet,
                                insertText: new vscode.SnippetString(
                                    'enum ${1:EnumName} = "${2:TagName}" {\n\t$0\n}'
                                ),
                                documentation: 'Tagged Enum Statement',
                                range: range,
                            },
                            {
                                label: 'map',
                                kind: vscode.CompletionItemKind.Snippet,
                                insertText: new vscode.SnippetString(
                                    'map ${1:MapName} = {[${2:string}]: ${3:u8}}'
                                ),
                                documentation: 'Map Statement',
                                range: range,
                            },
                            {
                                label: 'set',
                                kind: vscode.CompletionItemKind.Snippet,
                                insertText: new vscode.SnippetString(
                                    'set ${1:SetName} = {$0}'
                                ),
                                documentation: 'Set Statement',
                                range: range,
                            },
                            {
                                label: 'struct',
                                kind: vscode.CompletionItemKind.Snippet,
                                insertText: new vscode.SnippetString(
                                    'struct ${1} {\n\t$0\n}'
                                ),
                                documentation: 'Struct Statement',
                                range: range,
                            },
                            {
                                label: 'import',
                                kind: vscode.CompletionItemKind.Snippet,
                                insertText: new vscode.SnippetString(
                                    'import "${1:./$TM_FILENAME}"${2:as Something}'
                                ),
                                documentation: 'Import Statement',
                                range: range,
                            },
                            {
                                label: 'scope',
                                kind: vscode.CompletionItemKind.Snippet,
                                insertText: new vscode.SnippetString(
                                    'scope ${1} {\n\t$0\n}'
                                ),
                                documentation: 'Scope Statement',
                                range: range,
                            },
                        ];
                        return suggestions;
                    } else {
                        const wordBefore = getWordUntilPosition(
                            document,
                            position
                        );
                        const keyIndex =
                            wordBefore.text as keyof typeof WordToArray;

                        const arr = WordToArray[keyIndex] ?? types;

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
                                ),
                                new vscode.CompletionItem(
                                    'set',
                                    vscode.CompletionItemKind.Variable
                                )
                            );
                        }

                        return identifiers;
                    }
                },
            },
            '.'
        ),
        vscode.languages.registerCompletionItemProvider(
            'blink',
            {
                provideCompletionItems: (document, position) => {
                    const slicedText = document
                        .getText()
                        .split('\n')
                        .slice(0, position.line + 1);

                    slicedText[position.line] = slicedText[position.line].slice(
                        0,
                        position.character
                    );

                    let totalTextSize = 0;
                    slicedText.forEach((line) => {
                        totalTextSize += line.length;
                    });

                    // Compensate for newlines when we join/slice later.
                    totalTextSize += slicedText.length - 1;
                    let currentPosition =
                        totalTextSize -
                        (slicedText[position.line].length -
                            position.character) -
                        1;

                    if (
                        slicedText[position.line].substring(
                            position.character - 1,
                            position.character
                        ) == ',' // prevent cases like "from: Client," triggering autocomplete
                    ) {
                        currentPosition = 0;
                    }

                    const key =
                        slicedText.join('\n').match(isValueRegex)?.[2] ?? null;
                    let variableType = getTableType(
                        slicedText,
                        isValueRegex,
                        currentPosition
                    );

                    if (!key || !variableType) {
                        const isWritingTableKey = slicedText
                            .join('\n')
                            .match(isKeyRegex);

                        if (isWritingTableKey) {
                            if (isWritingTableKey[1] == '{') {
                                variableType =
                                    slicedText
                                        .join('\n')
                                        .slice(0, currentPosition + 1)
                                        .match(tableTypeRegex)?.[1] ?? null;
                            } else {
                                variableType = getTableType(
                                    slicedText,
                                    isValueRegex,
                                    isWritingTableKey.index ?? 0
                                );
                            }
                        }

                        if (!variableType) return [];

                        const fieldCompletions: vscode.CompletionItem[] =
                            Object.keys(
                                autocompleteKeys[
                                    variableType as keyof typeof autocompleteKeys
                                ]
                            ).map((k) => {
                                return {
                                    label: k,
                                    kind: vscode.CompletionItemKind.Snippet,
                                    insertText: new vscode.SnippetString(
                                        `${k}: $1`
                                    ),
                                    command: {
                                        command: 'editor.action.triggerSuggest',
                                        title: 'refresh completion',
                                    },
                                };
                            });

                        return fieldCompletions;
                    }

                    const availableOptions =
                        autocompleteKeys[
                            variableType as keyof typeof autocompleteKeys
                        ][
                            key as keyof typeof autocompleteKeys.function &
                                keyof typeof autocompleteKeys.event
                        ];

                    if (!availableOptions) {
                        return [];
                    }

                    const typeCompletions = availableOptions.map((k) => {
                        return new vscode.CompletionItem(
                            k,
                            vscode.CompletionItemKind.Variable
                        );
                    });

                    return typeCompletions;
                },
            },
            ':',
            ',',
            ' ',
            ';'
        )
    );
}
