# English Tutor — заявка на пробное занятие

## Public demo (current)

Set `DEMO_MODE=true`, `NODE_ENV=production`, `HOST=0.0.0.0` and run `npm start`.
Install with `npm ci --omit=dev --omit=optional`. Node target is 22.x.

Public demo never loads a database driver, stores submitted form data, or appends
it to the five fixed synthetic admin records. `/admin` is public and read-only;
PATCH returns 403. Submitted contacts are not logged by the application.
Only enter fictional data; the hosting provider may retain technical access logs.

Local mode: `DEMO_MODE=false`. SQLite and Basic Auth remain available. Set your
own `ADMIN_LOGIN` and `ADMIN_PASSWORD`; blank credentials disable admin access
with 503. `.env.example` contains blank placeholders. No fallback credentials.

POST accepts JSON, rejects unknown fields/types/options, and limits requests to
8 KB and 10 submissions per IP per 15 minutes. Field lengths: name 80, contact
160, level/goal/preferred_time 40, difficulty 80, website 200. Consent must be
boolean true. Rate limiting is in-memory and resets on process restart. Render's
single final proxy hop is trusted only when `RENDER=true`.

Run `npm test`, `npm audit`, and `npm audit --omit=dev --omit=optional`.
Tests use temporary databases outside the project; existing local data is kept.
YDB remains optional: `npm ci --include=optional` for local YDB testing.

Render Free Web Service: Build `npm ci --omit=dev --omit=optional`; Start
`npm start`; Node from `.node-version`; environment as above. Render supplies
PORT. No disk, DATABASE_PATH, admin credentials or YDB credentials are needed.
No deployment has been performed. Portrait provenance is documented in ASSETS.md.

The older local/Yandex notes below describe the non-demo storage workflow.

Портфолио-кейс: рабочий локальный прототип мини-сайта репетитора английского
языка. В проекте есть frontend-лендинг, форма-квиз для заявки на пробное
занятие, backend на Express, сохранение заявок в SQLite и простая админ-панель
для просмотра и изменения статусов.

Материалы кейса:

- [описание кейса](./portfolio-assets/case-description.md);
- [скриншоты](./portfolio-assets/screenshots/);
- [видео-демонстрация](./portfolio-assets/video/english-tutor-demo.webm).

Демо-проект для портфолио: мини-сайт репетитора английского языка с формой
заявки на пробное занятие, Express backend, SQLite/YDB storage-слоем и простой
админ-панелью.

## Что умеет проект

- показывает лендинг преподавателя английского языка;
- отправляет заявку из формы-квиза на backend;
- сохраняет тестовые заявки через единый storage-слой;
- в локальном режиме использует SQLite;
- в облачном режиме подготовлен для YDB Serverless;
- показывает заявки в защищённой админ-панели;
- позволяет менять статус заявки: `новая`, `связаться`, `обработана`;
- фильтрует заявки в админке по статусу.

## Проверенный локальный сценарий

Локальная версия проекта проверена. Работает цепочка:

сайт → форма заявки → backend → SQLite-база → админка

Проверенный сценарий:

