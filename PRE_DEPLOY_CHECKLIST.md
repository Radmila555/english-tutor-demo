# Pre-Deploy Checklist

## Local Functionality

- [ ] Local site opens at `http://localhost:3000`.
- [ ] Frontend styles load.
- [ ] Teacher images load.
- [ ] Form quiz works through all steps.
- [ ] Form creates a test application.
- [ ] Success message appears after form submission.
- [ ] Test application appears in the admin panel.
- [ ] Application status can be changed.
- [ ] Changed status persists after page reload.
- [ ] Changed status persists after server restart.

## Repository Safety

- [ ] `.env` is not committed.
- [ ] `applications.db` is not committed.
- [ ] `*.db` files are not committed.
- [ ] Service account keys are not committed.
- [ ] Logs, build outputs, and coverage reports are ignored.

## Environment

- [ ] `ADMIN_PASSWORD` is replaced with a strong password.
- [ ] `STORAGE_DRIVER` is selected intentionally.
- [ ] For local testing, `STORAGE_DRIVER=sqlite`.
- [ ] For Yandex Cloud, `STORAGE_DRIVER=ydb`.
- [ ] `NODE_ENV=production` is set for production.

## Yandex Cloud / YDB

- [ ] YDB Serverless database is created.
- [ ] YDB endpoint is known.
- [ ] YDB database path is known.
- [ ] YDB service account is created.
- [ ] YDB credentials are stored outside the repository.
- [ ] YDB SDK installation is checked.
- [ ] YDB mode is tested with real credentials.

## Production Checks

- [ ] Production API URL is checked.
- [ ] Admin panel access is checked.
- [ ] HTTP Basic Auth works in deployed environment.
- [ ] HTTPS is configured.
- [ ] Footer disclaimer is visible.
- [ ] Demo uses only fictional/test data.
- [ ] No real personal data is used in the demo.

## Legal Readiness

- [ ] Privacy policy is prepared.
- [ ] Consent for personal data processing is prepared.
- [ ] Data storage location is legally appropriate.
- [ ] Data retention and deletion rules are documented.
