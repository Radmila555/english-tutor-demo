const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const sample = { name: 'Тест', contact: 'test@example.invalid', level: 'с нуля', goal: 'поездки', difficulty: 'боюсь говорить', preferred_time: 'вечером', demo_consent: true, website: '' };
async function start(t, env) {
  const child = spawn(process.execPath, ['-e', "require('./backend/server').createApp().then(app => { const s = app.listen(0, '127.0.0.1', () => console.log('PORT:' + s.address().port)); });"], {
    cwd: root, env: { ...process.env, ADMIN_LOGIN: '', ADMIN_PASSWORD: '', STORAGE_DRIVER: 'sqlite', ...env }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => { child.kill(); });
  const port = await new Promise((resolve, reject) => {
    let output = '', errors = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('Startup timeout: ' + errors)); }, 10000);
    child.stderr.on('data', data => { errors += data; });
    child.stdout.on('data', data => { output += data; const m = output.match(/PORT:(\d+)/); if (m) { clearTimeout(timer); resolve(m[1]); } });
    child.on('exit', code => { clearTimeout(timer); reject(new Error('Startup exited ' + code + ': ' + errors)); });
  });
  return { child, url: 'http://127.0.0.1:' + port };
}
function send(url, method, data, auth) {
  return fetch(url, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Basic ' + Buffer.from(auth).toString('base64') } : {}) }, body: data === undefined ? undefined : JSON.stringify(data) });
}

test('demo: no database, synthetic-only, read-only, validation, rate limit, assets and 404', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'english-demo-test-'));
  const db = path.join(dir, 'must-not-exist.db');
  const { url } = await start(t, { DEMO_MODE: 'true', STORAGE_DRIVER: 'ydb', DATABASE_PATH: db });
  let response = await send(url + '/api/applications', 'POST', sample);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, demo: true, application: null });
  assert.equal(fs.existsSync(db), false);
  assert.deepEqual(fs.readdirSync(dir), []);
  const records = await (await fetch(url + '/api/applications')).json();
  assert.equal(records.readOnly, true);
  assert.deepEqual(records.applications, require('../backend/demo-applications'));
  assert.equal(records.applications.length, 5);
  assert(records.applications.every(row => row.contact.endsWith('@example.invalid')));
  assert.equal((await send(url + '/api/applications/1/status', 'PATCH', { status: 'done' })).status, 403);
  assert.equal((await fetch(url + '/admin')).status, 200);
  for (const invalid of [ { ...sample, name: 'a'.repeat(81) }, { ...sample, contact: 'a'.repeat(161) }, { ...sample, name: [] }, { ...sample, level: 'B2' }, { ...sample, extra: 'x' }, { ...sample, demo_consent: 'true' }, { ...sample, website: 42 }, { ...sample, goal: null } ]) {
    assert.equal((await send(url + '/api/applications', 'POST', invalid)).status, 400);
  }
  assert.equal((await send(url + '/api/applications', 'POST', sample)).status, 200);
  response = await send(url + '/api/applications', 'POST', sample);
  assert.equal(response.status, 429);
  assert(response.headers.has('ratelimit'));
  assert(response.headers.has('retry-after'));
  for (const asset of ['/', '/style.css', '/script.js', '/admin.js', '/favicon.svg', '/foto.png', '/Foto2.png']) {
    assert.equal((await fetch(url + asset)).status, 200, asset);
  }
  response = await fetch(url + '/missing');
  assert.equal(response.status, 404);
  assert.match(await response.text(), /Страница не найдена/);
  assert.equal((await fetch(url + '/api/missing')).status, 404);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.has('x-powered-by'), false);
  assert.equal((await fetch(url + '/api/applications')).headers.get('cache-control'), 'no-store');
  const again = await start(t, { DEMO_MODE: 'true', DATABASE_PATH: db });
  assert.deepEqual((await (await fetch(again.url + '/api/applications')).json()).applications, records.applications);
  assert.deepEqual(fs.readdirSync(dir), []);
});

