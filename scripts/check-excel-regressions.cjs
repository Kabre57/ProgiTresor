const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'apps/frontend/node_modules/typescript'));
const XLSX = require(path.join(root, 'apps/frontend/node_modules/xlsx'));
const zod = require(path.join(root, 'apps/frontend/node_modules/zod'));
const cache = new Map();
let importedPayload;
let importedStudents = [];
let importedRecettes = [];
let importedNomenclatures = [];
let downloadedWorkbook;
const referenceData = {
  antennes: [{id: 11, code: 'ABJ', nom: 'École Abidjan'}],
  filieres: [{id: 21, code: 'AS', libelle: 'Auxiliaire de santé', abreviation: 'AUX'}],
  'statuts-etudiants': [{id: 31, code: 'PUBLIC', libelle: 'Étudiant public'}],
  promotions: [{id: 41, nom: 'Deuxième année', niveau: 'Licence'}, {id: 42, nom: 'Deuxième année', niveau: 'Auxiliaire'}],
  'types-flux': [{id: 1, code: 'BUDGET', libelle: 'Budget'}, {id: 2, code: 'HORS-BUDGET', libelle: 'Hors Budget'}],
  'types-recettes': [
    {id: 51, code: 'REC-B', libelle: 'Scolarité', typeFluxId: 1, typeFlux: {id: 1, code: 'BUDGET', libelle: 'Budget'}},
    {id: 52, code: 'REC-HB', libelle: 'Scolarité', typeFluxId: 2, typeFlux: {id: 2, code: 'HORS-BUDGET', libelle: 'Hors Budget'}},
  ],
  nomenclatures: [{id: 61, codeProduit: 'PROD-1', libelle: 'Frais annexes', typeRecette: {code: 'REC-HB', libelle: 'Scolarité', typeFluxId: 2}}],
};
const prisma = {
  antenne: {findMany: async () => referenceData.antennes},
  filiere: {findMany: async () => referenceData.filieres},
  statutEtudiant: {findMany: async () => referenceData['statuts-etudiants']},
  promotion: {findMany: async () => referenceData.promotions},
  etudiant: {createMany: async ({data}) => {importedStudents = data; return {count: data.length};}},
  typeRecette: {
    findMany: async () => referenceData['types-recettes'],
    createMany: async ({data}) => {importedRecettes = data; return {count: data.length};},
  },
  nomenclatureProduit: {createMany: async ({data}) => {importedNomenclatures = data; return {count: data.length};}},
  ordreTraitementMiroir: { findMany: async () => [] },
  transaction: {
    findMany: async ({ cursor }) => cursor ? [] : [{
      id: 1n, refTresor: 'EXCEL-001', dateHeure: new Date('2026-10-21T12:00:00Z'),
      montant: 15000n, etudiantId: null, antenneId: null, nomenclatureId: null,
      typeFluxId: null, ordreTraitementId: null, statutTraitement: 'VALIDE',
    }],
    groupBy: async () => [
      { nomenclatureId: null, typeFluxId: 1, libelleProduitBrut: 'Recette budget', _sum: { montant: 15000n } },
      { nomenclatureId: null, typeFluxId: 2, libelleProduitBrut: 'Recette hors budget', _sum: { montant: 2000n } },
    ],
  },
  typeFlux: { findMany: async () => referenceData['types-flux'], createMany: async ({ data }) => {
    assert.equal(data[0].code, 'BUDGET');
    return { count: data.length };
  } },
};

