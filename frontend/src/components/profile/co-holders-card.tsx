"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  FileSpreadsheet,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";

export interface CotitularItem {
  usuarioId: string;
  contaId: string;
  papel: "TITULAR" | "OPERADOR" | "DEPENDENTE" | string;
  usuario: {
    usuarioId: string;
    nomeCompleto: string;
    email: string;
    cpfCnpj: string;
    telefone?: string | null;
    status: string;
  };
}

interface RelatorioConsolidadoResponse {
  usuarioId: string;
  periodo?: {
    dataInicio: string | null;
    dataFim: string | null;
  };
  resumo: {
    totalEnviado: number;
    totalRecebido: number;
    totalEntradas?: number;
    totalSaidas?: number;
    balancoPeriodo: number;
    quantidadeTransacoes: number;
  };
  transacoes?: Array<{
    transacaoId: string;
    valor: number;
    tipoOperacao: string;
    direcao?: string;
    status: string;
    chavePixUtilizada: string | null;
    dataEfetivacao: string | null;
    dataAgendamento: string | null;
    contaOrigem?: { agencia: string; numeroConta: string } | null;
    contaDestino?: { agencia: string; numeroConta: string } | null;
    usuarioSolicitante?: { nomeCompleto: string } | null;
  }>;
}

const ROLE_STYLES: Record<string, string> = {
  TITULAR: "bg-indigo-50 text-indigo-700 border-indigo-200",
  OPERADOR: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DEPENDENTE: "bg-amber-50 text-amber-700 border-amber-200",
};

function escapeCsvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

type Convite = {
  conviteId: string;
  papel: string;
  status: string;
  expiraEm: string;
  conta?: { agencia: string; numeroConta: string };
  usuario?: { nomeCompleto: string };
};

