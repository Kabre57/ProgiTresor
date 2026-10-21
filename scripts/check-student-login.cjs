const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'apps/frontend/node_modules/typescript'));
const bcrypt = require(path.join(root, 'apps/services/auth-service/node_modules/bcryptjs'));
const serviceRoot = 'apps/services/auth-service/src/';

function load(file, mocks, extra = {}) {
  const { outputText } = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const context = { exports: {}, Response, AbortSignal, console, ...extra, require(name) {
    if (name in mocks) return mocks[name];
    throw new Error('Unexpected dependency: ' + name);
  } };
  vm.runInNewContext(outputText, context, { filename: file });
  return context.exports;
}
const errors = load(serviceRoot + 'utils/errors.ts', {});
const student = { matricule: '21P-0154ASIB', nom: 'TEST', prenom: 'Recette', estTemporaire: false };
function setup(options = {}) {
  const calls = { fetch: 0, create: 0, update: 0, role: 0, audit: 0 };
  let stored = options.existing || null;
  const users = {
    findUserByUsername: async () => stored,
    createUser: async data => { calls.create++; stored = { ...data, id: 123, actif: true, role: { code: 'ETUDIANT' } }; return stored; },
    updateUser: async (id, data) => { calls.update++; return { ...stored, ...data }; },
    createAuditLog: async () => { calls.audit++; },
  };
  const { loginStudent } = load(serviceRoot + 'services/studentLoginService.ts', {
    bcryptjs: bcrypt, crypto, '../utils/errors': errors,
    '../utils/prisma': { prisma: { role: { upsert: async () => { calls.role++; return { id: 2 }; } } } },
    '../repositories/userRepository': users,
  }, {
    process: { env: options.env ?? { ETUDIANT_SERVICE_URL: 'http://registry', INTERNAL_API_SECRET: 'test-only' } },
    fetch: async (url, init) => {
      calls.fetch++;
      assert.equal(url, 'http://registry/21P-0154ASIB');
      assert.equal(init.headers['x-internal-secret'], 'test-only');
      if (options.offline) throw new Error('offline');
      return new Response(JSON.stringify(options.student ?? student), { status: options.status || 200 });
    },
  });
  return { loginStudent, calls };
}
const unauthorized = error => error.statusCode === 401;

test('première connexion : fiche réelle, compte étudiant sans droits administrateur, mot de passe haché', async () => {
  const { loginStudent, calls } = setup();
  const user = await loginStudent('21p-0154asib', student.matricule, null);
  assert.equal(user.username, student.matricule);
  assert.equal(user.role.code, 'ETUDIANT');
  assert.match(user.email, /@comptes\.invalid$/);
  assert.ok(await bcrypt.compare(student.matricule, user.motDePasseHash));
  assert.equal(user.perimeterLevels, undefined);
  assert.equal(calls.create, 1);
  assert.equal(calls.audit, 1);
});

test('matricule absent du registre : aucun compte créé', async () => {
  const { loginStudent, calls } = setup({ status: 404 });
  await assert.rejects(loginStudent(student.matricule, student.matricule, null), unauthorized);
  assert.equal(calls.create, 0);
});

test('fiche temporaire ou réponse incohérente : aucun accès', async () => {
  for (const bad of [{ ...student, estTemporaire: true }, { ...student, matricule: 'AUTRE' }, null]) {
    const { loginStudent, calls } = setup({ student: bad ?? {} });
    await assert.rejects(loginStudent(student.matricule, student.matricule, null), unauthorized);
    assert.equal(calls.create, 0);
  }
});

test('mauvais mot de passe refusé avant interrogation du registre', async () => {
  const { loginStudent, calls } = setup();
  await assert.rejects(loginStudent(student.matricule, 'incorrect', null), unauthorized);
  assert.equal(calls.fetch, 0);
});

test('administrateur et compte suspendu : jamais réinitialisés par le matricule', async () => {
  for (const existing of [{ actif: true, role: { code: 'ADMIN' } }, { actif: false, role: { code: 'ETUDIANT' } }]) {
    const { loginStudent, calls } = setup({ existing });
    await assert.rejects(loginStudent(student.matricule, student.matricule, existing), unauthorized);
    assert.equal(calls.fetch + calls.create + calls.update, 0);
  }
});

