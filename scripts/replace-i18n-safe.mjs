
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { parse } from '@babel/parser';

const require = createRequire(import.meta.url);
const traverse = require('@babel/traverse').default;
const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const I18N = path.join(SRC, 'i18n', 'index.js');
const RU_PATH = path.join(SRC, 'locales', 'ru.json');
const KK_PATH = path.join(SRC, 'locales', 'kk.json');
const SEARCH_DIRS = ['components', 'pages'].map((dir) => path.join(SRC, dir));
const EXT = new Set(['.js', '.jsx', '.ts', '.tsx']);
const APPLY = process.argv.includes('--write');
const ONLY_ARG = process.argv.find((arg) => arg.startsWith('--only='));
const ONLY = ONLY_ARG?.slice('--only='.length).replaceAll('\\', '/') || '';
const CYRILLIC = /[А-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһ]/;

// UI-пропсы. Не добавляйте сюда value, status, type, to, href, id и т.п.
const UI_PROPS = new Set([
    'placeholder', 'title', 'aria-label', 'alt', 'label', 'subtitle',
    'description', 'helper', 'header', 'text', 'tooltip',
    'emptyText', 'emptyDescription', 'searchPlaceholder',
    'confirmText', 'cancelText', 'noDataText',
]);

// Поля объектов, в которых обычно лежит именно текст интерфейса.
// Поле name намеренно исключено: это может быть название сущности/API-данные.
const UI_OBJECT_KEYS = new Set([
    'label', 'title', 'subtitle', 'description', 'message',
    'text', 'helper', 'header', 'placeholder', 'emptyText', 'emptyDescription',
]);
const UI_DIALOGS = new Set(['alert', 'confirm', 'prompt']);
const TOAST_METHODS = new Set(['success', 'error', 'info', 'warning', 'warn', 'loading']);
const DATA_CALLS = new Set(['fetch', 'post', 'put', 'patch', 'delete', 'request', 'mutate', 'mutateAsync']);

function normalize(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
}
function isUserText(value) {
    return Boolean(value && CYRILLIC.test(normalize(value)));
}
function loadJson(file) {
    if (!fs.existsSync(file)) throw new Error(`Не найден файл: ${path.relative(ROOT, file)}`);
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function filesIn(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return filesIn(full);
        return entry.isFile() && EXT.has(path.extname(entry.name)) ? [full] : [];
    });
}
function importPathFor(file) {
    let rel = path.relative(path.dirname(file), I18N).replaceAll('\\', '/');
    if (!rel.startsWith('.')) rel = `./${rel}`;
    return rel;
}
function toCall(key) {
    return `i18nT(${JSON.stringify(key)})`;
}
function keyForProperty(keyNode, computed) {
    if (computed) return null;
    if (keyNode.type === 'Identifier') return keyNode.name;
    if (keyNode.type === 'StringLiteral') return keyNode.value;
    return null;
}
function isToastCall(callee) {
    if (callee.type === 'Identifier') return callee.name === 'toast';
    return callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier' && callee.object.name === 'toast' &&
        !callee.computed && callee.property.type === 'Identifier' &&
        TOAST_METHODS.has(callee.property.name);
}
function isDialogCall(callee) {
    if (callee.type === 'Identifier') return UI_DIALOGS.has(callee.name);
    return callee.type === 'MemberExpression' &&
        !callee.computed && callee.object.type === 'Identifier' &&
        callee.object.name === 'window' && callee.property.type === 'Identifier' &&
        UI_DIALOGS.has(callee.property.name);
}
function isInsideDataCall(nodePath) {
    let p = nodePath.parentPath;
    while (p && !p.isProgram()) {
        if (p.isCallExpression()) {
            const callee = p.node.callee;
            const name = callee.type === 'Identifier' ? callee.name :
                (callee.type === 'MemberExpression' && !callee.computed &&
                    callee.property.type === 'Identifier' ? callee.property.name : null);
            if (DATA_CALLS.has(name)) return true;
        }
        p = p.parentPath;
    }
    return false;
}
function jsxTranslationContext(nodePath) {
    // Разрешаем строки внутри простых JSX-тернарников, но не сравнения,
    // аргументы функций, JS-объекты, вычисления и API-данные.
    let p = nodePath.parentPath;
    while (p && !p.isJSXExpressionContainer()) {
        if (!p.isConditionalExpression() && !p.isLogicalExpression()) return false;
        p = p.parentPath;
    }
    if (!p) return false;
    const container = p.parentPath;
    if (container.isJSXElement() || container.isJSXFragment()) return true;
    return container.isJSXAttribute() && UI_PROPS.has(container.node.name?.name);
}

