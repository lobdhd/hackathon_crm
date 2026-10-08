
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { parse } from '@babel/parser';

const require = createRequire(import.meta.url);
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

// MARK: Configuration

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const WRITE = process.argv.includes('--write');
const ONLY = (
    process.argv.find(arg => arg.startsWith('--only=')) ?? ''
).slice('--only='.length).replaceAll('\\', '/');

const EXT = new Set(['.js', '.jsx', '.ts', '.tsx']);
const EXCLUDED = new Set([
    'node_modules', 'locales', 'i18n',
    'assets', 'dist', 'build', '__tests__',
]);

const PARSER_OPTIONS = {
    sourceType: 'unambiguous',
    plugins: [
        'jsx',
        'typescript',
        'classProperties',
        'decorators-legacy',
    ],
};

// Этот ключ отличается в RU и KK.
// Используется для обновления useMemo/useCallback.
const LANGUAGE_KEY = 'sidebar.home';

// MARK: Files

function listFiles(dir) {
    if (!fs.existsSync(dir)) return [];

    return fs.readdirSync(dir, {
        withFileTypes: true,
    }).flatMap(entry => {
        const full = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            return EXCLUDED.has(entry.name)
                ? []
                : listFiles(full);
        }

        return entry.isFile() &&
            EXT.has(path.extname(entry.name))
            ? [full]
            : [];
    });
}

function parseSource(source) {
    return parse(source, PARSER_OPTIONS);
}

function isI18nSource(value) {
    return /(?:^|\/)i18n(?:\/index(?:\.[cm]?[jt]sx?)?)?$/.test(value);
}

// MARK: AST helpers

function containsCall(node, names) {
    if (!node) return false;

    if (Array.isArray(node)) {
        return node.some(item => containsCall(item, names));
    }

    if (typeof node !== 'object') return false;

    if (
        t.isCallExpression(node) &&
        t.isIdentifier(node.callee) &&
        names.has(node.callee.name)
    ) {
        return true;
    }

    return (t.VISITOR_KEYS[node.type] ?? []).some(
        key => containsCall(node[key], names)
    );
}

function hasAnyNameReference(node, names) {
    if (!node) return false;

    if (Array.isArray(node)) {
        return node.some(item =>
            hasAnyNameReference(item, names)
        );
    }

    if (typeof node !== 'object') return false;

    if (
        t.isIdentifier(node) &&
        names.has(node.name)
    ) {
        return true;
    }

    return (t.VISITOR_KEYS[node.type] ?? []).some(
        key => hasAnyNameReference(node[key], names)
    );
}

function getComponentName(p) {
    if (p.isFunctionDeclaration()) {
        return p.node.id?.name ?? 'default';
    }

    let parent = p.parentPath;

    if (parent?.isVariableDeclarator()) {
        return parent.node.id?.name;
    }

    if (parent?.isExportDefaultDeclaration()) {
        return 'default';
    }

    // Поддержка memo() и forwardRef()
    if (parent?.isCallExpression()) {
        const callee = parent.node.callee;

        const name = t.isIdentifier(callee)
            ? callee.name
            : t.isMemberExpression(callee) &&
                t.isIdentifier(callee.property)
                ? callee.property.name
                : '';

        if (['memo', 'forwardRef'].includes(name)) {
            parent = parent.parentPath;

            if (parent?.isVariableDeclarator()) {
                return parent.node.id?.name;
            }

            if (parent?.isExportDefaultDeclaration()) {
                return 'default';
            }
        }
    }

    return null;
}

function isComponent(p) {
    if (
        !p.isFunctionDeclaration() &&
        !p.isFunctionExpression() &&
        !p.isArrowFunctionExpression()
    ) {
        return false;
    }

    const name = getComponentName(p);

    return name === 'default' ||
        Boolean(name && /^[A-Z]/.test(name));
}

function enclosingFunction(p) {
    return p.findParent(parent => parent.isFunction());
}

function lineIndent(source, position) {
    const start =
        source.lastIndexOf('\n', position - 1) + 1;

    const indent =
        source.slice(start, position).match(/^\s*/)?.[0] ?? '';

    return indent.replace(/[^\t ]/g, '') + '    ';
}

function applyEdits(source, edits) {
    const sorted = edits.slice().sort(
        (a, b) => b.start - a.start || b.end - a.end
    );

    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].end > sorted[i - 1].start) {
            throw new Error(
                `Пересекающиеся правки: ${sorted[i].reason} / ${sorted[i - 1].reason}`
            );
        }
    }

    let result = source;

    for (const edit of sorted) {
        result =
            result.slice(0, edit.start) +
            edit.text +
            result.slice(edit.end);
    }

    return result;
}

