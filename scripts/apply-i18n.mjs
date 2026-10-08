import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { parse } from "@babel/parser";

const require = createRequire(import.meta.url);

const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const bt = require("@babel/types");

const ROOT = process.cwd();

const SRC_DIR = path.join(
    ROOT,
    "src"
);

const SEARCH_DIRS = [
    path.join(SRC_DIR, "components"),
    path.join(SRC_DIR, "pages"),
];

const RU_FILE = path.join(
    SRC_DIR,
    "locales",
    "ru.json"
);

const I18N_FILE = path.join(
    SRC_DIR,
    "i18n",
    "index.js"
);

const EXTENSIONS = new Set([
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
]);

const TRANSLATE_IDENTIFIER = "i18nT";

// MARK: Helpers

function normalizeText(value) {
    return String(value ?? "")
        .replace(/\s+/g, " ")
        .trim();
}

function getFiles(dir) {
    if (!fs.existsSync(dir)) {
        return [];
    }

    const result = [];

    const entries = fs.readdirSync(dir, {
        withFileTypes: true,
    });

    for (const entry of entries) {
        const fullPath = path.join(
            dir,
            entry.name
        );

        if (entry.isDirectory()) {
            result.push(
                ...getFiles(fullPath)
            );

            continue;
        }

        if (
            entry.isFile() &&
            EXTENSIONS.has(
                path.extname(entry.name)
            )
        ) {
            result.push(fullPath);
        }
    }

    return result;
}

function getImportPath(filePath) {
    let relative = path.relative(
        path.dirname(filePath),
        I18N_FILE
    );

    relative = relative
        .replace(/\\/g, "/");

    if (!relative.startsWith(".")) {
        relative = `./${relative}`;
    }

    return relative;
}

function createTranslationCall(key) {
    return bt.callExpression(
        bt.identifier(
            TRANSLATE_IDENTIFIER
        ),
        [
            bt.stringLiteral(key),
        ]
    );
}

function preserveInlineWhitespace(
    expression,
    rawValue
) {
    // Если JSX написан:
    //
    // <span>до <b>...</b></span>
    //
    // нужно сохранить пробел после "до".

    if (
        rawValue.includes("\n") ||
        rawValue.includes("\r")
    ) {
        return expression;
    }

    const hasLeadingSpace =
        /^\s/.test(rawValue);

    const hasTrailingSpace =
        /\s$/.test(rawValue);

    let result = expression;

    if (hasLeadingSpace) {
        result = bt.binaryExpression(
            "+",
            bt.stringLiteral(" "),
            result
        );
    }

    if (hasTrailingSpace) {
        result = bt.binaryExpression(
            "+",
            result,
            bt.stringLiteral(" ")
        );
    }

    return result;
}

function isObjectKey(pathRef) {
    const parent = pathRef.parent;

    if (
        bt.isObjectProperty(parent) &&
        pathRef.key === "key" &&
        !parent.computed
    ) {
        return true;
    }

    if (
        bt.isObjectMethod(parent) &&
        pathRef.key === "key" &&
        !parent.computed
    ) {
        return true;
    }

    return false;
}

function shouldSkipString(pathRef) {
    const parent = pathRef.parent;

    if (
        bt.isImportDeclaration(parent) ||
        bt.isExportNamedDeclaration(parent) ||
        bt.isExportAllDeclaration(parent)
    ) {
        return true;
    }

    if (
        bt.isJSXAttribute(parent)
    ) {
        return true;
    }

    if (
        isObjectKey(pathRef)
    ) {
        return true;
    }

    if (
        bt.isDirectiveLiteral(
            pathRef.node
        )
    ) {
        return true;
    }

    return false;
}

function hasI18nImport(program) {
    return program.body.some((node) => {
        if (
            !bt.isImportDeclaration(node)
        ) {
            return false;
        }

        return node.specifiers.some(
            (specifier) => {
                return (
                    bt.isImportSpecifier(
                        specifier
                    ) &&
                    specifier.local.name ===
                    TRANSLATE_IDENTIFIER
                );
            }
        );
    });
}

function addI18nImport(
    program,
    filePath
) {
    if (hasI18nImport(program)) {
        return;
    }

    const source =
        getImportPath(filePath);

    const importNode =
        bt.importDeclaration(
            [
                bt.importSpecifier(
                    bt.identifier(
                        TRANSLATE_IDENTIFIER
                    ),
                    bt.identifier("t")
                ),
            ],
            bt.stringLiteral(source)
        );

    let lastImportIndex = -1;

    for (
        let i = 0;
        i < program.body.length;
        i++
    ) {
        if (
            bt.isImportDeclaration(
                program.body[i]
            )
        ) {
            lastImportIndex = i;
        }
    }

    program.body.splice(
        lastImportIndex + 1,
        0,
        importNode
    );
}

// MARK: Load translations

if (!fs.existsSync(RU_FILE)) {
    console.error(
        `❌ Не найден ${RU_FILE}`
    );

    process.exit(1);
}

const ru = JSON.parse(
    fs.readFileSync(
        RU_FILE,
        "utf8"
    )
);

// Делаем обратную карту:
//
// "Главная" -> "sidebar.home"

const textToKey = new Map();

for (
    const [key, value]
    of Object.entries(ru)
) {
    const normalized =
        normalizeText(value);

    if (!normalized) {
        continue;
    }

    if (textToKey.has(normalized)) {
        console.warn(
            `⚠️ Одинаковый русский текст у нескольких ключей: "${normalized}"`
        );
    }

    textToKey.set(
        normalized,
        key
    );
}

// MARK: Transform

const matchedKeys = new Set();

