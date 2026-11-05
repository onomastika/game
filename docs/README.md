# Клавиши. — Keyboard Choice Lab

Первая интерактивная версия сайта по выбору музыкальных клавиатур. Отдельная ветка `keyboard-choice-lab`, **не затрагивает `main`** основного репозитория.

## Содержимое ветки

- `docs/index.html` — целиком автономный готовый сайт, CSS/JS/11 моделей встроены, внешних зависимостей нет.
- `docs/wrangler.jsonc` — конфигурация публикации Cloudflare Workers Static Assets.
- `package.json` — команды деплоя.

## Локально

```sh
python3 -m http.server 8787 -d docs
```

## Cloudflare Workers

В Cloudflare Workers & Pages → Create application → GitHub выбери репозиторий `onomastika/game`, ветку `keyboard-choice-lab` (если UI поддерживает выбор production branch), Root Directory `docs`. Build Command пустой, Deploy Command `npx wrangler deploy`. Worker Name: `keyboard-choice-lab` (совпадает с `wrangler.jsonc`). Assets Directory: `.`.

Cloudflare потребует разрешение на доступ к GitHub и проверку этой ветки. Никакие Cloudflare API-токены в GitHub добавлять не нужно при нативном подключении через Workers Builds.

## Важно

Это исследовательский срез моделей/цен на 06.11.2026, не живой каталог остатков. Для MIDI-контроллеров нужен компьютер/внешний источник звука, встроенное звучание не подразумевается автоматически. Приложение сохраняет выбор локально в браузере, без серверной базы.

## Полные исходники и тесты

Архив `keyboard-choice-lab-site.zip` из беседы содержит модульную версию: `public/app.js`, `public/styles.css`, `public/engine.js`, `public/catalog.json`, тесты на Node.js и исходную конфигурацию. Отдельная ветка предназначена для простого деплоя без сборки.