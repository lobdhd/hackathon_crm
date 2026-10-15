#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

for script in extract-i18n.mjs replace-i18n-safe.mjs make-i18n-reactive.mjs; do
  if [[ ! -f "scripts/$script" ]]; then
    echo "Ошибка: scripts/$script не найден" >&2
    exit 1
  fi
done
if [[ ! -f package.json || ! -d node_modules ]]; then
  echo 'Запускай из проекта с установленными npm-зависимостями (npm ci).' >&2
  exit 1
fi

BACKUP="/tmp/hackathon_crm_i18n_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf "$BACKUP" src scripts
printf '\nРезервная копия: %s\n' "$BACKUP"
printf '\n=== 1. Извлечение новых фраз ===\n'
node scripts/extract-i18n.mjs
printf '\n=== 2. Предпросмотр замен ===\n'
node scripts/replace-i18n-safe.mjs
printf '\n=== 3. Применение безопасных замен ===\n'
node scripts/replace-i18n-safe.mjs --write
printf '\n=== 4. Проверка реактивности ===\n'
node scripts/make-i18n-reactive.mjs
printf '\n=== 5. Добавление реактивности ===\n'
node scripts/make-i18n-reactive.mjs --write
printf '\n=== 6. Проверка сборки ===\n'
npm run build
printf '\n=== 7. Сводка по переводам ===\n'
node scripts/audit-i18n-kk.mjs
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git diff --check
  git diff --stat
fi
printf '\nГотово. Проверь обновлённый ru.json/kk.json, изменения git diff и переключение языка в браузере.\n'
