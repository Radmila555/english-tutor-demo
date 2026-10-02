const path = require('path');
const express = require('express');
const { rateLimit } = require('express-rate-limit');
require('dotenv').config();
const demoApplications = require('./demo-applications');
const frontendDir = path.resolve(__dirname, '../frontend');
const STATUSES = new Set(['new', 'contact', 'done']);
const OPTIONS = {
  level: ['с нуля', 'немного знаю', 'хочу повторить'],
  goal: ['работа', 'поездки', 'общение', 'для себя', 'другое'],
  difficulty: ['боюсь говорить', 'не понимаю грамматику', 'забываю слова', 'не понимаю на слух', 'не знаю, с чего начать'],
  preferred_time: ['утром', 'днём', 'вечером', 'в выходные', 'другое'],
};
const LIMITS = { name: 80, contact: 160, level: 40, goal: 40, difficulty: 80, preferred_time: 40, website: 200 };
const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const fail = (res, status, error) => res.status(status).json({ success: false, error });
function validateApplicationPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { error: 'Ожидается объект заявки.' };
  const allowed = new Set([...Object.keys(LIMITS), 'demo_consent']);
  if (Object.keys(payload).some((key) => !allowed.has(key))) return { error: 'Неизвестные поля заявки.' };
  const application = {};
  for (const [field, maxLength] of Object.entries(LIMITS)) {
    const value = field === 'website' && payload[field] === undefined ? '' : payload[field];
    if (typeof value !== 'string' || value.length > maxLength) return { error: `Некорректное поле: ${field}. Максимум ${maxLength} символов.` };
    application[field] = value.trim();
    if (field !== 'website' && !application[field]) return { error: `Заполните поле: ${field}.` };
    if (OPTIONS[field] && !OPTIONS[field].includes(application[field])) return { error: `Недопустимый вариант: ${field}.` };
  }
  if (payload.demo_consent !== true) return { error: 'Подтвердите отправку только тестовых данных (demo_consent: true).' };
  if (application.website) return { ignored: true };
  delete application.website;
  application.demo_consent = 1;
  return { application };
}
async function createApp(env = process.env) {
  const demoMode = env.DEMO_MODE === 'true';
  // Public demo never loads or initializes a database driver.
  const db = demoMode ? null : await require('./database').initDatabase();
  const app = express();
  app.disable('x-powered-by');
  // Render provides the final client-IP hop; never trust the entire proxy chain.
  if (env.RENDER === 'true') app.set('trust proxy', 1);
  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' });
    if (req.path.startsWith('/api/') || req.path.startsWith('/admin')) res.set('Cache-Control', 'no-store');
    next();
  });
  const postLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { success: false, error: 'Слишком много заявок. Попробуйте через 15 минут.' } });
  app.use('/api/applications', (req, res, next) => req.method === 'POST' ? postLimiter(req, res, next) : next());
  app.use(express.json({ limit: '8kb' }));
  function requireAdminAuth(req, res, next) {
    if (demoMode) return next();
    if (!env.ADMIN_LOGIN || !env.ADMIN_PASSWORD) return fail(res, 503, 'Доступ администратора не настроен.');
    const [scheme, encoded] = (req.headers.authorization || '').split(' ');
    const decoded = scheme === 'Basic' && encoded ? Buffer.from(encoded, 'base64').toString('utf8') : '';
    const split = decoded.indexOf(':');
    if (split < 0 || decoded.slice(0, split) !== env.ADMIN_LOGIN || decoded.slice(split + 1) !== env.ADMIN_PASSWORD) {
      res.set('WWW-Authenticate', 'Basic realm="English Tutor Admin"');
      return fail(res, 401, 'Требуется логин и пароль администратора.');
    }
    next();
  }
  app.get(['/admin', '/admin.html'], requireAdminAuth, (req, res) => res.sendFile(path.join(frontendDir, 'admin.html')));
  app.get(['/foto.png', '/Foto2.png'], (req, res) => res.sendFile(path.resolve(__dirname, '..', req.path.slice(1))));
  app.post('/api/applications', asyncHandler(async (req, res) => {
    const validation = validateApplicationPayload(req.body);
    if (validation.error) return fail(res, 400, validation.error);
    if (validation.ignored) return res.json({ success: true, demo: demoMode, ignored: true, application: null });
    if (demoMode) return res.json({ success: true, demo: true, application: null });
    const application = await db.createApplication({ ...validation.application, status: 'new', created_at: new Date().toISOString() });
    res.status(201).json({ success: true, demo: false, application });
  }));
  app.get('/api/applications', requireAdminAuth, asyncHandler(async (req, res) => {
    res.json({ success: true, demo: demoMode, readOnly: demoMode, applications: demoMode ? demoApplications : await db.getApplications() });
  }));
  app.patch('/api/applications/:id/status', (req, res, next) => {
    if (demoMode) return fail(res, 403, 'Демо-панель доступна только для просмотра.');
    requireAdminAuth(req, res, next);
  }, asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) return fail(res, 400, 'Некорректный ID заявки.');
    if (!req.body || Object.keys(req.body).length !== 1 || !STATUSES.has(req.body.status)) return fail(res, 400, 'Некорректный статус заявки.');
    const application = await db.updateApplicationStatus(id, req.body.status);
    if (!application) return fail(res, 404, 'Заявка не найдена.');
    res.json({ success: true, application });
  }));
  app.use(express.static(frontendDir));
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) return fail(res, 404, 'API-метод не найден.');
    res.status(404).sendFile(path.join(frontendDir, '404.html'));
  });
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    // Never log request bodies or parser errors containing submitted contacts.
    const status = error.status === 413 ? 413 : error.status === 400 ? 400 : 500;
    fail(res, status, status === 413 ? 'Слишком большой запрос.' : status === 400 ? 'Некорректный JSON.' : 'Внутренняя ошибка сервера.');
  });
  return app;
}
if (require.main === module) {
  createApp().then((app) => app.listen(Number(process.env.PORT) || 3000, process.env.HOST || '127.0.0.1', () => {
    console.log(`English Tutor: http://localhost:${Number(process.env.PORT) || 3000} (${process.env.DEMO_MODE === 'true' ? 'demo, no database' : 'local storage'})`);
  })).catch(() => { console.error('Server initialization failed. Check storage configuration.'); process.exitCode = 1; });
}
module.exports = { createApp, validateApplicationPayload };
