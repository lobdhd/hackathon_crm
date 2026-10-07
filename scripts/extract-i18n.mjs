import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { parse } from '@babel/parser';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const traverse = require('@babel/traverse').default;

const ROOT = process.cwd();

const SEARCH_DIRS = [
    path.join(ROOT, 'src/components'),
    path.join(ROOT, 'src/pages'),
];

const OUTPUT_DIR = path.join(ROOT, 'src/locales');

const RU_FILE = path.join(OUTPUT_DIR, 'ru.json');
const KK_FILE = path.join(OUTPUT_DIR, 'kk.json');

const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

// Атрибуты, текст которых обычно нужно переводить
const TRANSLATABLE_ATTRIBUTES = new Set([
    'placeholder',
    'title',
    'aria-label',
    'alt',
]);

// Строки в этих свойствах объектов тоже можно считать текстом интерфейса
const TRANSLATABLE_OBJECT_KEYS = new Set([
    'label',
    'title',
    'description',
    'subtitle',
    'message',
    'text',
    'name',
]);

// Функции, аргументы которых обычно показываются пользователю
const TRANSLATABLE_FUNCTIONS = new Set([
    'alert',
    'confirm',
    'prompt',
    'toast',
]);

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
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
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            result.push(...getFiles(fullPath));
            continue;
        }

        if (
            entry.isFile() &&
            EXTENSIONS.includes(path.extname(entry.name))
        ) {
            result.push(fullPath);
        }
    }

    return result;
}

function cleanText(value) {
    return value
        .replace(/\s+/g, ' ')
        .replace(/\n/g, ' ')
        .trim();
}

function shouldTranslate(text) {
    if (!text) return false;

    const value = cleanText(text);

    if (!value) return false;

    // Не добавляем чистые числа
    if (/^\d+([.,]\d+)?$/.test(value)) {
        return false;
    }

    // Не добавляем hex цвета
    if (/^#[0-9a-f]{3,8}$/i.test(value)) {
        return false;
    }

    // Не добавляем URL
    if (/^(https?:\/\/|\/api\/|www\.)/i.test(value)) {
        return false;
    }

    // Не добавляем CSS-подобные значения
    if (
        /^[a-zA-Z0-9_-]+$/.test(value) &&
        !/[а-яёәіңғүұқөһ]/i.test(value)
    ) {
        return false;
    }

    // Нужна хотя бы одна буква
    if (!/[a-zа-яёәіңғүұқөһ]/i.test(value)) {
        return false;
    }

    return true;
}

function createHash(text) {
    return crypto
        .createHash('md5')
        .update(text)
        .digest('hex')
        .slice(0, 7);
}

function normalizeFileName(filePath) {
    return path
        .relative(path.join(ROOT, 'src'), filePath)
        .replace(/\.(jsx?|tsx?)$/, '')
        .replace(/[\\/]/g, '.')
        .replace(/[^a-zA-Z0-9_.]/g, '')
        .toLowerCase();
}

function createKey(filePath, text) {
    const fileKey = normalizeFileName(filePath);
    const hash = createHash(text);

    return `${fileKey}.${hash}`;
}

function loadJson(file) {
    if (!fs.existsSync(file)) {
        return {};
    }

    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return {};
    }
}

const translations = new Map();

function addTranslation(filePath, rawText) {
    const text = cleanText(rawText);

    if (!shouldTranslate(text)) {
        return;
    }

    const existing = [...translations.entries()].find(
        ([, item]) => item.text === text
    );

    if (existing) {
        return;
    }

    const key = createKey(filePath, text);

    translations.set(key, {
        text,
        file: path.relative(ROOT, filePath),
    });
}

function parseFile(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');

    let ast;

    try {
        ast = parse(code, {
            sourceType: 'module',

            plugins: [
                'jsx',
                'typescript',
                'classProperties',
                'objectRestSpread',
                'optionalChaining',
                'nullishCoalescingOperator',
                'topLevelAwait',
            ],
        });
    } catch (error) {
        console.error(`❌ Ошибка парсинга: ${filePath}`);
        console.error(error.message);
        return;
    }

    traverse(ast, {
        // <div>Привет</div>
        JSXText(nodePath) {
            const text = cleanText(nodePath.node.value);

            addTranslation(filePath, text);
        },

        // placeholder="Введите имя"
        JSXAttribute(nodePath) {
            const name = nodePath.node.name?.name;

            if (!TRANSLATABLE_ATTRIBUTES.has(name)) {
                return;
            }

            const value = nodePath.node.value;

            if (value?.type === 'StringLiteral') {
                addTranslation(filePath, value.value);
            }

            // placeholder={"Введите имя"}
            if (
                value?.type === 'JSXExpressionContainer' &&
                value.expression?.type === 'StringLiteral'
            ) {
                addTranslation(filePath, value.expression.value);
            }
        },

        // { title: "Сотрудники" }
        ObjectProperty(nodePath) {
            const key = nodePath.node.key;
            const value = nodePath.node.value;

            let propertyName = null;

            if (key.type === 'Identifier') {
                propertyName = key.name;
            }

            if (key.type === 'StringLiteral') {
                propertyName = key.value;
            }

            if (!TRANSLATABLE_OBJECT_KEYS.has(propertyName)) {
                return;
            }

            if (value.type === 'StringLiteral') {
                addTranslation(filePath, value.value);
            }
        },

        // alert("Ошибка")
        // confirm("Удалить сотрудника?")
        CallExpression(nodePath) {
            const callee = nodePath.node.callee;

            let functionName = null;

            if (callee.type === 'Identifier') {
                functionName = callee.name;
            }

            if (callee.type === 'MemberExpression') {
                if (callee.property?.type === 'Identifier') {
                    functionName = callee.property.name;
                }
            }

            if (!TRANSLATABLE_FUNCTIONS.has(functionName)) {
                return;
            }

            for (const arg of nodePath.node.arguments) {
                if (arg.type === 'StringLiteral') {
                    addTranslation(filePath, arg.value);
                }
            }
        },
    });
}

function sortObject(object) {
    return Object.fromEntries(
        Object.entries(object).sort(([a], [b]) =>
            a.localeCompare(b)
        )
    );
}

// MARK: Main

ensureDir(OUTPUT_DIR);

const existingRu = loadJson(RU_FILE);
const existingKk = loadJson(KK_FILE);

const files = SEARCH_DIRS.flatMap(getFiles);

console.log(`🔍 Найдено файлов: ${files.length}`);

for (const file of files) {
    parseFile(file);
}

const ru = {
    ...existingRu,
};

const kk = {
    ...existingKk,
};

for (const [key, item] of translations) {
    // Русский текст
    ru[key] ??= item.text;

    // Пока оставляем русский.
    // Потом сюда можно добавить автоматический перевод.
    kk[key] ??= item.text;
}

fs.writeFileSync(
    RU_FILE,
    JSON.stringify(sortObject(ru), null, 2) + '\n',
    'utf8'
);

fs.writeFileSync(
    KK_FILE,
    JSON.stringify(sortObject(kk), null, 2) + '\n',
    'utf8'
);

console.log('');
console.log(`✅ Найдено фраз: ${translations.size}`);
console.log(`🇷🇺 ${path.relative(ROOT, RU_FILE)}`);
console.log(`🇰🇿 ${path.relative(ROOT, KK_FILE)}`);
console.log('');
console.log(
    '⚠️ В kk.json пока записан русский текст. Его нужно перевести на казахский.'
);