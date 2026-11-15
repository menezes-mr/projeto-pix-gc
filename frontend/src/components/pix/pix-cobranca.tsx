"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
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
export function PixCobranca({ onCompleted }: { onCompleted: () => void }) {
  const { user, refreshAccount } = useAuth();
  const [chaves, setChaves] = useState<Chave[]>([]);
  const [chave, setChave] = useState("");
  const [cidade, setCidade] = useState("");
  const [valor, setValor] = useState("");
  const [loading, setLoading] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const pedido = useRef<string | null>(null);
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
  if (chave && cidade && user?.name && valorValido) {
    try {
      payload = gerarPayloadPix(
        chave,
        user.name,
        cidade,
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
  async function simular() {
    if (!chave || !valorNormalizado || !valorValido || ocupado) return;
    setOcupado(true);
    setErro("");
    setMensagem("");
    pedido.current ||= crypto.randomUUID();
    try {
      const resposta = await api.post<{ transacaoId: string }>(
        "/pix/recebimento",
        {
          chavePixDestino: chave,
          valor: Number(valorNormalizado),
          transacaoExternaId: pedido.current,
        },
      );
      pedido.current = null;
      setConfirmar(false);
      await refreshAccount();
      onCompleted();
      setMensagem(
        `Recebimento simulado registrado. ID: ${resposta.data.transacaoId}`,
      );
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 409) {
        pedido.current = null;
        setConfirmar(false);
        await refreshAccount();
        onCompleted();
        setMensagem("Esta simulação já foi registrada. Confira o extrato.");
        return;
      }
      setErro(
        axios.isAxiosError<{ message?: string }>(e)
          ? e.response?.data?.message ||
              "Não foi possível simular o recebimento."
          : "Não foi possível simular o recebimento.",
      );
    } finally {
      setOcupado(false);
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
        <p>Carregando chaves…</p>
      ) : chaves.length === 0 ? (
        <p className="text-gray-500">
          Nenhuma chave ativa. Cadastre uma em Minhas Chaves.
        </p>
      ) : (
        <>
          <label className="text-sm font-semibold">
            Chave PIX
            <select
              className="mt-2 block w-full rounded-lg border border-gray-300 p-3 font-normal"
              value={chave}
              disabled={ocupado}
              onChange={(e) => {
                setChave(e.target.value);
                pedido.current = null;
                setConfirmar(false);
              }}
            >
              {chaves.map((item) => (
                <option key={item.chaveId} value={item.valorChave}>
                  {item.tipoChave} — {item.valorChave}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Cidade do recebedor
            <input
              className="mt-2 block w-full rounded-lg border border-gray-300 p-3 font-normal"
              value={cidade}
              disabled={ocupado}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Sua cidade"
              maxLength={60}
            />
          </label>
          <label className="text-sm font-semibold">
            Valor opcional (R$)
            <input
              className="mt-2 block w-full rounded-lg border border-gray-300 p-3 font-normal"
              inputMode="decimal"
              placeholder="Ex.: 10,50"
              value={valor}
              disabled={ocupado}
              onBlur={() => {
                if (valorNormalizado && valorValido) {
                  setValor(Number(valorNormalizado).toFixed(2).replace(".", ","));
                }
              }}
              onChange={(e) => {
                setValor(e.target.value);
                pedido.current = null;
                setConfirmar(false);
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
              <label className="text-sm font-semibold w-full">
                PIX Copia e Cola
                <textarea
                  readOnly
                  value={payload}
                  rows={4}
                  className="mt-2 block w-full rounded-lg border border-gray-300 p-3 font-mono text-xs break-all"
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
              Informe uma cidade e um valor válido para gerar o código.
            </p>
          )}
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 mb-3">
              A simulação cria saldo fictício e só funciona quando habilitada no
              ambiente de testes.
            </p>
            {!confirmar ? (
              <button
                disabled={!chave || !valorNormalizado || !valorValido}
                onClick={() => setConfirmar(true)}
                className="rounded-lg bg-gray-900 text-white p-3 disabled:opacity-50"
              >
                Simular Recebimento Imediato
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm">
                  Confirmar recebimento simulado de{" "}
                  {Number(valorNormalizado).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                  ?
                </span>
                <button
                  disabled={ocupado}
                  onClick={simular}
                  className="rounded-lg bg-gray-900 text-white p-3 disabled:opacity-50"
                >
                  {ocupado ? "Processando…" : "Confirmar simulação"}
                </button>
                <button
                  disabled={ocupado}
                  onClick={() => setConfirmar(false)}
                  className="rounded-lg border p-3"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
