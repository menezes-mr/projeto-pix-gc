import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

const source = fs.readFileSync('src/lib/api.ts', 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;

function requestInterceptor(token) {
  let intercept;
  const api = { interceptors: { request: { use: (handler) => { intercept = handler; } } } };
  const axios = { create: () => api };
  vm.runInNewContext(js, {
    exports: {},
    require: () => axios,
    process: { env: {} },
    window: {},
    sessionStorage: { getItem: () => token },
  });
  return intercept;
}

function configWithAuthorization(initial) {
  let authorization = initial;
  return {
    headers: {
      get: () => authorization,
      set: (_name, value) => { authorization = value; },
    },
    authorization: () => authorization,
  };
}

test('usa o token da sessão da aba', () => {
  const config = configWithAuthorization(undefined);
  requestInterceptor('token-da-aba')(config);
  assert.equal(config.authorization(), 'Bearer token-da-aba');
});

test('preserva a autorização explícita de requisições administrativas', () => {
  const config = configWithAuthorization('Bearer token-admin');
  requestInterceptor('token-da-aba')(config);
  assert.equal(config.authorization(), 'Bearer token-admin');
});