function uniqueName(scope, base) {
    let name = base;
    let index = 2;

    while (
        scope.hasBinding(name) ||
        scope.hasGlobal(name)
    ) {
        name = `${base}${index++}`;
    }

    return name;
}

// MARK: Process file

function processFile(file) {
    const warnings = [];

    const stats = {
        hooks: 0,
        memoDeps: 0,
        factories: 0,
        arrows: 0,
    };

    let source = fs.readFileSync(file, 'utf8');
    let ast;

    try {
        ast = parseSource(source);
    } catch (error) {
        return {
            changed: false,
            stats,
            warnings: [`Ошибка JSX: ${error.message}`],
            error: true,
        };
    }

    let program;

    traverse(ast, {
        Program(p) {
            program = p;
            p.stop();
        },
    });

    // MARK: Find i18n imports

    const imports = program.get('body').filter(
        p => p.isImportDeclaration() &&
            isI18nSource(p.node.source.value)
    );

    const translateAliases = new Set();
    let hookName = null;
    let importSource = null;

    for (const imp of imports) {
        importSource ??= imp.node.source.value;

        for (const spec of imp.node.specifiers) {
            if (!t.isImportSpecifier(spec)) continue;

            const imported = t.isIdentifier(spec.imported)
                ? spec.imported.name
                : spec.imported.value;

            if (imported === 't') {
                translateAliases.add(spec.local.name);
            }

            if (imported === 'useI18n') {
                hookName = spec.local.name;
            }
        }
    }

    if (!translateAliases.size) {
        return { changed: false, stats, warnings };
    }

    // MARK: Detect translated globals

    const topLevelTranslationNames = new Set();

    for (const statement of program.get('body')) {
        const declaration = statement.isVariableDeclaration()
            ? statement
            : statement.isExportNamedDeclaration() &&
                statement.get('declaration')?.isVariableDeclaration()
                ? statement.get('declaration')
                : null;

        if (!declaration) continue;

        for (const item of declaration.get('declarations')) {
            if (
                t.isIdentifier(item.node.id) &&
                containsCall(item.node.init, translateAliases)
            ) {
                topLevelTranslationNames.add(item.node.id.name);
            }
        }
    }

    // MARK: Short arrow components

    const expressionEdits = [];

    traverse(ast, {
        ArrowFunctionExpression(p) {
            if (
                !isComponent(p) ||
                t.isBlockStatement(p.node.body)
            ) {
                return;
            }

            if (
                !containsCall(p.node.body, translateAliases) &&
                !hasAnyNameReference(
                    p.node.body,
                    topLevelTranslationNames
                )
            ) {
                return;
            }

            const clone = t.cloneNode(p.node, true);

            clone.body = t.blockStatement([
                t.returnStatement(clone.body),
            ]);

            clone.expression = false;

            expressionEdits.push({
                start: p.node.start,
                end: p.node.end,
                text: generate(clone, {
                    comments: true,
                    jsescOption: { minimal: true },
                }).code,
                reason: 'arrow component',
            });
        },
    });

    if (expressionEdits.length) {
        source = applyEdits(source, expressionEdits);
        ast = parseSource(source);

        traverse(ast, {
            Program(p) {
                program = p;
                p.stop();
            },
        });

        stats.arrows = expressionEdits.length;
    }

    program.scope.crawl();

    const edits = [];
    const factories = new Set();
    const skippedGlobals = new Set();

    // MARK: Reactive global arrays

    for (const statement of program.get('body')) {
        const exported =
            statement.isExportNamedDeclaration() ||
            statement.isExportDefaultDeclaration();

        const decl = statement.isVariableDeclaration()
            ? statement
            : exported &&
                statement.get('declaration')?.isVariableDeclaration()
                ? statement.get('declaration')
                : null;

        if (!decl) continue;

        for (const item of decl.get('declarations')) {
            const { id, init } = item.node;

            if (
                !t.isIdentifier(id) ||
                !init ||
                !containsCall(init, translateAliases)
            ) {
                continue;
            }

            const name = id.name;

            // Не преобразуем повторно
            const alreadyFactory =
                t.isArrowFunctionExpression(init) &&
                (
                    t.isArrayExpression(init.body) ||
                    t.isObjectExpression(init.body)
                );

            if (
                alreadyFactory &&
                !exported &&
                decl.node.kind === 'const'
            ) {
                factories.add(name);
                continue;
            }

            const isLiteral =
                t.isArrayExpression(init) ||
                t.isObjectExpression(init);

            if (
                !isLiteral ||
                exported ||
                decl.node.kind !== 'const'
            ) {
                skippedGlobals.add(name);
                warnings.push(
                    `Глобальная ${name}: требуется ручная проверка`
                );
                continue;
            }

            const binding =
                program.scope.getBinding(name);

            if (!binding) {
                warnings.push(`Не найден binding ${name}`);
                continue;
            }

            const safeReferences =
                binding.referencePaths.every(ref => {
                    if (
                        ref.parentPath.isObjectProperty() &&
                        ref.parentPath.node.shorthand
                    ) {
                        return false;
                    }

                    if (
                        ref.parentPath.isNewExpression() &&
                        ref.key === 'callee'
                    ) {
                        return false;
                    }

                    // Другой глобальный const оставляем без изменений
                    if (!enclosingFunction(ref)) {
                        return false;
                    }

                    return true;
                });

            if (!safeReferences) {
                skippedGlobals.add(name);
                warnings.push(
                    `Глобальная ${name}: небезопасные ссылки, пропущена`
                );
                continue;
            }

            factories.add(name);

            // const OPTIONS = [...]
            // -> const OPTIONS = () => ([...])
            edits.push({
                start: init.start,
                end: init.end,
                text: `() => (${source.slice(init.start, init.end)})`,
                reason: `factory ${name}`,
            });

            // OPTIONS.map(...)
            // -> OPTIONS().map(...)
            for (const ref of binding.referencePaths) {
                edits.push({
                    start: ref.node.end,
                    end: ref.node.end,
                    text: '()',
                    reason: `call ${name}`,
                });
            }

            stats.factories++;
        }
    }

    // MARK: Find React components

    const reactiveComponents = [];

    traverse(ast, {
        Function(p) {
            if (!isComponent(p)) return;
            if (!t.isBlockStatement(p.node.body)) return;

            if (
                !containsCall(p.node.body, translateAliases) &&
                !hasAnyNameReference(p.node.body, factories)
            ) {
                return;
            }

            reactiveComponents.push(p);
        },
    });

    if (
        !reactiveComponents.length &&
        !edits.length
    ) {
        return { changed: false, stats, warnings };
    }

    // MARK: Add useI18n import

    if (!hookName && reactiveComponents.length) {
        hookName = uniqueName(
            program.scope,
            '__useI18nReactive'
        );

        const imported =
            `\nimport { useI18n as ${hookName} } from ${JSON.stringify(importSource)};`;

        const lastImport = program
            .get('body')
            .filter(p => p.isImportDeclaration())
            .at(-1);

        const at = lastImport
            ? lastImport.node.end
            : 0;

        edits.push({
            start: at,
            end: at,
            text: imported + (lastImport ? '' : '\n'),
            reason: 'import hook',
        });
    }

    // MARK: Process React components

    for (const component of reactiveComponents) {
        const body = component.node.body;
        let alreadyHooked = false;

        const memos = [];

        component.traverse({
            Function(p) {
                if (
                    p.node !== component.node &&
                    isComponent(p)
                ) {
                    p.skip();
                }
            },

            CallExpression(p) {
                if (
                    t.isIdentifier(p.node.callee, {
                        name: hookName,
                    })
                ) {
                    alreadyHooked = true;
                }

                const callee = p.node.callee;

                const method = t.isIdentifier(callee)
                    ? callee.name
                    : t.isMemberExpression(callee) &&
                        t.isIdentifier(callee.property)
                        ? callee.property.name
                        : null;

                if (
                    !['useMemo', 'useCallback'].includes(method)
                ) {
                    return;
                }

                if (p.node.arguments.length < 2) {
                    return;
                }

                const deps = p.node.arguments[1];

                if (!t.isArrayExpression(deps)) {
                    warnings.push(
                        `Строка ${p.node.loc?.start.line}: сложные зависимости ${method}`
                    );
                    return;
                }

                memos.push(deps);
            },
        });

        // MARK: Existing locale dependency

        const existingToken = body.body
            .flatMap(statement =>
                t.isVariableDeclaration(statement)
                    ? statement.declarations
                    : []
            )
            .find(decl =>
                t.isIdentifier(decl.id) &&
                /^__i18nLocaleToken\d*$/.test(decl.id.name) &&
                t.isCallExpression(decl.init) &&
                t.isIdentifier(decl.init.callee) &&
                translateAliases.has(decl.init.callee.name) &&
                t.isStringLiteral(decl.init.arguments[0], {
                    value: LANGUAGE_KEY,
                })
            );

        const tokenName = memos.length
            ? existingToken?.id.name ??
                uniqueName(
                    component.scope,
                    '__i18nLocaleToken'
                )
            : null;

        const hookStatements = [];

        if (!alreadyHooked) {
            hookStatements.push(`${hookName}();`);
            stats.hooks++;
        }

        if (tokenName && !existingToken) {
            hookStatements.push(
                `const ${tokenName} = ${[...translateAliases][0]}(${JSON.stringify(LANGUAGE_KEY)});`
            );
        }

        if (hookStatements.length) {
            const indent = lineIndent(
                source,
                body.start
            );

            const suffix =
                source[body.start + 1] === '\n'
                    ? ''
                    : '\n' + indent;

            const text =
                '\n' +
                indent +
                hookStatements.join('\n' + indent) +
                suffix;

            edits.push({
                start: body.start + 1,
                end: body.start + 1,
                text,
                reason: 'reactive hook',
            });
        }

        // MARK: Fix useMemo/useCallback dependencies

        if (tokenName) {
            for (const deps of memos) {
                const beforeClose = source.slice(
                    deps.start,
                    deps.end - 1
                );

                if (beforeClose.includes(tokenName)) {
                    continue;
                }

                const hasElements =
                    deps.elements.some(Boolean);

                const tail = beforeClose.trimEnd();

                const needsComma =
                    hasElements && !tail.endsWith(',');

                const inner = source.slice(
                    deps.start + 1,
                    deps.end - 1
                );

                const hasLineComment =
                    /\/\/[^\n]*$/.test(inner);

                const addition = hasLineComment
                    ? `\n${lineIndent(source, deps.start)}${needsComma ? ',' : ''}${tokenName}`
                    : `${needsComma ? ',' : ''} ${tokenName}`;

                edits.push({
                    start: deps.end - 1,
                    end: deps.end - 1,
                    text: addition,
                    reason: 'memo dependencies',
                });

                stats.memoDeps++;
            }
        }
    }

    if (skippedGlobals.size) {
        warnings.push(
            `Неподвижные глобальные переводы: ${[...skippedGlobals].join(', ')}`
        );
    }

    // MARK: Validate and save

    let result;

    try {
        result = applyEdits(source, edits);

        // Проверяем корректность преобразованного JSX
        parseSource(result);
    } catch (error) {
        return {
            changed: false,
            stats,
            warnings: [
                ...warnings,
                `Конфликт изменений: ${error.message}`,
            ],
            error: true,
        };
    }

    const changed =
        result !== fs.readFileSync(file, 'utf8');

    if (WRITE && changed) {
        fs.writeFileSync(file, result, 'utf8');
    }

    return { changed, stats, warnings };
}

