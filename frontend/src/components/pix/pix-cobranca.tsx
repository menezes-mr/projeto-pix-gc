"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { gerarPayloadPix } from "@/lib/pix-payload";

type Chave = {
  chaveId: string;
  tipoChave: string;
  valorChave: string;
  status: string;
};
export function PixCobranca() {
  const { user } = useAuth();
  const [chaves, setChaves] = useState<Chave[]>([]);
  const [chave, setChave] = useState("");
  const [valor, setValor] = useState("");
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  useEffect(() => {
    let ativo = true;
    api
      .get<Chave[]>("/pix/chaves/minhas")
      .then(({ data }) => {
        if (!ativo) return;
        const ativas = data.filter((item) => item.status === "ATIVA");
        setChaves(ativas);
        setChave(ativas[0]?.valorChave || "");
      })
      .catch(() => {
        if (ativo) setErro("Não foi possível carregar suas chaves PIX.");
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, []);
  const valorNormalizado = valor.trim().replace(",", ".");
  const valorValido =
    !valorNormalizado ||
    (/^\d{1,8}(\.\d{1,2})?$/.test(valorNormalizado) &&
      Number(valorNormalizado) > 0);
  let payload = "";
  if (chave && user?.name && valorValido) {
    try {
      payload = gerarPayloadPix(
        chave,
        user.name,
        "BRASIL",
        valorNormalizado ? Number(valorNormalizado).toFixed(2) : undefined,
      );
    } catch {
      /* Dados inválidos são sinalizados abaixo. */
    }
  }
  async function copiar() {
    try {
      await navigator.clipboard.writeText(payload);
      setMensagem("Código copiado.");
      setErro("");
    } catch {
      setErro(
        "Não foi possível copiar. Selecione e copie o código manualmente.",
      );
    }
  }
  return (
    <section className="bg-white text-gray-900 rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          Receber / Cobrar PIX
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Gere um código estático com sua chave e, se desejar, um valor.
        </p>
      </div>
      <p className="text-sm text-amber-800 bg-amber-50 rounded-lg p-3">
        As chaves deste sistema são locais. Pagamentos reais só funcionam com
        uma chave registrada em uma instituição financeira; eles não atualizam o
        saldo deste projeto.
      </p>
      {mensagem && (
        <p role="status" className="text-sm text-emerald-700 break-all">
          {mensagem}
        </p>
      )}
      {erro && (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      )}
      {loading ? (
        <p className="text-sm text-gray-600">Carregando chaves…</p>
      ) : chaves.length === 0 ? (
        <p className="text-gray-600 text-sm">
          Nenhuma chave ativa. Cadastre uma em Minhas Chaves.
        </p>
      ) : (
        <>
          <label className="text-sm font-bold text-gray-900">
            Chave PIX
            <select
              className="mt-2 block w-full rounded-lg border border-gray-300 bg-white p-3 font-normal text-gray-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              value={chave}
              onChange={(e) => {
                setChave(e.target.value);
              }}
            >
              {chaves.map((item) => (
                <option
                  key={item.chaveId}
                  value={item.valorChave}
                  className="font-normal text-gray-900 bg-white"
                >
                  {item.tipoChave} — {item.valorChave}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold text-gray-900">
            Valor opcional (R$)
            <input
              className="mt-2 block w-full rounded-lg border border-gray-300 bg-white p-3 font-normal text-gray-900 placeholder:text-gray-500 placeholder:font-normal outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              inputMode="decimal"
              placeholder="Ex.: 10,50"
              value={valor}
              onBlur={() => {
                if (valorNormalizado && valorValido) {
                  setValor(Number(valorNormalizado).toFixed(2).replace(".", ","));
                }
              }}
              onChange={(e) => {
                setValor(e.target.value);
              }}
              aria-invalid={!valorValido}
            />
          </label>
          {!valorValido && (
            <p className="text-sm text-red-700">
              Informe um valor positivo com até duas casas decimais.
            </p>
          )}
          {payload ? (
            <div className="flex flex-col items-center gap-4">
              <QRCodeSVG
                value={payload}
                size={220}
                level="M"
                marginSize={4}
                title="QR Code PIX"
              />
              <label className="text-sm font-bold text-gray-900 w-full">
                PIX Copia e Cola
                <textarea
                  readOnly
                  value={payload}
                  rows={4}
                  className="mt-2 block w-full rounded-lg border border-gray-300 bg-white p-3 font-mono text-xs text-gray-900 break-all"
                />
              </label>
              <button
                onClick={copiar}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-white font-semibold"
              >
                Copiar código
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Selecione uma chave e informe um valor válido para gerar o código.
            </p>
          )}
        </>
      )}
    </section>
  );
}
