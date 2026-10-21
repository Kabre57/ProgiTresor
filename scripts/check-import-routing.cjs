const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'apps/frontend/node_modules/typescript'));
const XLSX = require(path.join(root, 'apps/frontend/node_modules/xlsx'));

function load(file, env = {}) {
  const { outputText } = ts.transpileModule(fs.readFileSync(path.resolve(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const context = { exports: {}, process: { env }, require(name) {
    if (name === 'xlsx') return XLSX;
    if (name === '../config') return { config: {} };
    if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name) + '.ts', env);
    throw new Error('Unexpected dependency: ' + name);
  } };
  vm.runInNewContext(outputText, context, { filename: file });
  return context.exports;
}
const { parseExcelSheet } = load('apps/services/etudiant-service/src/utils/excelUtils.ts');

test('imports étudiants, référentiels et transactions : tous ont le délai long', () => {
  const { getProxyTimeoutMs } = load('apps/gateway/src/utils/proxyTimeout.ts');
  const { allRoutes } = load('apps/gateway/src/routes/index.ts');
  for (const routePath of ['/api/etudiant/import', '/api/etudiant/import-referential', '/api/transactions/import', '/api/transactions/import-file']) {
    const route = allRoutes.find(r => r.path === routePath);
    assert.ok(route, routePath);
    assert.equal(getProxyTimeoutMs(route.path), 900000);
    assert.ok(allRoutes.indexOf(route) < allRoutes.findIndex(r => r.path === '/api/etudiant') || !routePath.startsWith('/api/etudiant/'));
  }
  assert.equal(getProxyTimeoutMs('/api/etudiant'), 30000);
  const referential = allRoutes.find(r => r.path === '/api/etudiant/import-referential');
  assert.equal(referential.serviceBasePath, '/import-referential');
  assert.equal(JSON.stringify(referential.roles), '["Administrateur"]');
});

test('les durées configurées sont respectées et les valeurs invalides ont un défaut sûr', () => {
  const { getProxyTimeoutMs } = load('apps/gateway/src/utils/proxyTimeout.ts', { GATEWAY_IMPORT_TIMEOUT_MS: '120000', GATEWAY_PROXY_TIMEOUT_MS: '15000' });
  assert.equal(getProxyTimeoutMs('/api/etudiant/import'), 120000);
  assert.equal(getProxyTimeoutMs('/api/etudiant'), 15000);
  const invalid = load('apps/gateway/src/utils/proxyTimeout.ts', { GATEWAY_IMPORT_TIMEOUT_MS: 'abc' });
  assert.equal(invalid.getProxyTimeoutMs('/api/etudiant/import'), 900000);
});

test('une feuille mise en forme jusqu’à la dernière cellule Excel importe seulement ses données', () => {
  const sheet = XLSX.utils.aoa_to_sheet([['Matricule', 'Nom'], ['TEST-1', 'KOUAMÉ']]);
  sheet['!ref'] = 'A1:XFD1048576';
  sheet.XFD1048576 = { t: 'z' };
  const rows = parseExcelSheet(sheet);
  assert.equal(JSON.stringify(rows), '[{"Matricule":"TEST-1","Nom":"KOUAMÉ"}]');
});

test('une feuille décalée garde ses colonnes et ignore les lignes vides', () => {
  const rows = parseExcelSheet({
    '!ref': 'A1:Z1000', D4: { t: 's', v: 'Matricule' }, E4: { t: 's', v: 'Montant' },
    D6: { t: 's', v: 'TEST-1' }, E6: { t: 'n', v: 0 },
  });
  assert.equal(JSON.stringify(rows), '[{"Matricule":"TEST-1","Montant":0}]');
  assert.equal(parseExcelSheet({ '!ref': 'A1:XFD1048576' }).length, 0);
});
