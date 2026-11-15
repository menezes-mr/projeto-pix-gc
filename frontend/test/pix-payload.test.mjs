import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
const source = fs.readFileSync("src/lib/pix-payload.ts", "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const context = { exports: {}, TextEncoder };
vm.runInNewContext(js, context);
const gerar = context.exports.gerarPayloadPix;

test("reproduz exemplo de QR estático do Banco Central com CRC16", () => {
  assert.equal(
    gerar("123e4567-e12b-12d1-a456-426655440000", "Fulano de Tal", "BRASILIA"),
    "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D",
  );
});
test("inclui valor opcional e rejeita dados incompletos", () => {
  assert.match(
    gerar("teste@example.com", "José", "Fortaleza", "12.50"),
    /540512\.50/,
  );
  assert.throws(() => gerar("teste@example.com", "José", ""));
});