test('demo parser bounds and Render proxy-specific rate limit', async t => {
  const { url } = await start(t, { DEMO_MODE: 'true', RENDER: 'true' });
  assert.equal((await send(url + '/api/applications', 'POST', { ...sample, name: 'x'.repeat(10000) })).status, 413);
  assert.equal((await fetch(url + '/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
  for (let i = 0; i < 10; i++) {
    assert.equal((await fetch(url + '/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '192.0.2.1' }, body: JSON.stringify(sample) })).status, 200);
  }
  assert.equal((await fetch(url + '/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '192.0.2.1' }, body: JSON.stringify(sample) })).status, 429);
  assert.equal((await fetch(url + '/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '192.0.2.2' }, body: JSON.stringify(sample) })).status, 200);
});

test('local: explicit auth, SQLite write/read/update and restart persistence; no fallback', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'english-local-test-'));
  const databasePath = path.join(dir, 'applications.db');
  const env = { DEMO_MODE: 'false', DATABASE_PATH: databasePath, ADMIN_LOGIN: 'test-owner', ADMIN_PASSWORD: 'test-only-password' };
  const first = await start(t, env);
  const payload = { ...sample, name: '<img src=x onerror=alert(1)>', contact: "test@example.invalid'; DROP TABLE applications; --" };
  const response = await send(first.url + '/api/applications', 'POST', payload);
  assert.equal(response.status, 201);
  const application = (await response.json()).application;
  assert.equal(application.name, payload.name);
  assert.equal((await fetch(first.url + '/api/applications')).status, 401);
  assert.equal((await send(first.url + '/api/applications', 'GET', undefined, 'admin:change_me')).status, 401);
  assert.equal((await fetch(first.url + '/admin.html')).status, 401);
  assert.equal((await send(first.url + '/api/applications/' + application.id + '/status', 'PATCH', { status: 'done' }, 'test-owner:test-only-password')).status, 200);
  first.child.kill();
  await new Promise(resolve => first.child.once('exit', resolve));
  const second = await start(t, env);
  const list = await (await send(second.url + '/api/applications', 'GET', undefined, 'test-owner:test-only-password')).json();
  assert.equal(list.applications.length, 1);
  assert.equal(list.applications[0].status, 'done');
  assert.equal(list.applications[0].contact, payload.contact);
  assert.equal(list.demo, false);
  const disabled = await start(t, { DEMO_MODE: 'false', DATABASE_PATH: path.join(dir, 'disabled.db') });
  for (const route of ['/admin', '/admin.html', '/api/applications']) assert.equal((await send(disabled.url + route, 'GET', undefined, 'admin:change_me')).status, 503);
  assert.equal((await send(disabled.url + '/api/applications/1/status', 'PATCH', { status: 'done' }, 'admin:change_me')).status, 503);
});

test('admin renderer keeps malicious HTML as literal text', () => {
  const elements = new Map();
  function element(tag) {
    return { tag, children: [], classList: { add() {}, remove() {}, toggle() {} },
      set textContent(value) { this.text = value; this.children = []; }, get textContent() { return this.text; },
      set innerHTML(_) { throw new Error('Unsafe HTML rendering'); },
      append(...children) { this.children.push(...children); }, replaceChildren() { this.children = []; }, setAttribute() {}, addEventListener() {} };
  }
  const context = vm.createContext({ document: { querySelector: key => { if (!elements.has(key)) elements.set(key, element('container')); return elements.get(key); }, querySelectorAll: () => [], createElement: element }, Intl, URL, location: { origin: 'http://localhost' } });
  const script = fs.readFileSync(path.join(root, 'frontend/admin.js'), 'utf8').replace(/loadApplications\(\);\s*$/, '');
  vm.runInContext(script, context);
  const hostile = '<img src=x onerror=alert(1)>';
  context.hostile = hostile;
  vm.runInContext("applications = [{ id: 1, name: hostile, contact: hostile, status: 'new', created_at: '2026-01-10T09:00:00Z' }]; readOnly = true; renderApplications();", context);
  const row = elements.get('#applicationsTableBody').children[0];
  assert.equal(row.children[2].textContent, hostile);
  assert.equal(row.children[2].children.length, 0);
  assert.equal(row.children[3].textContent, hostile);
  assert.equal(row.children[8].children.length, 0); // read-only has no select
});

test('all string limits/types and select whitelists match the existing form', () => {
  const { validateApplicationPayload } = require('../backend/server');
  const limits = { name: 80, contact: 160, level: 40, goal: 40, difficulty: 80, preferred_time: 40, website: 200 };
  for (const [field, limit] of Object.entries(limits)) {
    for (const value of [42, null, [], {}, false, 'x'.repeat(limit + 1)]) assert(validateApplicationPayload({ ...sample, [field]: value }).error, field);
  }
  for (const field of ['level', 'goal', 'difficulty', 'preferred_time']) {
    const html = fs.readFileSync(path.join(root, 'frontend/index.html'), 'utf8');
    const block = html.match(new RegExp('<select id="' + field + '"[\\s\\S]*?</select>'))[0];
    for (const match of block.matchAll(/<option value="([^"]+)"/g)) assert(validateApplicationPayload({ ...sample, [field]: match[1] }).application, field + ': ' + match[1]);
    assert(validateApplicationPayload({ ...sample, [field]: 'unexpected' }).error);
  }
  for (const value of [null, [], 'text', {}, { ...sample, contact: '' }]) assert(validateApplicationPayload(value).error);
});
