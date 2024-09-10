import * as vscode from 'vscode';

const Operators = ['true', 'false'] as const;

const Locations = ['Server', 'Client'] as const;

const Brand = ['Reliable', 'Unreliable'] as const;

const Calls = ['SingleSync', 'SingleAsync', 'ManySync', 'ManyAsync'] as const;

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

const Casing = ['Pascal', 'Camel', 'Snake'].map(
    (value) => `"${value}"`
);

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
    'vector',
    'CFrame',
] as const;

const EventParamToArray = {
    From: Locations,
    Type: Brand,
    Call: Calls,
    Data: [],
} as const;

const WordToArray = {
    ...EventParamToArray,

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
        From: ['Server', 'Client'],
        Type: ['Reliable', 'Unreliable'],
        Call: ['SingleSync', 'SingleAsync', 'ManySync', 'ManyAsync'],
        Data: [],
    },
    function: {
        Yield: ['Coroutine', 'Future', 'Promise'],
        Data: [],
        Return: [],
    },
};

// Monaco function ports
// This function will go through all words on this line, and return the closest word before the cursor position
function getWordUntilPosition(
    document: vscode.TextDocument,
    position: vscode.Position
) {
    const text = document.lineAt(position.line).text;
    const word = document.getWordRangeAtPosition(position);

    if (!word) {
        return {
            text: '',
            startColumn: 0,
            endColumn: 0,
        };
    }

    const wordStart =
        word.start.character - 1 < 0 ? 0 : word.start.character - 1;
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
function getWordAtPosition(
    document: vscode.TextDocument,
    position: vscode.Position
) {
    const text = document.lineAt(position.line).text;
    const word = document.getWordRangeAtPosition(position);

    if (!word) {
        return {
            text: '',
            startColumn: 0,
            endColumn: 0,
        };
    }

    const wordString = word
        ? text.slice(word.start.character, word.end.character)
        : '';

    return {
        text: wordString,
        startColumn: word.start.character,
        endColumn: word.end.character,
    };
}

const tableTypeRegex =
    /(event|function)\s*\w+\s*=\s*[{,;]\s*[A-Za-z]+\s*:?[^,}]*$/i;
const isValueRegex = /([{,;])\s*([A-Za-z]+\s*):[^{,]*$/i;
const isKeyRegex = /([{,;])\s*([A-Za-z]+\s*)$/i;

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
            'zap',
            {
                provideCompletionItems: (document, position) => {
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
                                insertText: new vscode.SnippetString(
                                    'type ${1} = ${2}\n'
                                ),
                                documentation: 'Type Statement',
                                range: range,
                            },
                            {
                                label: 'option',
                                kind: vscode.CompletionItemKind.Snippet,
                                insertText: new vscode.SnippetString(
                                    'option ${1} = ${2}\n'
                                ),
                                documentation: 'Settings',
                                range: range,
                            },
                            {
                                label: 'event',
                                kind: vscode.CompletionItemKind.Snippet,
                                insertText: new vscode.SnippetString(
                                    'event ${1}'
                                ),
                                documentation: 'Event',
                                range: range,
                            },
                            {
                                label: 'function',
                                kind: vscode.CompletionItemKind.Snippet,
                                insertText: new vscode.SnippetString(
                                    'function ${1}'
                                ),
                                documentation: 'Event',
                                range: range,
                            },
                        ];
                        return suggestions;
                    } else {
                        let i = -1;
                        let wordBefore = getWordAtPosition(document, position);
                        const keyIndex =
                            wordBefore.text as keyof typeof WordToArray;

                        while (!wordBefore && word.startColumn + i > 0) {
                            wordBefore = getWordAtPosition(
                                document,
                                new vscode.Position(
                                    position.line,
                                    word.startColumn + i
                                )
                            );
                            i--;
                        }

                        const arr = !wordBefore
                            ? Object.keys(EventParamToArray)
                            : (WordToArray[keyIndex] ?? types);

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
                                ),
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

                    let totalTextSize = 0;
                    slicedText.forEach((line) => {
                        totalTextSize += line.length;
                    });

                    let currentPosition =
                        totalTextSize -
                        (slicedText[position.line].length -
                            position.character) +
                        2;

                    slicedText[position.line] = slicedText[position.line].slice(
                        0,
                        position.character
                    );

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
                                        .slice(0, currentPosition)
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
