import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { parse } from '@babel/parser';
const require = createRequire(import.meta.url);
const traverse = require('@babel/traverse').default;
const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const SEARCH_DIRS = ['components', 'pages', 'react-components'].map((dir) => path.join(SRC, dir));
const OUTPUT_DIR = path.join(SRC, 'locales');
const RU_FILE = path.join(OUTPUT_DIR, 'ru.json');
const KK_FILE = path.join(OUTPUT_DIR, 'kk.json');
const EXT = new Set(['.js', '.jsx', '.ts', '.tsx']);
const ATTRIBUTES = new Set(['placeholder', 'title', 'aria-label', 'alt', 'label', 'subtitle', 'description', 'helper', 'header', 'tooltip', 'emptyText', 'emptyDescription']);
const OBJECT_KEYS = new Set(['label', 'title', 'description', 'subtitle', 'message', 'text', 'helper', 'header', 'placeholder', 'emptyText', 'emptyDescription']);
const DIALOGS = new Set(['alert', 'confirm', 'prompt']);
const TOAST_METHODS = new Set(['success', 'error', 'info', 'warning', 'warn', 'loading']);
const DATA_CALLS = new Set(['fetch', 'post', 'put', 'patch', 'delete', 'request', 'mutate', 'mutateAsync']);
const normalize = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
function shouldTranslate(raw) {
    const text = normalize(raw);
    if (!text || /^\d+(?:[.,]\d+)?$/.test(text) || /^#[0-9a-f]{3,8}$/i.test(text)) return false;
    if (/^(?:https?:\/\/|\/api\/|www\.)/i.test(text)) return false;
    if (/^[A-Za-z0-9_-]+$/.test(text)) return false;
    return /[A-Za-zА-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһ]/.test(text);
}
function getFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return getFiles(full);
        return entry.isFile() && EXT.has(path.extname(entry.name)) ? [full] : [];
    });
}
function loadJson(file) {
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function createKey(file, text) {
    const fileKey = path.relative(SRC, file).replace(/\.(jsx?|tsx?)$/, '')
        .replace(/[\\/]/g, '.').replace(/[^a-zA-Z0-9_.]/g, '').toLowerCase();
    const hash = crypto.createHash('md5').update(text).digest('hex').slice(0, 7);
    return `${fileKey}.${hash}`;
}
function keyForProperty(node, computed) {
    if (computed) return null;
    if (node?.type === 'Identifier') return node.name;
    if (node?.type === 'StringLiteral') return node.value;
    return null;
}
function insideDataCall(p) {
    let ancestor = p.parentPath;
    while (ancestor && !ancestor.isProgram()) {
        if (ancestor.isCallExpression()) {
            const callee = ancestor.node.callee;
            const name = callee.type === 'Identifier' ? callee.name :
                callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier'
                    ? callee.property.name : null;
            if (DATA_CALLS.has(name)) return true;
        }
        ancestor = ancestor.parentPath;
    }
    return false;
}
function jsxTextContext(p) {
    let parent = p.parentPath;
    while (parent && !parent.isJSXExpressionContainer()) {
        if (!parent.isConditionalExpression() && !parent.isLogicalExpression()) return false;
        parent = parent.parentPath;
    }
    return Boolean(parent && (parent.parentPath.isJSXElement() || parent.parentPath.isJSXFragment()));
}
const existingRu = loadJson(RU_FILE);
const existingKk = loadJson(KK_FILE);
const translations = new Map();
const seen = new Set();
function add(file, raw) {
    const text = normalize(raw);
    if (!shouldTranslate(text) || seen.has(text)) return;
    seen.add(text);
    translations.set(createKey(file, text), text);
}
const files = SEARCH_DIRS.flatMap(getFiles);
let errors = 0;
for (const file of files) {
    let ast;
    try {
        ast = parse(fs.readFileSync(file, 'utf8'), {
            sourceType: 'unambiguous',
            plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy'],
        });
    } catch (error) {
        console.error(`❌ ${path.relative(ROOT, file)}: ${error.message}`);
        errors++;
        continue;
    }
    traverse(ast, {
        JSXText(p) { add(file, p.node.value); },
        JSXAttribute(p) {
            if (!ATTRIBUTES.has(p.node.name?.name)) return;
            const val = p.node.value;
            if (val?.type === 'StringLiteral') add(file, val.value);
            if (val?.type === 'JSXExpressionContainer' && val.expression?.type === 'StringLiteral') add(file, val.expression.value);
        },
        ObjectProperty(p) {
            if (!OBJECT_KEYS.has(keyForProperty(p.node.key, p.node.computed)) || insideDataCall(p)) return;
            if (p.node.value.type === 'StringLiteral') add(file, p.node.value.value);
        },
        CallExpression(p) {
            const c = p.node.callee;
            const dialog = c.type === 'Identifier' && DIALOGS.has(c.name) ||
                c.type === 'MemberExpression' && !c.computed && c.object.type === 'Identifier' &&
                (c.object.name === 'window' && DIALOGS.has(c.property.name) || c.object.name === 'toast' && TOAST_METHODS.has(c.property.name));
            if (dialog && p.node.arguments[0]?.type === 'StringLiteral') add(file, p.node.arguments[0].value);
        },
        StringLiteral(p) {
            if (jsxTextContext(p)) add(file, p.node.value);
        },
    });
}
if (errors) {
    console.error(`❌ Файлы с ошибками парсинга: ${errors}. Словари не перезаписаны.`);
    process.exitCode = 1;
} else {
    const ru = { ...existingRu };
    const kk = { ...existingKk };
    for (const [key, text] of translations) {
        ru[key] ??= text;
        kk[key] ??= text;
    }
    const sort = (value) => Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(RU_FILE, JSON.stringify(sort(ru), null, 2) + '\n', 'utf8');
    fs.writeFileSync(KK_FILE, JSON.stringify(sort(kk), null, 2) + '\n', 'utf8');
    console.log(`✅ Файлов: ${files.length}; фраз: ${translations.size}; RU: ${Object.keys(ru).length}; KK: ${Object.keys(kk).length}`);
    console.log('⚠️ Новые фразы в KK пока на русском. Требуется реальный перевод.');
}