test('un compte agent en collision avec le matricule canonique reste protégé', async () => {
  const existing = { actif: true, role: { code: 'ADMIN' } };
  const { loginStudent, calls } = setup({ existing });
  await assert.rejects(loginStudent('21p-0154asib', student.matricule, null), unauthorized);
  assert.equal(calls.update + calls.create, 0);
});

test('ancien compte étudiant : applique le matricule après vérification de la fiche', async () => {
  const existing = { id: 123, actif: true, role: { code: 'ETUDIANT' }, motDePasseHash: await bcrypt.hash('ancien', 4) };
  const { loginStudent, calls } = setup({ existing });
  const updated = await loginStudent(student.matricule, student.matricule, existing);
  assert.ok(await bcrypt.compare(student.matricule, updated.motDePasseHash));
  assert.equal(calls.update, 1);
  assert.equal(calls.create, 0);
});

test('registre indisponible ou configuration absente : erreur 503, aucune création', async () => {
  for (const options of [{ offline: true }, { status: 500 }, { env: {} }]) {
    const { loginStudent, calls } = setup(options);
    await assert.rejects(loginStudent(student.matricule, student.matricule, null), error => error.statusCode === 503);
    assert.equal(calls.create, 0);
  }
});

test('login agent : le matricule ne contourne jamais la vérification bcrypt', async () => {
  let studentCalls = 0;
  const { loginUser } = load(serviceRoot + 'services/authService.ts', {
    bcryptjs: bcrypt, crypto,
    jsonwebtoken: {}, ioredis: class {},
    '../repositories/userRepository': { findUserByUsername: async () => ({ actif: true, role: { code: 'ADMIN' }, motDePasseHash: await bcrypt.hash('secret-agent', 4) }) },
    '../utils/errors': errors, '../utils/logger': {}, '../utils/prisma': {}, './authPermissionPayload': {},
    './studentLoginService': { loginStudent: async () => { studentCalls++; } },
  }, { process: { env: { JWT_SECRET: 'test-only', REFRESH_TOKEN_SECRET: 'test-only' } } });
  await assert.rejects(loginUser(student.matricule, student.matricule), unauthorized);
  assert.equal(studentCalls, 0);
});

test('connexion complète : première connexion étudiant, jeton étudiant sans périmètres administrateur', async () => {
  const registry = setup();
  const signedPayloads = [];
  let authenticatedUser;
  const { loginUser } = load(serviceRoot + 'services/authService.ts', {
    bcryptjs: bcrypt, crypto,
    jsonwebtoken: { sign: payload => { signedPayloads.push(payload); return 'test-token'; } },
    ioredis: class { async set() {} },
    '../repositories/userRepository': {
      findUserByUsername: async () => null,
      updateUserLastLogin: async id => { assert.equal(id, 123); return authenticatedUser; },
      createAuditLog: async () => {},
    },
    '../utils/errors': errors, '../utils/logger': {},
    '../utils/prisma': { prisma: { refreshToken: { create: async () => {} } } },
    './authPermissionPayload': { buildUserPermissionsPayload: async () => ({ perms: {}, denies: [], version: 1 }) },
    './studentLoginService': { loginStudent: async (...args) => { authenticatedUser = await registry.loginStudent(...args); return authenticatedUser; } },
  }, { process: { env: { JWT_SECRET: 'test-only', REFRESH_TOKEN_SECRET: 'test-only' } } });
  const session = await loginUser(student.matricule, student.matricule);
  assert.equal(session.user.username, student.matricule);
  assert.equal(session.user.role.code, 'ETUDIANT');
  assert.equal(session.user.motDePasseHash, undefined);
  assert.equal(signedPayloads[0].role, 'ETUDIANT');
  assert.equal(JSON.stringify(signedPayloads[0].perms), '{}');
  assert.equal(registry.calls.create, 1);
});
