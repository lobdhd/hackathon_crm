import fs from 'node:fs';
const ru = JSON.parse(fs.readFileSync('src/locales/ru.json', 'utf8'));
const kk = JSON.parse(fs.readFileSync('src/locales/kk.json', 'utf8'));
const keys = Object.keys(ru);
const missing = keys.filter((key) => typeof kk[key] !== 'string' || !kk[key].trim());
const likelyUntranslated = keys.filter((key) => {
    const value = ru[key];
    return typeof value === 'string' && /[А-Яа-яЁё]/.test(value) && kk[key] === value;
});
console.log(`RU-ключей: ${keys.length}; KK-ключей: ${Object.keys(kk).length}`);
console.log(`Отсутствующих значений KK: ${missing.length}`);
console.log(`Совпадают с русским (нужна проверка): ${likelyUntranslated.length}`);
for (const key of likelyUntranslated) console.log(`  ${key}: ${ru[key]}`);
console.log('Совпадения могут быть названиями и именами. Скрипт ничего не переводит и не изменяет.');
if (missing.length) process.exitCode = 1;