function load(file) {
  const absolute = path.resolve(root, file);
  if (cache.has(absolute)) return cache.get(absolute);
  const source = fs.readFileSync(absolute, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const context = { exports: {}, Buffer, Date, console, process: { env: {} }, require(name) {
    if (name === 'xlsx') return XLSX;
    if (name === 'zod') return zod;
    if (name === '@/lib/api/etudiantApi') return {etudiantApi: {listReferential: async endpoint => referenceData[endpoint] || []}};
    if (name === '../utils/prisma') return { prisma };
    if (name === '../utils/logger') return { info() {}, warn() {}, error() {} };
    if (name === '../utils/filterBuilder') return { buildTransactionWhereClause: async () => ({}) };
    if (name === '../services/kpiCacheService') return {};
    if (name === '../services/referentialCache') return { invalidateReferential: async () => {} };
    if (name === '../services/transactionService') return {
      importTransactions: async payload => { importedPayload = payload; return { imported: payload.items.length }; },
    };
    if (name === '../utils/etudiantServiceClient') return { fetchEtudiantResult: async endpoint => ({ok: true, data: referenceData[endpoint.replace(/^\//, '')] || []}), fetchEtudiantJson: async endpoint =>
      referenceData[endpoint.replace(/^\//, '')] || [] };
    if (name.startsWith('.')) return load(path.resolve(path.dirname(absolute), name) + '.ts');
    throw new Error('Unexpected dependency: ' + name);
  } };
  vm.runInNewContext(outputText, context, { filename: file });
  cache.set(absolute, context.exports);
  return context.exports;
}

const { isExcelUpload } = load('shared/utils/excelFiles.ts');
const { buildWorkbook } = load('apps/services/transaction-service/src/services/excelExportService.ts');
const { parseImportFile } = load('apps/services/transaction-service/src/services/importParserService.ts');
const { importFile, fetchFromTresor } = load('apps/services/transaction-service/src/controllers/transactionController.ts');

test('Trésor Pay indisponible : aucun faux paiement ni import', async () => {
  const before = importedPayload;
  let error;
  await fetchFromTresor({}, { json: () => assert.fail('Aucune fausse réussite') }, err => { error = err; });
  assert.equal(error.statusCode, 503);
  assert.match(error.message, /accès API/);
  assert.equal(importedPayload, before);
});
const { importReferential } = load('apps/services/etudiant-service/src/controllers/importReferentialController.ts');
const { importEtudiants } = load('apps/services/etudiant-service/src/controllers/importEtudiantsController.ts');
const { exportTransactions, exportSynthese } = load('apps/services/transaction-service/src/controllers/dashboardController.ts');

function workbookBuffer(format, rows) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Donnees');
  return XLSX.write(workbook, { bookType: format, type: 'buffer' });
}

function response() {
  return {
    headers: {}, statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    setHeader(key, value) { this.headers[key.toLowerCase()] = value; return this; },
    json(body) { this.body = body; return this; },
    send(body) { this.body = body; return this; },
    end(body) { if (body) this.body = body; return this; },
  };
}
function fail(error) { throw error; }

test('imports real modern and legacy Excel workbooks with numeric amounts', async () => {
  for (const format of ['xlsx', 'xls']) {
    const buffer = workbookBuffer(format, [
      ['REFERENCE', 'DATE', 'MONTANT', 'MATRICULE'],
      ['EXCEL-001', '2026-10-21T12:00:00Z', 15000, 'recette-001'],
    ]);
    const file = { originalname: 'transactions.' + format.toUpperCase(), buffer };
    assert(isExcelUpload(file));
    const parsed = parseImportFile(buffer, 'XLSX');
    assert.equal(parsed[0].montant, 15000);
    assert.equal(parsed[0].etudiantMatricule, 'RECETTE-001');
    await importFile({ file, headers: { 'x-user-id': '1' } }, response(), fail);
    assert.equal(importedPayload.typeFichier, 'XLSX');
    assert.equal(importedPayload.items[0].refTresor, 'EXCEL-001');
  }
});

test('student, referential and transaction endpoints reject text files and renamed text', async () => {
  for (const originalname of ['donnees.txt', 'donnees.xlsx', 'donnees.xls']) {
    const file = { originalname, buffer: Buffer.from('code;libelle\nA;Test') };
    assert.equal(isExcelUpload(file), false);
    for (const handler of [importEtudiants, importReferential]) {
      const res = response();
      await handler({ file, params: { entity: 'types-flux' } }, res, fail);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.error, /Excel/);
    }
    let error;
    await importFile({ file, headers: {} }, response(), value => { error = value; });
    assert.equal(error.statusCode, 400);
    assert.match(error.message, /Excel/);
  }
});

test('referentials still import Excel rows', async () => {
  const res = response();
  const file = { originalname: 'flux.xlsx', buffer: workbookBuffer('xlsx', [['code', 'libelle'], ['BUDGET', 'Budget']]) };
  await importReferential({ file, params: { entity: 'types-flux' } }, res, fail);
  assert.equal(res.body.created, 1);
});

test('exported modern and legacy workbooks reopen with numbers, accents and XML characters', () => {
  for (const format of ['xlsx', 'xls']) {
    const buffer = buildWorkbook([{ name: 'Recettes', headers: ['Libellé', 'Montant'], rows: [['École & frais <test>', 15000]] }], format);
    assert(isExcelUpload({ originalname: 'recettes.' + format, buffer }));
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets.Recettes, { header: 1 });
    assert.equal(rows[1][0], 'École & frais <test>');
    assert.equal(rows[1][1], 15000);
  }
});

test('transaction exports default to a real xlsx attachment and support legacy xls', async () => {
  for (const format of [undefined, 'xlsx', 'xls']) {
    const res = response();
    await exportTransactions({ query: { format } }, res, fail);
    assert.match(res.headers['content-disposition'], format === 'xls' ? /\.xls$/ : /\.xlsx$/);
    const workbook = XLSX.read(res.body, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets.Transactions, { header: 1 });
    assert.equal(rows[1][0], 'EXCEL-001');
    assert.equal(rows[1][2], 15000);
  }
});

test('synthesis exports contain separate Budget and Hors Budget Excel sheets', async () => {
  const res = response();
  await exportSynthese({ query: {} }, res, fail);
  assert.match(res.headers['content-disposition'], /\.xlsx$/);
  const workbook = XLSX.read(res.body, { type: 'buffer' });
  assert.deepEqual(workbook.SheetNames, ['Budget', 'Hors Budget']);
  assert.equal(XLSX.utils.sheet_to_json(workbook.Sheets.Budget, { header: 1 })[1][2], 15000);
  assert.equal(XLSX.utils.sheet_to_json(workbook.Sheets['Hors Budget'], { header: 1 })[1][2], 2000);
});


test('student imports use names and distinguish promotions by level without fallback', async () => {
  importedStudents = [];
  const file = {originalname: 'etudiants.xlsx', buffer: workbookBuffer('xlsx', [
    ['Matricule', 'Nom', 'Prénom', 'Antenne', 'Filière', 'Statut', 'Promotion', 'Niveau'],
    ['TEST-1', 'Kone', 'Marie', 'ecole abidjan', 'auxiliaire de sante', 'etudiant public', 'deuxieme annee', 'licence'],
    ['TEST-2', 'Kone', 'Eric', 'ABJ', 'AUX', 'PUBLIC', 'Deuxième année', 'Auxiliaire'],
    ['TEST-3', 'Kone', 'Emma', 'Inconnue', 'AS', 'PUBLIC', 'Deuxième année', 'Licence'],
    ['TEST-4', 'Kone', 'Jean', 'ABJ', 'AS', 'PUBLIC', 'Deuxième année', ''],
  ])};
  const res = response();
  await importEtudiants({file}, res, fail);
  assert.equal(res.body.created, 2);
  assert.equal(importedStudents[0].antenneId, 11);
  assert.equal(importedStudents[0].filiereId, 21);
  assert.equal(importedStudents[0].statutId, 31);
  assert.equal(importedStudents[0].promotionId, 41);
  assert.equal(importedStudents[1].promotionId, 42);
  assert.equal(res.body.errors.length, 2);
  assert.match(res.body.errors[0], /Inconnue/);
  assert.match(res.body.errors[1], /ambigu.*Niveau/);
});

test('recipe types resolve a human flow label', async () => {
  const file = {originalname: 'recettes.xlsx', buffer: workbookBuffer('xlsx', [
    ['Code', 'Désignation', 'Flux'], ['REC-TEST', 'Frais de test', 'hors_budget'],
  ])};
  const res = response();
  await importReferential({file, params: {entity: 'types-recettes'}}, res, fail);
  assert.equal(res.body.created, 1);
  assert.equal(importedRecettes[0].typeFluxId, 2);
});

test('nomenclatures resolve recipe labels and report ambiguous or unknown references', async () => {
  const file = {originalname: 'produits.xlsx', buffer: workbookBuffer('xlsx', [
    ['Code produit', 'Désignation', 'Type de recette', 'Flux', 'Montant'],
    ['A', 'Produit A', 'scolarite', 'Budget', 15000],
    ['B', 'Produit B', 'Scolarité', 'Hors Budget', 2000],
    ['C', 'Produit C', 'Scolarité', '', 1000],
    ['D', 'Produit D', 'Inconnue', '', 1000],
  ])};
  const res = response();
  await importReferential({file, params: {entity: 'nomenclatures'}}, res, fail);
  assert.equal(res.body.created, 2);
  assert.equal(importedNomenclatures[0].typeRecetteId, 51);
  assert.equal(importedNomenclatures[1].typeRecetteId, 52);
  assert.equal(res.body.errors.length, 2);
});

test('transaction imports resolve branch and nomenclature names', async () => {
  const file = {originalname: 'transactions.xlsx', buffer: workbookBuffer('xlsx', [
    ['Référence Trésor', 'Date', 'Montant', 'Matricule', 'Antenne', 'Nomenclature', 'Type de recette', 'Flux'],
    ['EXCEL-NOMS', '2026-10-21', 2000, 'TEST-1', 'ecole abidjan', 'frais annexes', 'Scolarité', 'Hors Budget'],
  ])};
  await importFile({file, headers: {'x-user-id': '1'}}, response(), fail);
  assert.equal(importedPayload.items[0].antenneId, 11);
  assert.equal(importedPayload.items[0].nomenclatureId, 61);
  assert.equal(importedPayload.items[0].typeFluxId, 2);
  assert.equal(importedPayload.items[0].libelleProduitBrut, 'Frais annexes');
});

test('Excel templates contain human columns and reference sheets without database identifiers', async () => {
  const originalWrite = XLSX.writeFile;
  XLSX.writeFile = workbook => { downloadedWorkbook = workbook; };
  try {
    const {downloadImportTemplate} = load('apps/frontend/src/lib/utils/importTemplates.ts');
    await downloadImportTemplate('etudiants');
    assert(downloadedWorkbook.SheetNames.includes('Promotions'));
    const headers = XLSX.utils.sheet_to_json(downloadedWorkbook.Sheets['Données à remplir'], {header: 1})[0];
    assert(headers.includes('Antenne'));
    assert(headers.includes('Niveau'));
    assert(headers.every(header => !/Id$/.test(header)));
    const promotions = XLSX.utils.sheet_to_json(downloadedWorkbook.Sheets.Promotions, {header: 1});
    assert.equal(promotions.length, 3);
    assert.deepEqual(promotions[0], ['Nom', 'Niveau', 'Ordre']);
    for (const kind of ['antennes', 'filieres', 'statuts-etudiants', 'promotions', 'types-flux', 'types-recettes', 'nomenclatures', 'transactions']) {
      await downloadImportTemplate(kind);
      const templateHeaders = XLSX.utils.sheet_to_json(downloadedWorkbook.Sheets['Données à remplir'], {header: 1})[0];
      assert(templateHeaders.length > 0);
      assert(templateHeaders.every(header => !/Id$/.test(header)));
    }
  } finally { XLSX.writeFile = originalWrite; }
});


test('unknown transaction references fail before importing transactions', async () => {
  importedPayload = undefined;
  const file = {originalname: 'transactions.xlsx', buffer: workbookBuffer('xlsx', [
    ['Référence Trésor', 'Date', 'Montant', 'Antenne'],
    ['EXCEL-INCONNU', '2026-10-21', 2000, 'Antenne inconnue'],
  ])};
  let error;
  await importFile({file, headers: {}}, response(), value => {error = value;});
  assert.equal(error.statusCode, 400);
  assert.match(error.message, /Antenne inconnue.*introuvable/);
  assert.equal(importedPayload, undefined);
});
