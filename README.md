# DedTimon / Дед Тимон

Личное портфолио Артёма: 3D, моушн-дизайн, графика и разработка.
Публичный адрес: https://dedt1mon.github.io

Сайт остаётся обычным HTML/CSS/JavaScript. Для посетителя нет зависимостей,
сборки, авторизации, форм отправки данных или аналитики.

## Локальный просмотр

Нужен Node.js версии из `.node-version`:

```sh
node tools/serve.cjs
```

Откройте http://127.0.0.1:8765. Preview доступен только на этом компьютере.
Открытие HTML через `file://` не заменяет HTTP-проверку.

## Проверки

Тестовые зависимости закреплены в `package.json` и `pnpm-lock.yaml`:

```sh
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile --ignore-scripts
pnpm exec playwright install chromium
pnpm check
pnpm test:browser
```

`pnpm check` использует Python 3.13+ без сторонних Python-пакетов.
Browser-проверка сама поднимает loopback-сервер и закрывает браузер/сервер.
Полные результаты и screenshots находятся в исключённой из Git папке
`test-results/`. В CI они публикуются как artifact для точного PR head SHA.

## Публикация

Существующая GitHub Pages публикация остаётся из `main`. CI в этом PR только
проверяет сайт и **не публикует** его. Merge в `main` может запустить штатную
Pages publication, поэтому выполняется только после подтверждения владельца.
Отдельный домен не требуется. `_config.yml` исключает тесты, документацию и
dev-зависимости из опубликованного сайта.

Контракт и критерии: [docs/project-contract.md](docs/project-contract.md).
Индексация: [docs/google-search-console.md](docs/google-search-console.md).
Результаты: [docs/validation.md](docs/validation.md).

Оригиналы работ остаются в `img/portfolio/`. `img/optimized/` содержит только
уменьшенные WebP-копии для карточек и thumbnails; они не заменяют оригиналы.