1. Запустить сервер.
2. Открыть главную страницу: [http://localhost:3000](http://localhost:3000/)
3. Заполнить форму заявки тестовыми данными.
4. Отправить заявку.
5. Убедиться, что на сайте появилось сообщение об успешной отправке.
6. Открыть админку: [http://localhost:3000/admin](http://localhost:3000/admin)
7. Войти в админку:
   login: <ADMIN_LOGIN>
   password: <set-your-local-password>
8. Убедиться, что новая заявка появилась в списке.
9. Изменить статус заявки.
10. Перезапустить сервер.
11. Убедиться, что заявка и изменённый статус сохранились.

## Что уже работает

- frontend-лендинг;
- форма-квиз на 3 шага;
- отправка заявки через `POST /api/applications`;
- сохранение заявки в SQLite;
- просмотр заявок в админке;
- Basic Auth для админки;
- изменение статуса заявки;
- сохранение данных после перезапуска сервера;
- локальный режим `STORAGE_DRIVER=sqlite`.

## Важно для проверки

Сайт нужно открывать через:

[http://localhost:3000](http://localhost:3000/)

Не открывать `frontend/index.html` двойным кликом как `file://`, потому что в
этом случае форма может не работать с backend.

Если заявка не видна в админке:

- обновить страницу админки через `Ctrl+F5`;
- проверить, что выбран фильтр “все” или “новые”;
- проверить, что сервер запущен;
- проверить, что сайт открыт через [http://localhost:3000](http://localhost:3000/).

## Тестовые данные

Проект является демо-кейсом для портфолио. В форму нужно вводить только
тестовые вымышленные данные. Проект не предназначен для сбора реальных
персональных данных без доработки юридических документов и размещения в
подходящем российском контуре хранения данных.

## Текущий статус проекта

Frontend — готов и проверен локально.
Backend — готов и проверен локально.
SQLite-режим — готов и проверен локально.
Админка — готова и проверена локально.
YDB-режим — подготовлен кодом, но не проверен с реальными YDB credentials.
Деплой в Yandex Cloud — не выполнялся.

## Установка

```bash
npm install
```

Создайте `.env` на основе `.env.example`:

```bash
copy .env.example .env
```

Для macOS/Linux:

```bash
cp .env.example .env
```

## Режим 1: локально с SQLite

В `.env`:

```text
PORT=3000
ADMIN_LOGIN=<set-your-local-login>
ADMIN_PASSWORD=<set-your-local-password>
STORAGE_DRIVER=sqlite
DATABASE_PATH=./applications.db
```

Запуск:

```bash
npm start
```

Главная страница:

```text
http://localhost:3000
```

Админ-панель:

```text
http://localhost:3000/admin
```

SQLite-база хранится по пути из `DATABASE_PATH`. Если путь не менять, файл
`applications.db` появится в корне проекта.

## Режим 2: Yandex Cloud с YDB Serverless

Этот режим подготовлен технически, но деплой в Yandex Cloud в текущем этапе не
выполнялся.

В `.env` или переменных окружения облачной среды:

```text
PORT=3000
ADMIN_LOGIN=<set-your-local-login>
ADMIN_PASSWORD=<set-your-local-password>
STORAGE_DRIVER=ydb
YDB_ENDPOINT=grpcs://ydb.serverless.yandexcloud.net:2135
YDB_DATABASE=/ru-central1/your-cloud/your-database
YDB_SERVICE_ACCOUNT_KEY_FILE=/path/to/authorized_key.json
```

Также поддерживается официальное имя переменной YDB SDK:

```text
YDB_SERVICE_ACCOUNT_KEY_FILE_CREDENTIALS=/path/to/authorized_key.json
```

Если удобнее передать полную строку подключения, можно использовать:

```text
YDB_CONNECTION_STRING=grpcs://ydb.serverless.yandexcloud.net:2135/ru-central1/your-cloud/your-database
```

Для YDB-режима нужны пакеты:

```bash
npm install @ydbjs/core @ydbjs/query @ydbjs/auth-yandex-cloud
```

Они указаны в `optionalDependencies`, чтобы локальный SQLite-режим не ломался,
если YDB SDK не установлен. В текущей локальной проверке установка YDB SDK
прерывалась из-за сетевой ошибки npm `ECONNRESET`, поэтому YDB-подключение
нужно проверить отдельно при стабильной сети или в облачной сборке.

## Как отправить тестовую заявку

1. Откройте `http://localhost:3000`.
2. Нажмите `Подобрать формат пробного занятия`.
3. Пройдите 3 шага формы-квиза.
4. Подтвердите чекбокс про тестовые данные.
5. Нажмите `Забронировать пробное занятие`.
6. После успешной отправки появится карточка `Заявка принята`.

## Как проверить админку

1. Откройте `http://localhost:3000/admin`.
2. Введите логин и пароль из `.env`.
3. Проверьте, что заявка появилась в таблице.
4. Измените статус в select.
5. Обновите страницу или перезапустите сервер и проверьте, что статус сохранился.

## Как изменить логин и пароль админки

Откройте `.env` и поменяйте:

```text
ADMIN_LOGIN=<set-your-local-login>
ADMIN_PASSWORD=<set-your-local-password>
```

После изменения перезапустите сервер.

## API

```text
POST /api/applications
GET /api/applications
PATCH /api/applications/:id/status
```

`GET /api/applications`, `PATCH /api/applications/:id/status`, `/admin` и
`/admin.html` защищены HTTP Basic Auth.

## Storage-слой

Backend не зависит от конкретной базы напрямую. Общий интерфейс:

```text
initDatabase()
createApplication(data)
getApplications()
updateApplicationStatus(id, status)
```

Файлы:

```text
backend/database.js
backend/database.sqlite.js
backend/database.ydb.js
```

`backend/database.js` выбирает драйвер по `STORAGE_DRIVER`.

## Важное ограничение

Этот проект является демо-кейсом для портфолио. Все данные вымышлены. Проект
не является сайтом реального преподавателя и не предназначен для сбора реальных
персональных данных. Для реального использования потребуется добавить политику
обработки персональных данных, согласие на обработку персональных данных,
настроить безопасное хранение заявок и разместить проект в подходящем
российском контуре хранения данных.