export function CoHoldersCard() {
  const { user, refreshAccount, switchAccount } = useAuth();
  const contaId = user?.contaId;
  const [switchingAccountId, setSwitchingAccountId] = useState<string | null>(
    null,
  );

  const [cotitulares, setCotitulares] = useState<CotitularItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const papelUsuario = user?.role;
  const [recebidos, setRecebidos] = useState<Convite[]>([]);
  const [enviados, setEnviados] = useState<Convite[]>([]);
  const carregarConvites = useCallback(async () => {
    try {
      const resposta = await api.get<Convite[]>('/contas/convites/recebidos');
      setRecebidos(resposta.data);
      if (contaId && papelUsuario === 'TITULAR') {
        const enviadosResposta = await api.get<Convite[]>(`/contas/${contaId}/convites`);
        setEnviados(enviadosResposta.data);
      } else setEnviados([]);
    } catch { setFeedback({ type: 'error', text: 'Não foi possível carregar os convites.' }); }
  }, [contaId, papelUsuario]);
  useEffect(() => { const timer = setTimeout(() => { void carregarConvites(); }, 0); return () => clearTimeout(timer); }, [carregarConvites]);
  const responderConvite = async (id: string, aceitar: boolean) => {
    try {
      await api.post(`/contas/convites/${id}/${aceitar ? 'aceitar' : 'recusar'}`);
      await carregarConvites();
      await refreshAccount();
      setFeedback({ type: 'success', text: aceitar ? 'Convite aceito.' : 'Convite recusado.' });
    } catch { setFeedback({ type: 'error', text: 'Não foi possível responder ao convite.' }); }
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [identificador, setIdentificador] = useState("");
  const [papel, setPapel] = useState<"TITULAR" | "OPERADOR" | "DEPENDENTE">(
    "OPERADOR",
  );
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [exportingCsv, setExportingCsv] = useState(false);

  const carregarCotitulares = useCallback(async () => {
    if (!contaId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await api.get<CotitularItem[]>(
        `/contas/${contaId}/titulares`,
      );
      setCotitulares(response.data);
    } catch (err: unknown) {
      if (isAxiosError<{ message?: string | string[] }>(err)) {
        const msg = err.response?.data?.message;
        setError(
          Array.isArray(msg)
            ? msg.join(", ")
            : msg || "Não foi possível carregar os cotitulares da conta.",
        );
      } else {
        setError("Não foi possível carregar os cotitulares da conta.");
      }
    } finally {
      setLoading(false);
    }
  }, [contaId]);

  useEffect(() => {
    if (!contaId) return;

    let active = true;
    api
      .get<CotitularItem[]>(`/contas/${contaId}/titulares`)
      .then((response) => {
        if (active) {
          setCotitulares(response.data);
          setError("");
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (isAxiosError<{ message?: string | string[] }>(err)) {
          const msg = err.response?.data?.message;
          setError(
            Array.isArray(msg)
              ? msg.join(", ")
              : msg || "Não foi possível carregar os cotitulares da conta.",
          );
        } else {
          setError("Não foi possível carregar os cotitulares da conta.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [contaId]);

  const titularesAtivosCount = cotitulares.filter(
    (item) => item.papel === "TITULAR" && item.usuario?.status === "ATIVO",
  ).length;

  const usuarioLogadoEhTitular =
    user?.role === "TITULAR" ||
    cotitulares.some(
      (item) => item.usuarioId === user?.id && item.papel === "TITULAR",
    );

  const handleTrocarConta = async (targetContaId: string) => {
    if (!targetContaId || targetContaId === contaId) return;
    setSwitchingAccountId(targetContaId);
    try {
      await switchAccount(targetContaId);
    } finally {
      setSwitchingAccountId(null);
    }
  };

  const handleConvidarCotitular = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contaId || !identificador.trim()) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      await api.post(`/contas/${contaId}/titulares`, {
        identificador: identificador.trim(),
        papel,
      });
      setIdentificador("");
      setPapel("OPERADOR");
      setModalOpen(false);
      setFeedback({
        type: "success",
        text: "Convite enviado. O vínculo será criado após o aceite.",
      });
      await carregarCotitulares();
      await carregarConvites();
      await refreshAccount();
    } catch (err: unknown) {
      if (isAxiosError<{ message?: string | string[] }>(err)) {
        const msg = err.response?.data?.message;
        setFeedback({
          type: "error",
          text: Array.isArray(msg)
            ? msg.join(", ")
            : msg || "Erro ao adicionar cotitular.",
        });
      } else {
        setFeedback({
          type: "error",
          text: "Erro ao adicionar cotitular.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoverCotitular = async (usuarioIdRemover: string) => {
    if (!contaId) return;
    setRemovingId(usuarioIdRemover);
    setFeedback(null);

    try {
      await api.delete(`/contas/${contaId}/titulares/${usuarioIdRemover}`);
      setFeedback({
        type: "success",
        text: "Cotitular desvinculado da conta com sucesso.",
      });
      await carregarCotitulares();
      await refreshAccount();
    } catch (err: unknown) {
      if (isAxiosError<{ message?: string | string[] }>(err)) {
        const msg = err.response?.data?.message;
        setFeedback({
          type: "error",
          text: Array.isArray(msg)
            ? msg.join(", ")
            : msg || "Não foi possível remover o cotitular.",
        });
      } else {
        setFeedback({
          type: "error",
          text: "Não foi possível remover o cotitular.",
        });
      }
    } finally {
      setRemovingId(null);
    }
  };

  const handleExportarRelatorioCsv = async () => {
    if (!user?.id) return;
    if (dataInicio && dataFim && dataFim < dataInicio) {
      setFeedback({
        type: "error",
        text: "A data final não pode ser anterior à data inicial.",
      });
      return;
    }

    setExportingCsv(true);
    setFeedback(null);

    try {
      const response = await api.get<RelatorioConsolidadoResponse>(
        `/usuarios/${user.id}/relatorios/transacoes`,
        {
          params: {
            ...(dataInicio ? { dataInicio } : {}),
            ...(dataFim ? { dataFim } : {}),
          },
        },
      );

      const dados = response.data;
      const linhas: string[][] = [
        ["RELATORIO FINANCEIRO CONSOLIDADO DO USUARIO"],
        ["Usuario ID", dados.usuarioId],
        ["Periodo Inicio", dataInicio || "Inicio"],
        ["Periodo Fim", dataFim || "Atual"],
        [
          "Total de Entradas (R$)",
          Number(dados.resumo.totalRecebido).toFixed(2),
        ],
        ["Total de Saidas (R$)", Number(dados.resumo.totalEnviado).toFixed(2)],
        [
          "Balanco do Periodo (R$)",
          Number(dados.resumo.balancoPeriodo).toFixed(2),
        ],
        [
          "Quantidade de Transacoes Efetivadas",
          String(dados.resumo.quantidadeTransacoes),
        ],
        [],
        [
          "ID Transacao",
          "Data/Hora",
          "Direcao",
          "Tipo Operacao",
          "Status",
          "Valor (R$)",
          "Chave PIX",
          "Conta Origem",
          "Conta Destino",
          "Solicitante",
        ],
      ];

      for (const tx of dados.transacoes || []) {
        const dataRef = tx.dataEfetivacao || tx.dataAgendamento || "";
        const dataFormatada = dataRef
          ? new Date(dataRef).toLocaleString("pt-BR")
          : "";
        const origem = tx.contaOrigem
          ? `${tx.contaOrigem.agencia}/${tx.contaOrigem.numeroConta}`
          : "";
        const destino = tx.contaDestino
          ? `${tx.contaDestino.agencia}/${tx.contaDestino.numeroConta}`
          : "";

        linhas.push([
          tx.transacaoId,
          dataFormatada,
          tx.direcao || "",
          tx.tipoOperacao,
          tx.status,
          Number(tx.valor).toFixed(2),
          tx.chavePixUtilizada || "",
          origem,
          destino,
          tx.usuarioSolicitante?.nomeCompleto || "",
        ]);
      }

      const conteudoCsv =
        "\uFEFF" +
        linhas.map((linha) => linha.map(escapeCsvCell).join(";")).join("\r\n");

      const blob = new Blob([conteudoCsv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const sufixoPeriodo =
        dataInicio || dataFim
          ? `_${dataInicio || "inicio"}_a_${dataFim || "atual"}`
          : "";
      link.setAttribute(
        "download",
        `relatorio_financeiro${sufixoPeriodo}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setFeedback({
        type: "success",
        text: "Relatório financeiro exportado em CSV com sucesso!",
      });
    } catch (err: unknown) {
      if (isAxiosError<{ message?: string | string[] }>(err)) {
        const msg = err.response?.data?.message;
        setFeedback({
          type: "error",
          text: Array.isArray(msg)
            ? msg.join(", ")
            : msg || "Não foi possível exportar o relatório em CSV.",
        });
      } else {
        setFeedback({
          type: "error",
          text: "Não foi possível exportar o relatório em CSV.",
        });
      }
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-indigo-600">
          <Users className="w-5 h-5" />
          <h3 className="font-semibold text-gray-900">Cotitulares da Conta</h3>
        </div>

        {usuarioLogadoEhTitular && contaId && (
          <Button
            type="button"
            onClick={() => {
              setFeedback(null);
              setModalOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2 h-9 px-3 text-xs"
          >
            <UserPlus className="w-4 h-4" />
            Convidar Cotitular
          </Button>
        )}
      </div>

      {recebidos.length > 0 && <div className="space-y-2" aria-label="Convites recebidos">
        <h4 className="font-semibold">Convites recebidos</h4>
        {recebidos.map((convite) => <div key={convite.conviteId} className="flex flex-wrap items-center gap-3 text-sm">
          <span>Conta {convite.conta?.agencia} / {convite.conta?.numeroConta} — {convite.papel}</span>
          <button type="button" className="text-indigo-700 underline" onClick={() => void responderConvite(convite.conviteId, true)}>Aceitar</button>
          <button type="button" className="text-red-700 underline" onClick={() => void responderConvite(convite.conviteId, false)}>Recusar</button>
        </div>)}
      </div>}
      {enviados.length > 0 && <div className="space-y-2" aria-label="Convites enviados">
        <h4 className="font-semibold">Convites enviados</h4>
        {enviados.map((convite) => <p key={convite.conviteId} className="text-sm">{convite.usuario?.nomeCompleto} — {convite.papel} — {convite.status === 'PENDENTE' && new Date(convite.expiraEm) <= new Date() ? 'EXPIRADO' : convite.status}</p>)}
      </div>}

      <p className="text-sm text-gray-500">
        Gerencie os membros vinculados à conta ativa (
        <strong>C/C {user?.accountNumber || "---"}</strong>) e alterne entre as
        contas que você participa.
      </p>

      {user?.accounts && user.accounts.length > 1 && (
        <div className="flex flex-col gap-2 bg-gray-50/80 border border-gray-100 rounded-lg p-3.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600" />
            Contas que Participo ({user.accounts.length})
          </span>
          <div className="flex flex-col gap-2">
            {user.accounts.map((acc) => {
              const isCurrent = acc.contaId === contaId;
              return (
                <div
                  key={acc.contaId}
                  className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border text-xs ${
                    isCurrent
                      ? "bg-indigo-50/70 border-indigo-200"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">
                        Ag {acc.agencia} • C/C {acc.numeroConta}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          ROLE_STYLES[acc.papel] ||
                          "bg-gray-100 text-gray-700 border-gray-200"
                        }`}
                      >
                        {acc.papel}
                      </span>
                    </div>
                    <span className="text-gray-500 truncate mt-0.5">
                      Titular: {acc.titularNome}
                    </span>
                  </div>
                  {isCurrent ? (
                    <span className="text-[11px] font-bold text-indigo-700 px-2.5 py-1 rounded bg-indigo-100/80">
                      Conta Ativa
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleTrocarConta(acc.contaId)}
                      disabled={switchingAccountId === acc.contaId}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {switchingAccountId === acc.contaId
                        ? "Trocando..."
                        : "Acessar Conta"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`p-3 rounded-lg flex items-center justify-between gap-2 text-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-6 text-indigo-600">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : cotitulares.length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-4">
          Nenhum membro vinculado encontrado.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
          {cotitulares.map((membro) => {
            const ehUnicoTitularAtivo =
              membro.papel === "TITULAR" && titularesAtivosCount <= 1;

            return (
              <li
                key={membro.usuarioId}
                className="p-3.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900 truncate">
                      {membro.usuario?.nomeCompleto || "Usuário"}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        ROLE_STYLES[membro.papel] ||
                        "bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      {membro.papel}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {membro.usuario?.email} · CPF/CNPJ:{" "}
                    {membro.usuario?.cpfCnpj}
                  </p>
                </div>

                {usuarioLogadoEhTitular && (
                  <button
                    type="button"
                    onClick={() => void handleRemoverCotitular(membro.usuarioId)}
                    disabled={
                      ehUnicoTitularAtivo || removingId === membro.usuarioId
                    }
                    title={
                      ehUnicoTitularAtivo
                        ? "Não é possível remover o único titular ativo da conta"
                        : "Remover cotitular"
                    }
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {removingId === membro.usuarioId ? (
                      <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-gray-100 pt-5 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-indigo-600">
          <FileSpreadsheet className="w-4 h-4" />
          <h4 className="text-sm font-semibold text-gray-900">
            Exportação de Relatório Financeiro Consolidado
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            Data Inicial
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="h-9 rounded-lg border border-gray-200 px-3 text-xs text-gray-800"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            Data Final
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="h-9 rounded-lg border border-gray-200 px-3 text-xs text-gray-800"
            />
          </label>
        </div>

        <Button
          type="button"
          onClick={() => void handleExportarRelatorioCsv()}
          disabled={exportingCsv || !user?.id}
          className="w-full bg-gray-900 hover:bg-black text-white gap-2 h-10 text-xs"
        >
          {exportingCsv ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Exportar Relatório (CSV)
        </Button>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-cotitular-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600">
                <UserPlus className="w-5 h-5" />
                <h4
                  id="modal-cotitular-title"
                  className="font-semibold text-gray-900"
                >
                  Convidar Cotitular
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleConvidarCotitular}
              className="flex flex-col gap-4"
            >
              <Input
                label="CPF/CNPJ ou E-mail do Usuário"
                type="text"
                placeholder="Digite o CPF ou e-mail cadastrado"
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                required
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Papel na Conta
                </label>
                <select
                  value={papel}
                  onChange={(e) =>
                    setPapel(
                      e.target.value as "TITULAR" | "OPERADOR" | "DEPENDENTE",
                    )
                  }
                  className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="TITULAR">TITULAR — Acesso total</option>
                  <option value="OPERADOR">
                    OPERADOR — Movimentação e consultas
                  </option>
                  <option value="DEPENDENTE">
                    DEPENDENTE — Acesso supervisionado
                  </option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 mt-2">
                <Button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !identificador.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? "Enviando..." : "Enviar convite"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