const ru = loadJson(RU_PATH);
const kk = loadJson(KK_PATH);
const byText = new Map();
for (const [key, value] of Object.entries(ru)) {
    const normalized = normalize(value);
    if (!isUserText(normalized)) continue;
    const keys = byText.get(normalized) ?? [];
    keys.push(key);
    byText.set(normalized, keys);
}
function selectKey(text, file) {
    const choices = byText.get(normalize(text));
    if (!choices?.length) return null;
    const fileKey = path.relative(SRC, file).replace(/\.(jsx?|tsx?)$/, '')
        .replaceAll('\\', '.').replaceAll('/', '.').toLowerCase();
    return choices.slice().sort((a, b) => {
        const score = (key) =>
            (typeof kk[key] === 'string' && normalize(kk[key]) !== normalize(ru[key]) ? 8 : 0) +
            (key.startsWith(`${fileKey}.`) ? 4 : 0) +
            (!/\.[a-f\d]{7}$/i.test(key) ? 1 : 0);
        return score(b) - score(a) || a.localeCompare(b);
    })[0];
}

let totalEdits = 0;
let changedFiles = 0;
let issues = 0;
const matchedKeys = new Set();
const files = SEARCH_DIRS.flatMap(filesIn).filter((file) =>
    !ONLY || path.relative(ROOT, file).replaceAll('\\', '/').includes(ONLY),
);
if (!files.length) {
    console.log('Файлов не найдено. Проверь --only или структуру src.');
    process.exitCode = 1;
}
for (const file of files) {
    const relative = path.relative(ROOT, file);
    const source = fs.readFileSync(file, 'utf8');
    let ast;
    try {
        ast = parse(source, {
            sourceType: 'unambiguous',
            plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy'],
        });
    } catch (error) {
        console.error(`❌ Ошибка парсинга ${relative}: ${error.message}`);
        issues++;
        continue;
    }
    let hasI18nImport = false;
    let i18nNameOccupied = false;
    const importSource = importPathFor(file);
    const edits = [];
    const usedRanges = new Set();
    for (const item of ast.program.body) {
        if (item.type !== 'ImportDeclaration') continue;
        for (const spec of item.specifiers) {
            if (spec.local?.name !== 'i18nT') continue;
            if (spec.type === 'ImportSpecifier' && spec.imported?.name === 't' &&
                path.resolve(path.dirname(file), item.source.value) === path.resolve(I18N)) {
                hasI18nImport = true;
            } else {
                i18nNameOccupied = true;
            }
        }
    }
    // Глобальное/локальное имя тоже не должно конфликтовать с новым импортом.
    if (!hasI18nImport) {
        traverse(ast, {
            Program(p) { i18nNameOccupied ||= p.scope.hasBinding('i18nT'); p.stop(); },
        });
    }
    if (i18nNameOccupied) {
        console.warn(`⚠️ ${relative}: имя i18nT занято, файл пропущен`);
        issues++;
        continue;
    }
    function replace(node, value, mode = 'expression') {
        if (!node || !isUserText(value)) return;
        const key = selectKey(value, file);
        if (!key) return;
        const range = `${node.start}:${node.end}`;
        if (usedRanges.has(range)) return;
        usedRanges.add(range);
        let code = toCall(key);
        if (mode === 'attribute') code = `{${code}}`;
        if (mode === 'jsxText') {
            const raw = source.slice(node.start, node.end);
            const before = raw.match(/^\s*/)?.[0] ?? '';
            const after = raw.match(/\s*$/)?.[0] ?? '';
            code = `${before}{${code}}${after}`;
        }
        edits.push({ start: node.start, end: node.end, text: code, key });
    }
    traverse(ast, {
        JSXText(p) { replace(p.node, p.node.value, 'jsxText'); },
        JSXAttribute(p) {
            if (!UI_PROPS.has(p.node.name?.name)) return;
            const v = p.node.value;
            if (v?.type === 'StringLiteral') replace(v, v.value, 'attribute');
            else if (v?.type === 'JSXExpressionContainer' && v.expression?.type === 'StringLiteral') {
                replace(v.expression, v.expression.value);
            }
        },
        ObjectProperty(p) {
            const name = keyForProperty(p.node.key, p.node.computed);
            if (!UI_OBJECT_KEYS.has(name) || isInsideDataCall(p)) return;
            const v = p.node.value;
            if (v.type === 'StringLiteral') replace(v, v.value);
            if (v.type === 'TemplateLiteral' && !v.expressions.length) {
                replace(v, v.quasis[0]?.value.cooked ?? v.quasis[0]?.value.raw);
            }
        },
        CallExpression(p) {
            if (!isDialogCall(p.node.callee) && !isToastCall(p.node.callee)) return;
            const arg = p.node.arguments[0];
            if (arg?.type === 'StringLiteral') replace(arg, arg.value);
            if (arg?.type === 'TemplateLiteral' && !arg.expressions.length) {
                replace(arg, arg.quasis[0]?.value.cooked ?? arg.quasis[0]?.value.raw);
            }
        },
        StringLiteral(p) {
            if (jsxTranslationContext(p)) replace(p.node, p.node.value);
        },
        TemplateLiteral(p) {
            if (!p.node.expressions.length && jsxTranslationContext(p)) {
                replace(p.node, p.node.quasis[0]?.value.cooked ?? p.node.quasis[0]?.value.raw);
            }
        },
    });
    if (!edits.length) continue;
    // Если диапазоны пересеклись, не перезаписываем файл с неоднозначной правкой.
    edits.sort((a, b) => a.start - b.start);
    if (edits.some((edit, i) => i && edit.start < edits[i - 1].end)) {
        console.warn(`⚠️ ${relative}: пересекающиеся замены, файл пропущен`);
        issues++;
        continue;
    }
    for (const edit of edits) matchedKeys.add(edit.key);
    let updated = source;
    for (const edit of [...edits].reverse()) {
        updated = updated.slice(0, edit.start) + edit.text + updated.slice(edit.end);
    }
    if (!hasI18nImport) {
        const existing = ast.program.body.filter((node) => node.type === 'ImportDeclaration');
        const line = `import { t as i18nT } from ${JSON.stringify(importSource)};`;
        if (existing.length) {
            const insertion = existing[existing.length - 1].end;
            // Импорт добавляем в исходную позицию, независимо от замен ниже.
            // Сначала вставлять нельзя: AST-координаты относились к исходнику.
            let shift = 0;
            for (const edit of edits) if (edit.start < insertion) shift += edit.text.length - (edit.end - edit.start);
            const pos = insertion + shift;
            updated = `${updated.slice(0, pos)}\n${line}${updated.slice(pos)}`;
        } else {
            updated = `${line}\n${updated}`;
        }
    }
    changedFiles++;
    totalEdits += edits.length;
    console.log(`${APPLY ? '✅' : '🔎'} ${relative}: ${edits.length} замен`);
    if (APPLY) fs.writeFileSync(file, updated, 'utf8');
}
console.log(`\n${APPLY ? 'Записано' : 'Проверено'}: ${changedFiles} файлов, ${totalEdits} замен.`);
console.log(`Ключей использовано: ${matchedKeys.size}. Проблем: ${issues}.`);
if (!APPLY) console.log('Это только просмотр. Для записи добавь --write.');
if (issues) process.exitCode = 1;
