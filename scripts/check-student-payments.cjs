const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'apps/frontend/node_modules/typescript'));
function load(file, mocks = {}, globals = {}) {
  const { outputText } = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const context = { exports: {}, URLSearchParams, AbortSignal, ...globals, require(name) {
    if (name in mocks) return mocks[name];
    throw new Error('Unexpected dependency: ' + name);
  } };
  vm.runInNewContext(outputText, context, { filename: file });
  return context.exports;
}
const errors = load('apps/services/etudiant-service/src/utils/errors.ts');
const paymentFile = 'apps/services/etudiant-service/src/services/studentPaymentsService.ts';

test('bilan : permissions de lecture et pagination complète pour plus de 200 paiements', async () => {
  const offsets = [];
  const { fetchStudentPayments } = load(paymentFile, { '../utils/errors': errors }, {
    process: { env: { INTERNAL_API_SECRET: 'test-only' } },
    fetch: async (url, options) => {
      const query = new URL(url).searchParams;
      assert.equal(query.get('etudiantId'), '42');
      assert.equal(query.get('statutTraitement'), 'CLASSE');
      assert.equal(query.get('limit'), '200');
      assert.equal(options.headers['x-internal-secret'], 'test-only');
      assert.equal(options.headers['x-user-permissions'], '{"IMPORT":1}');
      const offset = Number(query.get('offset')); offsets.push(offset);
      return { ok: true, json: async () => ({ total: 201, list: offset ? [{ montant: 200 }] : Array.from({ length: 200 }, () => ({ montant: 100 })) }) };
    },
  });
  const payments = await fetchStudentPayments(42);
  assert.deepEqual(offsets, [0, 200]);
  assert.equal(payments.length, 201);
  assert.equal(payments.reduce((sum, row) => sum + row.montant, 0), 20200);
});

test('bilan : une erreur ou une réponse tronquée ne produit pas un faux solde nul', async () => {
  for (const response of [{ ok: false }, { ok: true, json: async () => ({ list: [] }) }, { ok: true, json: async () => ({ list: [], total: 1 }) }]) {
    const { fetchStudentPayments } = load(paymentFile, { '../utils/errors': errors }, {
      process: { env: {} }, fetch: async () => response,
    });
    await assert.rejects(fetchStudentPayments(42), error => error.statusCode === 503);
  }
});

test('étudiant : sa fiche et ses attestations sont accessibles, les autres dossiers et les écritures sont refusés', () => {
  const { restrictStudentAccess } = load('apps/services/etudiant-service/src/middlewares/studentAccess.ts', { '../utils/errors': errors });
  for (const [method, url, allowed] of [
    ['GET', '/me', true], ['GET', '/nomenclatures', true],
    ['GET', '/21P-0154ASIB', true], ['GET', '/21P-0154ASIB/financial-summary', true],
    ['POST', '/21P-0154ASIB/generate-attestation', true],
    ['GET', '/', false], ['GET', '/AUTRE/financial-summary', false],
    ['PUT', '/21P-0154ASIB', false], ['POST', '/promotions', false],
  ]) {
    let error;
    restrictStudentAccess({ method, path: url, headers: { 'x-user-role': 'ETUDIANT', 'x-user-name': '21P-0154ASIB' } }, {}, err => { error = err; });
    assert.equal(!error, allowed, `${method} ${url}`);
    if (error) assert.equal(error.statusCode, 403);
  }
});

test('un matricule exact ne révèle pas les transactions d’un matricule plus long', async () => {
  const { buildTransactionWhereClause } = load('apps/services/transaction-service/src/utils/filterBuilder.ts', {
    './logger': { warn() {} },
    './etudiantServiceClient': { fetchEtudiantJson: async () => [{ id: 1, matricule: '21P-0154ASIB' }, { id: 2, matricule: '21P-0154ASIB-OTHER' }] },
  });
  const where = await buildTransactionWhereClause({ etudiantMatricule: '21P-0154ASIB' });
  assert.equal(JSON.stringify(where.etudiantId), '{"in":[1]}');
});

test('bilan : un matricule commençant par des chiffres reste un matricule', async () => {
  const lookups = [];
  const student = { id: 42, matricule: '21P-0154ASIB', nom: 'TEST', prenom: 'Recette', nomenclatures: [{ montant: 15000 }] };
  const { getStudentFinancialSummary } = load('apps/services/etudiant-service/src/services/etudiantService.ts', {
    '../repositories/etudiantRepository': { getPrismaClient: () => ({ etudiant: { findUnique: async query => { lookups.push(query.where); return student; } } }) },
    '../utils/redis': {}, '../utils/errors': errors,
    '../utils/metrics': {}, '../utils/logger': {},
    './studentPaymentsService': { fetchStudentPayments: async id => { assert.equal(id, 42); return [{ montant: 5000 }]; } },
    // Imports utilisés uniquement par la génération de documents.
    pdfkit: {},
  });
  const summary = await getStudentFinancialSummary(student.matricule);
  assert.equal(JSON.stringify(lookups[0]), '{"matricule":"21P-0154ASIB"}');
  assert.equal(summary.montantTotalPaye, 5000);
  assert.equal(summary.soldeRestant, 10000);
});

test('bilan étudiant : un matricule numérique absent ne devient pas l’ID d’un autre étudiant', async () => {
  const lookups = [];
  const { getStudentFinancialSummary } = load('apps/services/etudiant-service/src/services/etudiantService.ts', {
    '../repositories/etudiantRepository': { getPrismaClient: () => ({ etudiant: { findUnique: async query => { lookups.push(query.where); return null; } } }) },
    '../utils/redis': {}, '../utils/errors': errors, '../utils/metrics': {}, '../utils/logger': {},
    './studentPaymentsService': {},
  });
  await assert.rejects(getStudentFinancialSummary('42', true), error => error.statusCode === 404);
  assert.equal(JSON.stringify(lookups), '[{"matricule":"42"}]');
});
