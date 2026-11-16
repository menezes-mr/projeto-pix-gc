"use client";

import React, { useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  FileText,
  Loader2,
  X,
  ArrowRight,
  Ban,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import {
  PixReceipt,
  type PixTransaction,
} from "@/components/pix/pix-receipt";

const statusStyles: Record<string, string> = {
  EFETIVADA: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CONCLUIDA: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDENTE: "bg-amber-50 text-amber-700 border-amber-200",
  CANCELADA: "bg-rose-50 text-rose-700 border-rose-200",
  FALHA: "bg-rose-50 text-rose-700 border-rose-200",
};

const statusLabels: Record<string, string> = {
  EFETIVADA: "Efetivada",
  CONCLUIDA: "Efetivada",
  PENDENTE: "Agendado",
  CANCELADA: "Cancelada",
  FALHA: "Falha",
};

function formatCurrency(val: number | string): string {
  const num = typeof val === "number" ? val : Number(val);
  return (Number.isFinite(num) ? num : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface RecentTransactionsProps {
  transactions: PixTransaction[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

export function RecentTransactions({
  transactions,
  loading,
  onRefresh,
}: RecentTransactionsProps) {
  const { user, refreshAccount } = useAuth();
  const contaId = user?.contaId;
  const canCancel = user?.role === "TITULAR" || user?.role === "OPERADOR";

  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<PixTransaction | null>(null);

  const handleCancelScheduled = async (transacaoId: string) => {
    setCancelingId(transacaoId);
    setFeedback(null);
    try {
      await api.patch(`/pix/agendamentos/${transacaoId}/cancelar`);
      await onRefresh();
      await refreshAccount();
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setFeedback(
          err.response?.data?.message ||
            "Não foi possível cancelar o agendamento.",
        );
      } else {
        setFeedback("Não foi possível cancelar o agendamento.");
      }
    } finally {
      setCancelingId(null);
    }
  };

  const pendingScheduled = transactions.filter(
    (t) => t.status === "PENDENTE" && t.contaOrigemId === contaId,
  );
  const recentList = transactions.slice(0, 6);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm flex flex-col gap-5 h-full">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Últimas Movimentações & Agendamentos
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Acompanhe transferências recentes e PIX agendados da conta ativa
          </p>
        </div>
        <Link
          href="/extrato"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/80 px-3 py-1.5 rounded-lg transition-colors shrink-0"
        >
          Ver extrato
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {feedback && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 flex items-center justify-between">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-rose-500 hover:text-rose-800 font-semibold"
          >
            Fechar
          </button>
        </div>
      )}

      {pendingScheduled.length > 0 && (
        <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-bold uppercase tracking-wider">
              <CalendarClock className="w-4 h-4 text-amber-600" />
              <span>PIX Agendados Pendentes ({pendingScheduled.length})</span>
            </div>
            <span className="text-[11px] text-amber-700">
              Execução automática na data programada
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {pendingScheduled.map((item) => (
              <div
                key={item.transacaoId}
                className="bg-white rounded-lg border border-amber-200/70 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-900">
                    Para chave: {item.chavePixUtilizada || "Conta interna"}
                  </span>
                  <span className="text-gray-500">
                    Programado para {formatDateTime(item.dataAgendamento)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-800">
                    {formatCurrency(item.valor)}
                  </span>
                  {canCancel && (
                    <button
                      type="button"
                      disabled={cancelingId === item.transacaoId}
                      onClick={() =>
                        void handleCancelScheduled(item.transacaoId)
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {cancelingId === item.transacaoId ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Ban className="w-3 h-3" />
                      )}
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-indigo-600 flex-1">
          <Loader2 className="w-7 h-7 animate-spin" />
        </div>
      ) : recentList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400 gap-2 flex-1 border border-dashed border-gray-200 rounded-xl">
          <FileText className="w-8 h-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">
            Nenhuma movimentação registrada ainda
          </p>
          <p className="text-xs text-gray-400 max-w-xs">
            Realize uma transferência ou gere uma cobrança QR Code na Área PIX
            para começar.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {recentList.map((tx) => {
            const isIncoming =
              tx.contaDestinoId === contaId && tx.contaOrigemId !== contaId;
            const isEstorno = tx.tipoOperacao === "ESTORNO";
            const title = isEstorno
              ? isIncoming
                ? "Estorno PIX recebido"
                : "Devolução PIX enviada"
              : isIncoming
                ? "PIX recebido"
                : tx.status === "PENDENTE"
                  ? "PIX agendado"
                  : "PIX enviado";

            const subtitle = tx.chavePixUtilizada
              ? `Chave: ${tx.chavePixUtilizada}`
              : isIncoming && tx.contaOrigem?.numeroConta
                ? `Origem: C/C ${tx.contaOrigem.numeroConta}`
                : tx.contaDestino?.numeroConta
                  ? `Destino: C/C ${tx.contaDestino.numeroConta}`
                  : "Transferência entre contas";

            const dateRef = tx.dataEfetivacao || tx.dataAgendamento;

            return (
              <div
                key={tx.transacaoId}
                className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isIncoming
                        ? "bg-emerald-50 text-emerald-600"
                        : tx.status === "PENDENTE"
                          ? "bg-amber-50 text-amber-600"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {isIncoming ? (
                      <ArrowDownLeft className="w-5 h-5" />
                    ) : tx.status === "PENDENTE" ? (
                      <CalendarClock className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {title}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          statusStyles[tx.status] ||
                          "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {statusLabels[tx.status] || tx.status}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 truncate">
                      {subtitle} • {formatDateTime(dateRef)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-sm font-bold ${
                      isIncoming ? "text-emerald-600" : "text-gray-900"
                    }`}
                  >
                    {isIncoming ? "+" : "-"} {formatCurrency(tx.valor)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedTx(tx)}
                    className="text-xs font-medium text-gray-500 hover:text-indigo-600 border border-gray-200 hover:border-indigo-200 rounded-lg px-2.5 py-1 transition-colors cursor-pointer"
                  >
                    Recibo
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTx && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Comprovante da transação PIX"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900">
                Detalhes da Transação
              </span>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <PixReceipt
              transaction={selectedTx}
              accountId={contaId}
              authenticatedUserName={user?.name}
            />
          </div>
        </div>
      )}
    </div>
  );
}
