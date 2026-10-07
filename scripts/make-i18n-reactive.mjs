import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { parse } from "@babel/parser";

const require = createRequire(import.meta.url);

const traverse =
    require("@babel/traverse").default;

const generate =
    require("@babel/generator").default;

const bt =
    require("@babel/types");

const ROOT = process.cwd();

const SRC_DIR =
    path.join(ROOT, "src");

const SEARCH_DIRS = [
    path.join(
        SRC_DIR,
        "components"
    ),
    path.join(
        SRC_DIR,
        "pages"
    ),
];

const EXTENSIONS = new Set([
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
]);

// MARK: Files

function getFiles(dir) {
    if (!fs.existsSync(dir)) {
        return [];
    }

    const result = [];

    const entries =
        fs.readdirSync(
            dir,
            {
                withFileTypes: true,
            }
        );

    for (const entry of entries) {
        const fullPath =
            path.join(
                dir,
                entry.name
            );

        if (entry.isDirectory()) {
            result.push(
                ...getFiles(
                    fullPath
                )
            );

            continue;
        }

        if (
            entry.isFile() &&
            EXTENSIONS.has(
                path.extname(
                    entry.name
                )
            )
        ) {
            result.push(
                fullPath
            );
        }
    }

    return result;
}

// MARK: AST helpers

function isI18nImportSource(
    source
) {
    if (
        typeof source !==
        "string"
    ) {
        return false;
    }

    return (
        source ===
        "../i18n/index.js" ||
        source.endsWith(
            "/i18n/index.js"
        )
    );
}

function getI18nImport(
    programPath
) {
    const body =
        programPath.get(
            "body"
        );

    for (
        const statement
        of body
    ) {
        if (
            !statement.isImportDeclaration()
        ) {
            continue;
        }

        const source =
            statement.node.source
                .value;

        if (
            !isI18nImportSource(
                source
            )
        ) {
            continue;
        }

        const translateSpecifier =
            statement.node
                .specifiers
                .find(
                    (
                        specifier
                    ) => {
                        return (
                            bt.isImportSpecifier(
                                specifier
                            ) &&
                            bt.isIdentifier(
                                specifier
                                    .imported
                            ) &&
                            specifier
                                .imported
                                .name ===
                            "t"
                        );
                    }
                );

        if (
            translateSpecifier
        ) {
            return {
                path:
                    statement,

                translateLocal:
                    translateSpecifier
                        .local
                        .name,
            };
        }
    }

    return null;
}

function containsTranslateCall(
    node,
    translateLocal
) {
    if (!node) {
        return false;
    }

    if (
        Array.isArray(node)
    ) {
        return node.some(
            (item) =>
                containsTranslateCall(
                    item,
                    translateLocal
                )
        );
    }

    if (
        typeof node !==
        "object"
    ) {
        return false;
    }

    if (
        bt.isCallExpression(
            node
        ) &&
        bt.isIdentifier(
            node.callee,
            {
                name:
                    translateLocal,
            }
        )
    ) {
        return true;
    }

    const keys =
        bt.VISITOR_KEYS[
        node.type
        ] ?? [];

    for (const key of keys) {
        if (
            containsTranslateCall(
                node[key],
                translateLocal
            )
        ) {
            return true;
        }
    }

    return false;
}

function isTopLevelFunction(
    functionPath
) {
    const parent =
        functionPath.parentPath;

    if (!parent) {
        return false;
    }

    // export default function Page() {}
    if (
        parent.isExportDefaultDeclaration()
    ) {
        return true;
    }

    // function Page() {}
    if (
        parent.isProgram()
    ) {
        return true;
    }

    // const Page = () => {}
    if (
        parent.isVariableDeclarator()
    ) {
        const declaration =
            parent.parentPath;

        if (
            !declaration?.isVariableDeclaration()
        ) {
            return false;
        }

        const declarationParent =
            declaration.parentPath;

        if (
            declarationParent?.isProgram()
        ) {
            return true;
        }

        // export const Page = () => {}
        if (
            declarationParent
                ?.isExportNamedDeclaration() &&
            declarationParent
                .parentPath
                ?.isProgram()
        ) {
            return true;
        }
    }

    return false;
}

