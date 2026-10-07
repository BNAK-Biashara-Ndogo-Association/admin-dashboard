import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

function service(fetch, storage = new Map()) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL('../src/services/emailService.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const sessionStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) };
  new Function('crypto', 'sessionStorage', 'fetch', 'module', 'exports', code)(webcrypto, sessionStorage, fetch, module, module.exports);
  return module.exports;
}

test('email requests use administrator routes, session credentials and the same retry key', async () => {
  let captured;
  const { emailService } = service(async (url, init) => { captured = { url, ...init }; return new Response(JSON.stringify({ delivery: { status: 'accepted' } })); });
  const body = { userId: 'member', recipient: 'member@example.com' };
  await emailService.send('certificate', body, 'same-request-key');
  assert.equal(captured.url, '/api/admin/email/certificate');
  assert.equal(captured.credentials, 'same-origin');
  assert.equal(captured.headers['Idempotency-Key'], 'same-request-key');
  assert.deepEqual(JSON.parse(captured.body), body);
  await emailService.history();
  assert.equal(captured.url, '/api/admin/email/history');
  assert.equal(captured.method, undefined);
  const failed = service(async () => new Response(JSON.stringify({ message: 'Certificates require active membership.' }), { status: 409 }));
  await assert.rejects(failed.emailService.send('certificate', body, 'key'), /active membership/);
});

test('draft keys survive reload, change with content and persist no recipient or message text', async () => {
  const storage = new Map();
  const body = { recipients: ['private@example.com'], subject: 'Private event', message: 'Private message' };
  const first = service(null, storage);
  const key = await first.emailRequestKey('event', body);
  const reloaded = service(null, storage);
  assert.equal(await reloaded.emailRequestKey('event', body), key);
  assert.notEqual(await reloaded.emailRequestKey('event', { ...body, message: 'Another message' }), key);
  assert.notEqual(await reloaded.emailRequestKey('certificate', body), key);
  const saved = JSON.stringify([...storage]);
  assert.equal(saved.includes('private@example.com'), false);
  assert.equal(saved.includes('Private message'), false);
});