// MARK: Main

const files = listFiles(SRC).filter(file =>
    !ONLY ||
    path.relative(ROOT, file)
        .replaceAll('\\', '/')
        .includes(ONLY)
);

let changed = 0;
let problems = 0;

const totals = {
    hooks: 0,
    memoDeps: 0,
    factories: 0,
    arrows: 0,
};

console.log(
    `🔎 Режим: ${WRITE ? 'ЗАПИСЬ' : 'ПРОСМОТР'}, файлов: ${files.length}`
);

for (const file of files) {
    const relative = path.relative(ROOT, file);
    const result = processFile(file);

    for (const key of Object.keys(totals)) {
        totals[key] += result.stats[key];
    }

    if (result.changed) {
        changed++;

        console.log(
            `${WRITE ? '✅' : '🔎'} ${relative} | ` +
            `хуки: ${result.stats.hooks}, ` +
            `memo: ${result.stats.memoDeps}, ` +
            `константы: ${result.stats.factories}`
        );
    }

    for (const warning of result.warnings) {
        console.warn(`⚠️ ${relative}: ${warning}`);
    }

    if (result.error) {
        problems++;
    }
}

console.log(
    `\nИзменено файлов: ${changed}; ` +
    `useI18n(): ${totals.hooks}; ` +
    `зависимости: ${totals.memoDeps}; ` +
    `реактивные константы: ${totals.factories}; ` +
    `короткие компоненты: ${totals.arrows}.`
);

console.log(
    'Неоднозначные случаи вне React-компонентов требуют ручной проверки.'
);

if (!WRITE) {
    console.log(
        'Предпросмотр без записи. Для применения используй --write.'
    );
}

if (problems) {
    process.exitCode = 1;
}