function getTopLevelFunction(
    pathRef
) {
    let current =
        pathRef;

    while (
        current &&
        !current.isProgram()
    ) {
        if (
            (
                current.isFunctionDeclaration() ||
                current.isFunctionExpression() ||
                current.isArrowFunctionExpression()
            ) &&
            isTopLevelFunction(
                current
            )
        ) {
            return current;
        }

        current =
            current.parentPath;
    }

    return null;
}

function getFunctionName(
    functionPath
) {
    if (
        functionPath
            .isFunctionDeclaration()
    ) {
        return (
            functionPath.node
                .id?.name ??
            "default"
        );
    }

    const parent =
        functionPath.parentPath;

    if (
        parent?.isVariableDeclarator() &&
        bt.isIdentifier(
            parent.node.id
        )
    ) {
        return (
            parent.node.id.name
        );
    }

    if (
        parent?.isExportDefaultDeclaration()
    ) {
        return "default";
    }

    return null;
}

function isLikelyComponent(
    functionPath
) {
    const name =
        getFunctionName(
            functionPath
        );

    if (
        name === "default"
    ) {
        return true;
    }

    if (
        name &&
        /^[A-Z]/.test(name)
    ) {
        return true;
    }

    return false;
}

function ensureBlockBody(
    functionPath
) {
    // const Component = () => <div />
    //
    // превращаем в:
    //
    // const Component = () => {
    //   return <div />;
    // }

    if (
        functionPath
            .isArrowFunctionExpression() &&
        !bt.isBlockStatement(
            functionPath.node.body
        )
    ) {
        const oldBody =
            functionPath.node.body;

        functionPath
            .get("body")
            .replaceWith(
                bt.blockStatement([
                    bt.returnStatement(
                        oldBody
                    ),
                ])
            );
    }

    return functionPath.get(
        "body"
    );
}

function hasHookCall(
    functionPath,
    hookLocal
) {
    let found = false;

    functionPath.traverse({
        Function(innerPath) {
            if (
                innerPath.node !==
                functionPath.node
            ) {
                innerPath.skip();
            }
        },

        CallExpression(
            callPath
        ) {
            if (
                bt.isIdentifier(
                    callPath
                        .node
                        .callee,
                    {
                        name:
                            hookLocal,
                    }
                )
            ) {
                found = true;

                callPath.stop();
            }
        },
    });

    return found;
}

function ensureUseI18nImport(
    programPath,
    importPath
) {
    const existing =
        importPath.node
            .specifiers
            .find(
                (
                    specifier
                ) =>
                    bt.isImportSpecifier(
                        specifier
                    ) &&
                    bt.isIdentifier(
                        specifier
                            .imported
                    ) &&
                    specifier
                        .imported
                        .name ===
                    "useI18n"
            );

    if (existing) {
        return (
            existing.local.name
        );
    }

    let localName =
        "useI18n";

    if (
        programPath.scope
            .hasBinding(
                localName
            )
    ) {
        localName =
            "__useI18n";
    }

    importPath.node
        .specifiers
        .push(
            bt.importSpecifier(
                bt.identifier(
                    localName
                ),
                bt.identifier(
                    "useI18n"
                )
            )
        );

    return localName;
}

function addHookToComponent(
    functionPath,
    hookLocal
) {
    if (
        hasHookCall(
            functionPath,
            hookLocal
        )
    ) {
        return false;
    }

    const bodyPath =
        ensureBlockBody(
            functionPath
        );

    const hookStatement =
        bt.expressionStatement(
            bt.callExpression(
                bt.identifier(
                    hookLocal
                ),
                []
            )
        );

    bodyPath.unshiftContainer(
        "body",
        hookStatement
    );

    return true;
}

// MARK: Process file

