# Deployment Notes

## Current Status

The project is a working local portfolio demo:

- frontend landing page and admin UI are implemented;
- Express backend is implemented;
- SQLite mode is working locally;
- admin routes and admin application API are protected with HTTP Basic Auth;
- storage abstraction exists for `sqlite` and future `ydb` modes;
- the project has not been deployed to Yandex Cloud.

## Local Verification Record

Локальная проверка выполнена. Цепочка сайт → форма → backend → SQLite → админка
работает. Данные сохраняются после перезапуска сервера.

## Local Run With SQLite

Use SQLite for local development and portfolio demonstration on a computer.

Environment:

```text
NODE_ENV=development
PORT=3000
STORAGE_DRIVER=sqlite
ADMIN_LOGIN=<set-your-local-login>
ADMIN_PASSWORD=<set-your-local-password>
DATABASE_PATH=./applications.db
```

Install and run:

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000
http://localhost:3000/admin
```

## How To Check The Form

1. Open `http://localhost:3000`.
2. Click `Подобрать формат пробного занятия`.
3. Fill all 3 quiz steps with test data.
4. Confirm that only test data is being sent.
5. Submit the form.
6. Check that the success card appears.
7. Check that a new record exists in `applications.db`.

## How To Check The Admin Panel

1. Open `http://localhost:3000/admin`.
2. Log in with `ADMIN_LOGIN` and `ADMIN_PASSWORD`.
3. Check that applications are shown in the table.
4. Change an application status.
5. Reload the page and confirm the status is still changed.
6. Restart the server and confirm the status is still saved.

## SQLite Notes

SQLite is suitable for:

- local development;
- local portfolio demonstration;
- a simple VPS demo with low traffic and careful backups.

SQLite is not the recommended primary storage for Yandex Cloud Serverless or
multi-instance production deployment.

## Yandex Cloud And YDB Serverless

For Yandex Cloud production-style hosting, use YDB Serverless:

```text
NODE_ENV=production
STORAGE_DRIVER=ydb
YDB_ENDPOINT=
YDB_DATABASE=
YDB_SERVICE_ACCOUNT_KEY_FILE=
YDB_SERVICE_ACCOUNT_KEY_FILE_CREDENTIALS=
```

`YDB_SERVICE_ACCOUNT_KEY_FILE` and `YDB_SERVICE_ACCOUNT_KEY_FILE_CREDENTIALS`
are both supported by the project. Use one safe authentication method and keep
real credentials outside the repository.

The YDB driver is prepared in `backend/database.ydb.js`, but it still requires
testing with real Yandex Cloud credentials and a real YDB Serverless database.

## YDB SDK

YDB mode requires:

```bash
npm install @ydbjs/core @ydbjs/query @ydbjs/auth-yandex-cloud
```

These packages are listed as optional dependencies so SQLite mode can keep
working even when YDB packages are not installed locally.

## Image Paths

Current image files are in the project root:

```text
foto.png
Foto2.png
```

`frontend/index.html` references them as:

```text
../foto.png
../Foto2.png
```

The Express server also exposes:

```text
/foto.png
/Foto2.png
```

This works locally. For a cleaner production layout, consider moving images to:

```text
frontend/assets/foto.png
frontend/assets/Foto2.png
```

Then update `frontend/index.html` to use:

```text
./assets/foto.png
./assets/Foto2.png
```

Do this only after visual approval, because it changes asset organization.

## Security Notes

- Do not commit `.env`.
- Do not commit service account keys.
- Replace `ADMIN_PASSWORD` before any public deployment.
- Keep admin access behind HTTPS.
- Consider stronger admin authentication before real production use.
- Add rate limiting and request size controls before public traffic.

## Personal Data And Legal Notes

This project is a portfolio demo. It is not ready for collecting real personal
data.

Before real use, add:

- privacy policy;
- personal data processing consent;
- clear data retention rules;
- secure storage and backup policy;
- hosting in an appropriate Russian data storage contour.
