# Deploy to Yandex Cloud: Serverless Containers + YDB Serverless

Эта инструкция готовит будущий тестовый деплой проекта English Tutor в Yandex Cloud. На текущем этапе деплой не выполнялся, ресурсы в Yandex Cloud не создавались, реальные credentials не использовались.

Целевая схема:

- один Yandex Serverless Container запускает Express-приложение;
- Express раздаёт `frontend/` как static;
- этот же контейнер обслуживает `/admin` и `/api/applications`;
- production-хранилище заявок — YDB Serverless;
- локальная разработка остаётся на SQLite.

## Готовность проекта к контейнеру

Проект подходит для запуска в Serverless Containers:

- `npm start` запускает `node backend/server.js`;
- сервер берёт порт из `process.env.PORT`;
- frontend раздаётся Express-сервером как static;
- `/admin`, `/admin.html`, `/api/applications` обслуживаются тем же приложением;
- storage-слой выбирается через `STORAGE_DRIVER`;
- YDB SDK загружается только при `STORAGE_DRIVER=ydb`, поэтому SQLite-режим не зависит от YDB.

## Локальная проверка Docker-образа

Эти команды нужны только для проверки образа на компьютере. Они не деплоят проект в Yandex Cloud.

```bash
docker build -t english-tutor-demo:local .
```

Проверка SQLite-режима внутри контейнера:

```bash
docker run --rm -p 8080:8080 \
  -e NODE_ENV=production \
  -e PORT=8080 \
  -e STORAGE_DRIVER=sqlite \
  -e DATABASE_PATH=/tmp/applications.db \
  -e ADMIN_LOGIN=<set-your-local-login> \
  -e ADMIN_PASSWORD=<set-your-local-password> \
  english-tutor-demo:local
```

После запуска открыть:

```text
http://localhost:8080
http://localhost:8080/admin
```

## Production env

Пример production-переменных лежит в `.env.production.example`.

Для Yandex Cloud нужны:

```text
NODE_ENV=production
PORT=8080
STORAGE_DRIVER=ydb
ADMIN_LOGIN=<set-your-local-login>
ADMIN_PASSWORD=change_to_strong_password
YDB_ENDPOINT=
YDB_DATABASE=
YDB_SERVICE_ACCOUNT_KEY_FILE=
YDB_SERVICE_ACCOUNT_KEY_FILE_CREDENTIALS=
```

`PORT` в Serverless Containers задаётся средой выполнения. В Dockerfile указан `8080` как локальный дефолт для проверки.

Важно: текущий YDB-драйвер ожидает путь к authorized key JSON в `YDB_SERVICE_ACCOUNT_KEY_FILE` или `YDB_SERVICE_ACCOUNT_KEY_FILE_CREDENTIALS`. Реальный ключ нельзя коммитить и нельзя добавлять в Docker image. Перед production-деплоем лучше использовать безопасную передачу секрета, например через механизм секретов/переменных среды Yandex Cloud, либо доработать драйвер на авторизацию через service account metadata, если выбранный runtime это поддерживает.

## Этап 1. Что сделать руками в Yandex Cloud

1. Войти в Yandex Cloud Console и выбрать нужный аккаунт.
2. Создать отдельный каталог/folder для демо, например `english-tutor-demo`.
3. Подключить платёжный аккаунт.
4. Включить бюджет и уведомления о расходах.
5. Создать YDB Serverless database:
   - тип базы: Serverless;
   - сохранить endpoint;
   - сохранить database path.
6. Создать service account для приложения, например `english-tutor-app-sa`.
7. Выдать service account права на YDB database. Минимальный набор нужно уточнить в актуальной роли YDB; для тестового демо можно начать с роли, разрешающей чтение/запись в YDB, и затем сузить доступ.
8. Создать Container Registry, например `english-tutor-registry`.
9. Создать Serverless Container, например `english-tutor-container`.
10. Настроить публичный доступ к контейнеру только для демо/test-режима.

