const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'apps/frontend/node_modules/typescript'));
const axios = require(path.join(root, 'apps/frontend/node_modules/axios/dist/node/axios.cjs'));

function loadTs(file, mocks = {}) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const context = {
    exports: {}, process: { env: {} },
    require(name) {
      if (name in mocks) return mocks[name];
      throw new Error('Unexpected dependency: ' + name);
    },
  };
  vm.runInNewContext(outputText, context, { filename: file });
  return context.exports;
}

const { normalizeTypeFluxCode } = loadTs('apps/frontend/src/lib/utils/typeFlux.ts');
const { getErrorMessage } = loadTs('apps/frontend/src/lib/api/client.ts', {
  axios,
  '@/lib/auth/permissionPayload': {},
  '@/lib/store/useAuthStore': {},
});

test('historical Hors Budget codes classify into the same group', () => {
  for (const code of ['HORS_BUDGET', 'HORS-BUDGET', 'HORS BUDGET', ' hors-budget ', 'Hors–Budget']) {
    assert.equal(normalizeTypeFluxCode(code), 'HORS_BUDGET');
  }
  assert.equal(normalizeTypeFluxCode('budget'), 'BUDGET');
  assert.equal(normalizeTypeFluxCode(null), '');
  assert.equal(normalizeTypeFluxCode('AUTRE'), 'AUTRE');
});

test('45 Budget and 36 Hors Budget nomenclatures remain distinct', () => {
  const codes = [...Array(45).fill('BUDGET'), ...Array(36).fill('HORS-BUDGET')];
  assert.equal(codes.filter(code => normalizeTypeFluxCode(code) === 'BUDGET').length, 45);
  assert.equal(codes.filter(code => normalizeTypeFluxCode(code) === 'HORS_BUDGET').length, 36);
});

function apiError(status, data) {
  return new axios.AxiosError('Request failed with status code ' + status, undefined, undefined, undefined, { status, data });
}

test('promotion conflicts display the server message instead of an OT lock', () => {
  const message = 'Une promotion portant ce nom existe déjà pour ce niveau.';
  assert.equal(getErrorMessage(apiError(409, { error: { message, statusCode: 409 } })), message);
  assert.equal(getErrorMessage(apiError(409, { message })), message);
  assert.equal(getErrorMessage(apiError(409, { error: message })), message);
  assert(!getErrorMessage(apiError(409, {})).includes('OT'));
});

test('actual OT errors and validation details retain their server message', () => {
  const message = 'A PDF is already attached to this payment order';
  assert.equal(getErrorMessage(apiError(409, { error: { message } })), message);
  assert.match(getErrorMessage(apiError(400, { error: { niveau: ['Trop long'] } })), /Trop long/);
  assert.match(getErrorMessage(apiError(403, {})), /permission/);
});