function processFile(
    filePath
) {
    const source =
        fs.readFileSync(
            filePath,
            "utf8"
        );

    let ast;

    try {
        ast = parse(
            source,
            {
                sourceType:
                    "module",

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
            }
        );
    } catch (error) {
        console.error(
            `❌ ${path.relative(
                ROOT,
                filePath
            )}`
        );

        console.error(
            error.message
        );

        return {
            changed: false,
            hooks: 0,
            moved: 0,
            unresolved: [],
        };
    }

    let programPath = null;

    traverse(ast, {
        Program(pathRef) {
            programPath =
                pathRef;
        },
    });

    if (!programPath) {
        return {
            changed: false,
            hooks: 0,
            moved: 0,
            unresolved: [],
        };
    }

    const i18n =
        getI18nImport(
            programPath
        );

    // Файл уже новый либо вообще
    // не использует старый i18nT.
    if (!i18n) {
        return {
            changed: false,
            hooks: 0,
            moved: 0,
            unresolved: [],
        };
    }

    const {
        path: importPath,
        translateLocal,
    } = i18n;

    programPath.scope.crawl();

    const moves =
        new Map();

    const unresolved = [];

    let movedCount = 0;

    // MARK: Move module constants

    const bodyPaths = [
        ...programPath.get(
            "body"
        ),
    ];

    for (
        const statementPath
        of bodyPaths
    ) {
        if (
            !statementPath
                .isVariableDeclaration()
        ) {
            continue;
        }

        const kind =
            statementPath
                .node.kind;

        const declarationPaths =
            [
                ...statementPath.get(
                    "declarations"
                ),
            ];

        for (
            const declarationPath
            of declarationPaths
        ) {
            const {
                id,
                init,
            } =
                declarationPath.node;

            if (
                !bt.isIdentifier(id) ||
                !init
            ) {
                continue;
            }

            if (
                !containsTranslateCall(
                    init,
                    translateLocal
                )
            ) {
                continue;
            }

            const variableName =
                id.name;

            const binding =
                programPath.scope
                    .getBinding(
                        variableName
                    );

            if (
                !binding ||
                binding
                    .referencePaths
                    .length === 0
            ) {
                unresolved.push({
                    type:
                        "module-variable",
                    name:
                        variableName,
                    reason:
                        "Нет безопасного места для переноса",
                });

                continue;
            }

            const owners = [];

            let unsafe =
                false;

            for (
                const referencePath
                of binding
                    .referencePaths
            ) {
                const owner =
                    getTopLevelFunction(
                        referencePath
                    );

                if (!owner) {
                    unsafe = true;
                    break;
                }

                if (
                    !isLikelyComponent(
                        owner
                    )
                ) {
                    unsafe = true;
                    break;
                }

                if (
                    !owners.some(
                        (
                            existing
                        ) =>
                            existing.node ===
                            owner.node
                    )
                ) {
                    owners.push(
                        owner
                    );
                }
            }

            // Переменная используется
            // только одним React-компонентом.
            // Значит её можно безопасно
            // перенести внутрь него.

            if (
                !unsafe &&
                owners.length === 1
            ) {
                const target =
                    owners[0];

                let plan =
                    moves.get(
                        target.node
                    );

                if (!plan) {
                    plan = {
                        functionPath:
                            target,
                        declarations:
                            [],
                    };

                    moves.set(
                        target.node,
                        plan
                    );
                }

                plan.declarations.push(
                    bt.variableDeclaration(
                        kind,
                        [
                            bt.cloneNode(
                                declarationPath
                                    .node,
                                true
                            ),
                        ]
                    )
                );

                declarationPath.remove();

                movedCount++;

                continue;
            }

            unresolved.push({
                type:
                    "module-variable",
                name:
                    variableName,
                reason:
                    owners.length > 1
                        ? "Используется несколькими компонентами"
                        : "Используется вне React-компонента",
            });
        }

        if (
            statementPath.node &&
            statementPath.node
                .declarations
                .length === 0
        ) {
            statementPath.remove();
        }
    }

    // MARK: Insert moved declarations

    for (
        const plan
        of moves.values()
    ) {
        const bodyPath =
            ensureBlockBody(
                plan.functionPath
            );

        bodyPath.unshiftContainer(
            "body",
            plan.declarations
        );
    }

    // MARK: Find components that use i18nT

    const components =
        new Map();

    traverse(ast, {
        CallExpression(
            callPath
        ) {
            if (
                !bt.isIdentifier(
                    callPath
                        .node
                        .callee,
                    {
                        name:
                            translateLocal,
                    }
                )
            ) {
                return;
            }

            const owner =
                getTopLevelFunction(
                    callPath
                );

            if (
                owner &&
                isLikelyComponent(
                    owner
                )
            ) {
                components.set(
                    owner.node,
                    owner
                );

                return;
            }

            unresolved.push({
                type:
                    "translation-call",
                line:
                    callPath.node
                        .loc?.start
                        .line ??
                    null,
                reason:
                    "i18nT() остался вне React-компонента",
            });
        },
    });

    if (
        components.size === 0 &&
        movedCount === 0
    ) {
        return {
            changed: false,
            hooks: 0,
            moved: 0,
            unresolved,
        };
    }

    // MARK: Add useI18n import

    const hookLocal =
        ensureUseI18nImport(
            programPath,
            importPath
        );

    let hooksAdded = 0;

    // MARK: Add subscription to components

    for (
        const functionPath
        of components.values()
    ) {
        if (
            addHookToComponent(
                functionPath,
                hookLocal
            )
        ) {
            hooksAdded++;
        }
    }

    // На случай компонента, куда
    // были перенесены массивы,
    // но после каких-либо преобразований
    // прямой вызов не был найден.

    for (
        const plan
        of moves.values()
    ) {
        if (
            !components.has(
                plan.functionPath
                    .node
            )
        ) {
            if (
                addHookToComponent(
                    plan.functionPath,
                    hookLocal
                )
            ) {
                hooksAdded++;
            }
        }
    }

    const output =
        generate(
            ast,
            {
                comments: true,
                retainLines: false,

                jsescOption: {
                    minimal: true,
                },
            },
            source
        ).code + "\n";

    if (
        output === source
    ) {
        return {
            changed: false,
            hooks:
                hooksAdded,
            moved:
                movedCount,
            unresolved,
        };
    }

    fs.writeFileSync(
        filePath,
        output,
        "utf8"
    );

    return {
        changed: true,
        hooks:
            hooksAdded,
        moved:
            movedCount,
        unresolved,
    };
}