## Этап 2. CLI-команды

Команды ниже являются шаблоном. Значения в угловых скобках нужно заменить на реальные ID и URL из Yandex Cloud.

Проверить yc CLI:

```bash
yc version
yc init
yc config list
```

Выбрать cloud и folder:

```bash
yc resource-manager cloud list
yc resource-manager folder list
yc config set cloud-id <CLOUD_ID>
yc config set folder-id <FOLDER_ID>
```

Создать Container Registry, если он ещё не создан:

```bash
yc container registry create english-tutor-registry
yc container registry list
```

Настроить Docker для Yandex Container Registry:

```bash
yc container registry configure-docker
```

Собрать Docker image:

```bash
docker build -t cr.yandex/<REGISTRY_ID>/english-tutor:demo .
```

Загрузить image в Container Registry:

```bash
docker push cr.yandex/<REGISTRY_ID>/english-tutor:demo
```

Создать Serverless Container, если он ещё не создан:

```bash
yc serverless container create english-tutor-container
```

Создать новую revision контейнера:

```bash
yc serverless container revision deploy \
  --container-name english-tutor-container \
  --image cr.yandex/<REGISTRY_ID>/english-tutor:demo \
  --cores 1 \
  --memory 512MB \
  --execution-timeout 30s \
  --concurrency 4 \
  --service-account-id <SERVICE_ACCOUNT_ID> \
  --environment NODE_ENV=production,STORAGE_DRIVER=ydb,ADMIN_LOGIN=<set-your-local-login>,ADMIN_PASSWORD=<STRONG_ADMIN_PASSWORD>,YDB_ENDPOINT=<YDB_ENDPOINT>,YDB_DATABASE=<YDB_DATABASE>,YDB_SERVICE_ACCOUNT_KEY_FILE=<PATH_TO_KEY_INSIDE_RUNTIME>
```

Разрешить публичный вызов контейнера для демо/test:

```bash
yc serverless container allow-unauthenticated-invoke english-tutor-container
```

Получить данные контейнера и публичный URL:

```bash
yc serverless container get english-tutor-container
```

## Этап 3. Проверка после деплоя

1. Открыть публичный URL контейнера.
2. Проверить главную страницу.
3. Нажать `Подобрать формат пробного занятия`.
4. Отправить тестовую вымышленную заявку.
5. Убедиться, что появилась карточка `Заявка принята`.
6. Открыть `/admin`.
7. Войти с production-логином и production-паролем.
8. Проверить, что заявка появилась в админке.
9. Изменить статус заявки на `связаться` или `обработана`.
10. Обновить страницу админки и убедиться, что статус сохранился.

## Предупреждения

- Не использовать реальные персональные данные в демо.
- Не коммитить `.env`.
- Не коммитить service account keys.
- Не добавлять ключи и секреты в Docker image.
- Заменить `ADMIN_PASSWORD` на сильный пароль перед тестовым деплоем.
- YDB-режим подготовлен кодом, но не считается проверенным до запуска с реальными YDB credentials.
- Первый деплой делать как demo/test, с бюджетом и уведомлениями о расходах.
- Перед реальным сбором персональных данных нужны юридические документы и подходящий российский контур хранения данных.

## Полезные официальные ссылки

- Serverless Containers quickstart: https://yandex.cloud/en/docs/serverless-containers/quickstart/container
- Runtime environment and `PORT`: https://yandex.cloud/en/docs/serverless-containers/concepts/runtime
- Container revision deploy CLI: https://yandex.cloud/en/docs/cli/cli-ref/serverless/cli-ref/container/revision/deploy
- Container environment variables: https://yandex.cloud/en/docs/serverless-containers/operations/environment-variables-add
- Container Registry quickstart: https://yandex.cloud/en/docs/container-registry/quickstart/
- YDB access bindings: https://yandex.cloud/en/docs/ydb/operations/manage-databases
