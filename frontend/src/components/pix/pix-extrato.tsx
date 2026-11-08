"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

type Transacao = {
  transacaoId: string;
  valor: string;
  status: string;
  tipoOperacao: string;
  contaOrigemId: string | null;
  contaDestinoId: string | null;
  transacaoEstornoId: string | null;
  motivoEstorno: string | null;
  dataEfetivacao: string | null;
};
const dinheiro = (valor: string) =>
  Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function PixExtrato({ revisao }: { revisao: number }) {
  const { user, refreshAccount } = useAuth();
  const contaId = user?.contaId;
  const [itens, setItens] = useState<Transacao[]>([]);
  const [selecionada, setSelecionada] = useState<Transacao | null>(null);
  const [motivo, setMotivo] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const carregar = useCallback(async () => {
    if (!contaId) return;
    try {
      const res = await api.get<{ data: Transacao[] }>(
        `/contas/${contaId}/transacoes`,
        { params: { page: 1, limit: 50 } },
      );
      setItens(res.data.data);
      setSelecionada((atual) =>
        atual
          ? res.data.data.find(
              (item) => item.transacaoId === atual.transacaoId,
            ) || atual
          : null,
      );
    } catch {
      setErro("Não foi possível carregar o extrato.");
    } finally {
      setCarregando(false);
    }
  }, [contaId]);
  useEffect(() => {
    void Promise.resolve().then(carregar);
  }, [carregar, revisao]);
  async function devolver() {
    if (!selecionada || ocupado) return;
    setOcupado(true);
    setErro("");
    setMensagem("");
    try {
      await api.post("/pix/estorno", {
        transacaoIdOriginal: selecionada.transacaoId,
        ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
      });
      setSelecionada(null);
      setConfirmar(false);
      setMotivo("");
      await Promise.all([carregar(), refreshAccount()]);
      setMensagem("Devolução realizada com sucesso.");
    } catch (e) {
      setErro(
        axios.isAxiosError<{ message?: string }>(e)
          ? e.response?.data?.message || "Erro ao devolver PIX."
          : "Erro ao devolver PIX.",
      );
      await carregar();
    } finally {
      setOcupado(false);
    }
  }
  const elegivel =
    selecionada &&
    selecionada.contaDestinoId === user?.contaId &&
    selecionada.contaOrigemId &&
    selecionada.tipoOperacao !== "ESTORNO" &&
    selecionada.status === "EFETIVADA" &&
    !selecionada.transacaoEstornoId;
  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col gap-3">
      <div>
        <h2 className="font-bold text-xl">Extrato PIX</h2>
        <p className="text-sm text-gray-500">Últimas 50 transações</p>
      </div>
      {mensagem && (
        <p role="status" className="text-emerald-700 text-sm">
          {mensagem}
        </p>
      )}
      {erro && !selecionada && (
        <p role="alert" className="text-red-700 text-sm">
          {erro}
        </p>
      )}
      {!contaId ? (
        <p className="text-gray-500">Conta indisponível.</p>
      ) : carregando ? (
        <p className="text-gray-500">Carregando extrato…</p>
      ) : itens.length === 0 ? (
        <p className="text-gray-500">Nenhuma transação encontrada.</p>
      ) : (
        itens.map((t) => {
          const entrada = t.contaDestinoId === user?.contaId;
          return (
            <button
              className="border border-gray-100 rounded-lg p-3 text-left flex justify-between gap-3 hover:bg-gray-50"
              key={t.transacaoId}
              onClick={() => {
                setSelecionada(t);
                setConfirmar(false);
                setMotivo("");
                setErro("");
              }}
            >
              <span>
                <strong>
                  {t.tipoOperacao === "ESTORNO"
                    ? "Devolução PIX"
                    : t.tipoOperacao === "RECEBIMENTO_SIMULADO"
                      ? "Recebimento simulado"
                      : entrada
                        ? "PIX recebido"
                        : "PIX enviado"}
                </strong>
                <span className="block text-sm text-gray-500">
                  {t.transacaoEstornoId ? "Estornada" : t.status}{" "}
                  {t.dataEfetivacao &&
                    `· ${new Date(t.dataEfetivacao).toLocaleString("pt-BR")}`}
                </span>
              </span>
              <span className={entrada ? "text-emerald-700" : "text-gray-900"}>
                {entrada ? "+" : "−"} {dinheiro(t.valor)}
              </span>
            </button>
          );
        })
      )}
      {selecionada && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={confirmar ? "Confirmar devolução" : "Detalhes do PIX"}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-auto flex flex-col gap-3">
            <h3 className="text-xl font-bold">
              {confirmar ? "Confirmar devolução" : "Detalhes do PIX"}
            </h3>
            <p>
              Valor: <strong>{dinheiro(selecionada.valor)}</strong>
            </p>
            <p>
              Data:{" "}
              {selecionada.dataEfetivacao
                ? new Date(selecionada.dataEfetivacao).toLocaleString("pt-BR")
                : "Não efetivada"}
            </p>
            <p className="break-all">
              Conta remetente: {selecionada.contaOrigemId || "Não informada"}
            </p>
            <p className="break-all">ID: {selecionada.transacaoId}</p>
            <p>
              Status:{" "}
              {selecionada.transacaoEstornoId
                ? "Estornada"
                : selecionada.status}
            </p>
            {selecionada.motivoEstorno && (
              <p>Motivo: {selecionada.motivoEstorno}</p>
            )}
            {erro && (
              <p role="alert" className="text-red-700 text-sm">
                {erro}
              </p>
            )}
            {elegivel && !confirmar && (
              <button
                onClick={() => setConfirmar(true)}
                className="bg-gray-900 text-white rounded-lg p-3"
              >
                Devolver PIX (Estornar)
              </button>
            )}
            {confirmar && (
              <>
                <p className="text-sm text-amber-800 bg-amber-50 rounded-lg p-3">
                  O valor será devolvido integralmente à conta que enviou o PIX.
                </p>
                <label className="text-sm font-semibold">
                  Motivo (opcional)
                  <textarea
                    maxLength={500}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="block w-full border rounded p-2 font-normal mt-2"
                  />
                </label>
                <button
                  disabled={ocupado || !elegivel}
                  onClick={devolver}
                  className="bg-gray-900 text-white rounded-lg p-3 disabled:opacity-50"
                >
                  {ocupado ? "Processando…" : "Confirmar devolução"}
                </button>
              </>
            )}
            <button
              disabled={ocupado}
              onClick={() => {
                setSelecionada(null);
                setConfirmar(false);
                setErro("");
              }}
              className="border rounded-lg p-3 disabled:opacity-50"
            >
              {confirmar ? "Cancelar" : "Fechar"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