// MARK: Main

const files =
    SEARCH_DIRS.flatMap(
        getFiles
    );

console.log("");
console.log(
    `🔍 Найдено файлов: ${files.length}`
);
console.log("");

let changedFiles = 0;
let hooksAdded = 0;
let movedVariables = 0;

const unresolvedAll = [];

for (const file of files) {
    const result =
        processFile(file);

    if (
        result.changed
    ) {
        changedFiles++;

        console.log(
            `✅ ${path.relative(
                ROOT,
                file
            )} | hooks: ${result.hooks} | moved: ${result.moved}`
        );
    }

    hooksAdded +=
        result.hooks;

    movedVariables +=
        result.moved;

    for (
        const problem
        of result.unresolved
    ) {
        unresolvedAll.push({
            file:
                path.relative(
                    ROOT,
                    file
                ),
            ...problem,
        });
    }
}

console.log("");
console.log(
    `✅ Изменено файлов: ${changedFiles}`
);

console.log(
    `✅ Добавлено useI18n(): ${hooksAdded}`
);

console.log(
    `✅ Перенесено реактивных const: ${movedVariables}`
);

if (
    unresolvedAll.length === 0
) {
    console.log("");
    console.log(
        "🎉 Нерешённых случаев нет."
    );

    console.log(
        "RU ⇄ ҚАЗ теперь должен переключаться без перезагрузки."
    );
} else {
    console.log("");
    console.log(
        `⚠️ Осталось нестандартных случаев: ${unresolvedAll.length}`
    );

    for (
        const problem
        of unresolvedAll
    ) {
        const extra =
            problem.name
                ? ` (${problem.name})`
                : problem.line
                    ? ` (строка ${problem.line})`
                    : "";

        console.log(
            `   - ${problem.file}${extra}: ${problem.reason}`
        );
    }

    console.log("");
    console.log(
        "Скинь мне только этот список — оставшиеся случаи добьём отдельно."
    );
}

console.log("");