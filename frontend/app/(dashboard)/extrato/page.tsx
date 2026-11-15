"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import {
  PixReceipt,
  type PixTransaction,
} from "@/components/pix/pix-receipt";
import { api } from "@/lib/api";

interface TransactionsResponse {
  data: PixTransaction[];
  meta: {
    paginaAtual: number;
    totalPaginas: number;
    totalRegistros: number;
  };
}

interface Filters {
  page: number;
  startDate: string;
  endDate: string;
}

const statusStyles: Record<string, string> = {
  EFETIVADA: "bg-emerald-50 text-emerald-800",
  CONCLUIDA: "bg-emerald-50 text-emerald-800",
  PENDENTE: "bg-amber-50 text-amber-800",
  CANCELADA: "bg-red-50 text-red-700",
  FALHA: "bg-red-50 text-red-700",
};

const statusLabels: Record<string, string> = {
  EFETIVADA: "Efetivada",
  CONCLUIDA: "Efetivada",
  PENDENTE: "Pendente",
  CANCELADA: "Cancelada",
  FALHA: "Falha",
};

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback;
  const message: unknown = error.response?.data?.message;
  if (Array.isArray(message)) return message.join(", ");
  return typeof message === "string" ? message : fallback;
}

export default function ExtratoPage() {
  const { user } = useAuth();
  const accountId = user?.contaId;
  const [transactions, setTransactions] = useState<PixTransaction[]>([]);
  const [filters, setFilters] = useState<Filters>({
    page: 1,
    startDate: "",
    endDate: "",
  });
  const [startDateDraft, setStartDateDraft] = useState("");
  const [endDateDraft, setEndDateDraft] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] =
    useState<PixTransaction | null>(null);

  useEffect(() => {
    if (!accountId) return;

    let active = true;
    api
      .get<TransactionsResponse>(`/contas/${accountId}/transacoes`, {
        params: {
          page: filters.page,
          limit: 10,
          ...(filters.startDate ? { dataInicio: filters.startDate } : {}),
          ...(filters.endDate ? { dataFim: filters.endDate } : {}),
        },
      })
      .then(({ data }) => {
        if (!active) return;
        setTransactions(data.data);
        setTotalPages(data.meta.totalPaginas);
        setTotalRecords(data.meta.totalRegistros);
        setError("");
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(
          getErrorMessage(requestError, "Não foi possível carregar o extrato."),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [accountId, filters]);

  useEffect(() => {
    if (!selectedTransaction) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedTransaction(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedTransaction]);

  const applyDates = () => {
    if (startDateDraft && endDateDraft && endDateDraft < startDateDraft) {
      setError("A data final não pode ser anterior à data inicial.");
      return;
    }

    setError("");
    setLoading(true);
    setFilters({ page: 1, startDate: startDateDraft, endDate: endDateDraft });
  };

  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - days + 1);
    const startDate = dateInputValue(start);
    const endDate = dateInputValue(end);

    setStartDateDraft(startDate);
    setEndDateDraft(endDate);
    setError("");
    setLoading(true);
    setFilters({ page: 1, startDate, endDate });
  };

  const clearDates = () => {
    setStartDateDraft("");
    setEndDateDraft("");
    setError("");
    setLoading(true);
    setFilters({ page: 1, startDate: "", endDate: "" });
  };

  const changePage = (page: number) => {
    setLoading(true);
    setFilters((current) => ({ ...current, page }));
  };

  const cancelScheduled = async (transactionId: string) => {
    setCancelingId(transactionId);
    setError("");
    try {
      const { data } = await api.patch<{ transacao: PixTransaction }>(
        `/pix/agendamentos/${transactionId}/cancelar`,
      );
      setTransactions((current) =>
        current.map((transaction) =>
          transaction.transacaoId === transactionId
            ? data.transacao
            : transaction,
        ),
      );
      setSelectedTransaction((current) =>
        current?.transacaoId === transactionId ? data.transacao : current,
      );
    } catch (requestError: unknown) {
      setError(
        getErrorMessage(requestError, "Não foi possível cancelar o agendamento."),
      );
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <div className="flex animate-in flex-col gap-6 fade-in duration-300">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Extrato</h1>
          <p className="mt-1 text-sm text-gray-500">
            Transações e agendamentos da sua conta.
          </p>
        </div>
        <p className="text-sm text-gray-500">
          {totalRecords} {totalRecords === 1 ? "transação" : "transações"}
        </p>
      </header>

      <section className="flex flex-col gap-4 border-y border-gray-200 py-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            De
            <input
              type="date"
              value={startDateDraft}
              onChange={(event) => setStartDateDraft(event.target.value)}
              className="h-10 rounded-md border border-gray-300 bg-white px-3"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            Até
            <input
              type="date"
              value={endDateDraft}
              onChange={(event) => setEndDateDraft(event.target.value)}
              className="h-10 rounded-md border border-gray-300 bg-white px-3"
            />
          </label>
          <button
            type="button"
            onClick={applyDates}
            className="h-10 rounded-md bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-black"
          >
            Filtrar
          </button>
          <button
            type="button"
            onClick={() => setQuickRange(7)}
            className="h-10 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Últimos 7 dias
          </button>
          <button
            type="button"
            onClick={() => setQuickRange(30)}
            className="h-10 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Últimos 30 dias
          </button>
          {(startDateDraft || endDateDraft) && (
            <button
              type="button"
              onClick={clearDates}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm text-gray-600 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
              Limpar
            </button>
          )}
        </div>
      </section>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <section aria-label="Transações da conta">
        {!accountId ? (
          <div className="flex min-h-48 items-center justify-center text-sm text-gray-500">
            Nenhuma conta vinculada ao usuário.
          </div>
        ) : loading ? (
          <div className="flex min-h-48 items-center justify-center text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="ml-2 text-sm">Carregando transações</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center">
            <FileText className="h-7 w-7 text-gray-400" />
            <p className="font-semibold text-gray-800">
              Nenhuma transação encontrada
            </p>
            <p className="text-sm text-gray-500">
              Ajuste o período ou consulte novamente mais tarde.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {transactions.map((transaction) => {
              const isOutgoing = transaction.contaOrigemId === accountId;
              const transactionDate =
                transaction.dataEfetivacao || transaction.dataAgendamento;
              const amount = Number(transaction.valor).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              });

              return (
                <article
                  key={transaction.transacaoId}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedTransaction(transaction)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left hover:bg-gray-50 sm:rounded-md sm:p-2"
                    aria-label={`Abrir comprovante da transação ${transaction.transacaoId}`}
                  >
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isOutgoing ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}
                    >
                      {isOutgoing ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownLeft className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {isOutgoing ? "Pix enviado" : "Pix recebido"}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-semibold ${statusStyles[transaction.status] || "bg-gray-100 text-gray-700"}`}
                        >
                          {statusLabels[transaction.status] || transaction.status}
                        </span>
                      </span>
                      <span className="mt-1 block text-sm text-gray-500">
                        {transactionDate
                          ? new Date(transactionDate).toLocaleString("pt-BR")
                          : "Data não disponível"}
                        {transaction.dataAgendamento &&
                          !transaction.dataEfetivacao && " · Agendamento"}
                      </span>
                      <span className="mt-1 block truncate text-xs text-gray-400">
                        ID {transaction.transacaoId}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 font-semibold tabular-nums ${isOutgoing ? "text-gray-900" : "text-emerald-700"}`}
                    >
                      {isOutgoing ? "−" : "+"}
                      {amount}
                    </span>
                  </button>
                  {transaction.status === "PENDENTE" && (
                    <button
                      type="button"
                      onClick={() => void cancelScheduled(transaction.transacaoId)}
                      disabled={cancelingId === transaction.transacaoId}
                      className="rounded-md px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 sm:ml-12"
                    >
                      {cancelingId === transaction.transacaoId
                        ? "Cancelando..."
                        : "Cancelar Agendamento"}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer className="flex items-center justify-between border-t border-gray-200 pt-4">
        <span className="text-sm text-gray-500">
          Página {filters.page} de {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => changePage(Math.max(1, filters.page - 1))}
            disabled={filters.page <= 1 || loading || !accountId}
            aria-label="Página anterior"
            className="rounded-md border border-gray-300 p-2 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => changePage(Math.min(totalPages, filters.page + 1))}
            disabled={filters.page >= totalPages || loading || !accountId}
            aria-label="Próxima página"
            className="rounded-md border border-gray-300 p-2 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </footer>

      {selectedTransaction && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedTransaction(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-details-title"
            className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-xl sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 id="transaction-details-title" className="font-semibold text-gray-900">
                Detalhes da transação
              </h2>
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                aria-label="Fechar comprovante"
                className="print:hidden rounded-md p-2 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <PixReceipt
              transaction={selectedTransaction}
              accountId={accountId}
              authenticatedUserName={user?.name}
            />
          </section>
        </div>
      )}
    </div>
  );
}
