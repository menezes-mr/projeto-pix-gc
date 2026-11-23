import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const source = fs.readFileSync("src/lib/geolocation.ts", "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;

function loadGeolocation(geolocation) {
  const context = { exports: {}, navigator: { geolocation } };
  vm.runInNewContext(js, context);
  return context.exports.getCurrentCoordinates;
}

test("obtém as coordenadas fornecidas pelo navegador", async () => {
  const getCoordinates = loadGeolocation({
    getCurrentPosition: (success) => success({ coords: { latitude: -3.71722, longitude: -38.5433 } }),
  });
  const result = await getCoordinates();
  assert.equal(result.latitude, -3.71722);
  assert.equal(result.longitude, -38.5433);
});

test("informa quando a permissão de localização é negada", async () => {
  const getCoordinates = loadGeolocation({
    getCurrentPosition: (_success, failure) => failure({ code: 1 }),
  });
  await assert.rejects(getCoordinates(), /Permita o acesso à localização/);
});

test("informa quando o navegador ou o dispositivo não fornece localização", async () => {
  await assert.rejects(loadGeolocation(undefined)(), /Localização indisponível/);
  const getCoordinates = loadGeolocation({
    getCurrentPosition: (_success, failure) => failure({ code: 3 }),
  });
  await assert.rejects(getCoordinates(), /Ative a localização do dispositivo/);
});