let changedFiles = 0;
let totalReplacements = 0;

function getTranslationKey(value) {
    const normalized =
        normalizeText(value);

    return (
        textToKey.get(normalized) ??
        null
    );
}

function parseFile(filePath) {
    const source = fs.readFileSync(
        filePath,
        "utf8"
    );

    let ast;

    try {
        ast = parse(source, {
            sourceType: "module",

            plugins: [
                "jsx",
                "typescript",
                "classProperties",
                "objectRestSpread",
                "optionalChaining",
                "nullishCoalescingOperator",
                "topLevelAwait",
                "decorators-legacy",
            ],
        });
    } catch (error) {
        console.error(
            `\n❌ Ошибка парсинга: ${filePath}`
        );

        console.error(
            error.message
        );

        return;
    }

    let changed = false;
    let replacements = 0;

    traverse(ast, {
        // MARK: JSX text

        // <div>Сотрудники</div>
        //
        // превращается в:
        //
        // <div>{i18nT("employees.title")}</div>

        JSXText(pathRef) {
            const rawValue =
                pathRef.node.value;

            const key =
                getTranslationKey(
                    rawValue
                );

            if (!key) {
                return;
            }

            let expression =
                createTranslationCall(
                    key
                );

            expression =
                preserveInlineWhitespace(
                    expression,
                    rawValue
                );

            pathRef.replaceWith(
                bt.jsxExpressionContainer(
                    expression
                )
            );

            matchedKeys.add(key);

            changed = true;
            replacements++;
        },

        // MARK: JSX attributes

        // placeholder="Поиск..."
        //
        // ->
        //
        // placeholder={
        //   i18nT("navbar.search")
        // }

        JSXAttribute(pathRef) {
            const value =
                pathRef.node.value;

            if (!value) {
                return;
            }

            if (
                bt.isStringLiteral(value)
            ) {
                const key =
                    getTranslationKey(
                        value.value
                    );

                if (!key) {
                    return;
                }

                pathRef.node.value =
                    bt.jsxExpressionContainer(
                        createTranslationCall(
                            key
                        )
                    );

                matchedKeys.add(key);

                changed = true;
                replacements++;

                return;
            }

            if (
                bt.isJSXExpressionContainer(
                    value
                ) &&
                bt.isStringLiteral(
                    value.expression
                )
            ) {
                const key =
                    getTranslationKey(
                        value.expression.value
                    );

                if (!key) {
                    return;
                }

                value.expression =
                    createTranslationCall(
                        key
                    );

                matchedKeys.add(key);

                changed = true;
                replacements++;
            }
        },

        // MARK: Plain strings

        // {
        //   label: "Сотрудники"
        // }
        //
        // ->
        //
        // {
        //   label:
        //     i18nT("...")
        // }

        StringLiteral(pathRef) {
            if (
                shouldSkipString(
                    pathRef
                )
            ) {
                return;
            }

            const key =
                getTranslationKey(
                    pathRef.node.value
                );

            if (!key) {
                return;
            }

            const replacement =
                preserveInlineWhitespace(
                    createTranslationCall(
                        key
                    ),
                    pathRef.node.value
                );

            pathRef.replaceWith(
                replacement
            );

            matchedKeys.add(key);

            changed = true;
            replacements++;
        },

        // MARK: Template literals

        // `Сотрудники`
        //
        // ->
        //
        // i18nT("...")

        TemplateLiteral(pathRef) {
            if (
                pathRef.node.expressions
                    .length !== 0
            ) {
                return;
            }

            if (
                pathRef.node.quasis
                    .length !== 1
            ) {
                return;
            }

            const value =
                pathRef.node.quasis[0]
                    .value.cooked ??
                pathRef.node.quasis[0]
                    .value.raw;

            const key =
                getTranslationKey(value);

            if (!key) {
                return;
            }

            pathRef.replaceWith(
                createTranslationCall(
                    key
                )
            );

            matchedKeys.add(key);

            changed = true;
            replacements++;
        },
    });

    if (!changed) {
        return;
    }

    addI18nImport(
        ast.program,
        filePath
    );

    const output = generate(
        ast,
        {
            retainLines: false,
            comments: true,
            jsescOption: {
                minimal: true,
            },
        },
        source
    ).code;

    fs.writeFileSync(
        filePath,
        `${output}\n`,
        "utf8"
    );

    changedFiles++;
    totalReplacements +=
        replacements;

    console.log(
        `✅ ${path.relative(
            ROOT,
            filePath
        )} — ${replacements}`
    );
}

// MARK: Main

const files =
    SEARCH_DIRS.flatMap(
        getFiles
    );

console.log("");
console.log(
    `🔍 Файлов найдено: ${files.length}`
);

console.log(
    `🌐 Ключей в ru.json: ${Object.keys(ru).length}`
);

console.log("");

for (const file of files) {
    parseFile(file);
}

console.log("");
console.log(
    `✅ Изменено файлов: ${changedFiles}`
);

console.log(
    `✅ Выполнено замен: ${totalReplacements}`
);

console.log(
    `✅ Использовано ключей: ${matchedKeys.size}/${Object.keys(ru).length}`
);

const missingKeys =
    Object.keys(ru).filter(
        (key) =>
            !matchedKeys.has(key)
    );

if (missingKeys.length) {
    console.log("");
    console.log(
        `⚠️ Не найдено в исходниках: ${missingKeys.length}`
    );

    for (
        const key
        of missingKeys
    ) {
        console.log(
            `   - ${key}: ${ru[key]}`
        );
    }
}

console.log("");
console.log(
    "🎉 i18n migration завершена"
);