"use client";

import { Printer, CalendarClock, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export interface PixAccountSummary {
  contaId: string;
  agencia?: string;
  numeroConta?: string;
  titularNome?: string;
  usuarios?: Array<{
    usuario?: {
      nomeCompleto?: string;
    };
  }>;
}

export interface PixTransaction {
  transacaoId: string;
  valor: number | string;
  tipoOperacao: string;
  status: string;
  dataAgendamento?: string | null;
  dataEfetivacao?: string | null;
  contaOrigemId?: string | null;
  contaDestinoId?: string | null;
  contaOrigem?: PixAccountSummary | null;
  contaDestino?: PixAccountSummary | null;
  usuarioSolicitanteId?: string | null;
  usuarioSolicitante?: { usuarioId: string; nomeCompleto: string } | null;
  chavePixUtilizada?: string | null;
  transacaoExternaId?: string | null;
  motivoEstorno?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface PixReceiptProps {
  transaction: PixTransaction;
  accountId?: string | null;
  authenticatedUserName?: string;
  recipientName?: string;
  originAccount?: PixAccountSummary;
}

const statusLabels: Record<string, string> = {
  EFETIVADA: "Efetivada",
  CONCLUIDA: "Efetivada",
  PENDENTE: "Agendado (Pendente)",
  CANCELADA: "Cancelada",
  FALHA: "Não efetivado (Falha)",
};

function formatAccount(
  account?: PixAccountSummary | null,
  fallbackId?: string | null,
) {
  if (!account) return fallbackId || "Não informado";
  const number = account.numeroConta
    ? `Conta ${account.numeroConta}${account.agencia ? ` · Ag. ${account.agencia}` : ""}`
    : account.contaId;
  return number;
}

export function PixReceipt({
  transaction,
  accountId,
  authenticatedUserName,
  recipientName,
  originAccount,
}: PixReceiptProps) {
  const { user } = useAuth();
  const isOutgoing = accountId
    ? transaction.contaOrigemId === accountId
    : transaction.tipoOperacao === "TRANSFERENCIA_SAIDA";

  const activeAccountLink = user?.accounts?.find(
    (acc) => acc.contaId === (accountId || user?.contaId),
  );
  const activeAccountHolderName =
    activeAccountLink?.titularNome || authenticatedUserName || user?.name;

  const origin =
    transaction.contaOrigem || (isOutgoing ? originAccount : undefined);

  const originHolderFromApi =
    transaction.contaOrigem?.usuarios?.[0]?.usuario?.nomeCompleto ||
    origin?.titularNome;

  const destinationHolderFromApi =
    transaction.contaDestino?.usuarios?.[0]?.usuario?.nomeCompleto ||
    transaction.contaDestino?.titularNome;

  const originName =
    originHolderFromApi ||
    (isOutgoing
      ? activeAccountHolderName || "Conta de origem"
      : transaction.contaOrigem?.numeroConta
        ? `Titular da conta ${transaction.contaOrigem.numeroConta}`
        : transaction.tipoOperacao === "RECEBIMENTO_SIMULADO"
          ? "Pagador externo (QR Code / Simulação)"
          : "Conta de origem");

  const destinationName =
    destinationHolderFromApi ||
    recipientName ||
    (!isOutgoing
      ? activeAccountHolderName || "Sua conta"
      : transaction.contaDestino?.numeroConta
        ? `Titular da conta ${transaction.contaDestino.numeroConta}`
        : "Conta de destino");

  const date = transaction.dataEfetivacao || transaction.dataAgendamento;
  const isScheduledPending = transaction.status === "PENDENTE";
  const isCanceledOrFailed =
    transaction.status === "CANCELADA" || transaction.status === "FALHA";

  const receiptTitle = isScheduledPending
    ? "Comprovante de Agendamento Pix"
    : transaction.status === "CANCELADA"
      ? "Agendamento Pix Cancelado"
      : transaction.status === "FALHA"
        ? "Agendamento Pix Não Efetivado"
        : "Comprovante Pix";

  const operationTypeLabel =
    transaction.tipoOperacao === "ESTORNO"
      ? isOutgoing
        ? "Devolução Pix enviada"
        : "Estorno Pix recebido"
      : isScheduledPending
        ? "Pix agendado"
        : transaction.status === "CANCELADA"
          ? "Agendamento cancelado"
          : transaction.status === "FALHA"
            ? "Agendamento não efetivado"
            : isOutgoing
              ? "Pix enviado"
              : "Pix recebido";

  const authenticatedBy =
    transaction.usuarioSolicitante?.nomeCompleto ||
    (isOutgoing ? authenticatedUserName : undefined) ||
    originHolderFromApi ||
    (transaction.usuarioSolicitanteId
      ? "Usuário autenticado"
      : "Sistema PIX GC");

  return (
    <section className="pix-receipt rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{receiptTitle}</h2>
          <p className="mt-1 break-all text-xs text-gray-500">
            Transação {transaction.transacaoId}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          title="Imprimir comprovante"
          aria-label="Imprimir comprovante"
          className="print:hidden rounded-md p-2 text-gray-600 hover:bg-gray-100"
        >
          <Printer className="h-5 w-5" />
        </button>
      </div>

      {isScheduledPending && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>
            Este documento comprova apenas o <strong>agendamento</strong>. O
            débito em conta ocorrerá automaticamente na data programada,
            mediante disponibilidade de saldo e limite diário.
          </span>
        </div>
      )}

      {isCanceledOrFailed && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>
            {transaction.status === "CANCELADA"
              ? "Este agendamento foi cancelado antes da efetivação. Nenhum valor foi debitado da conta."
              : "Este agendamento não pôde ser efetivado na data programada (saldo ou limite insuficiente). Nenhum valor foi debitado."}
          </span>
        </div>
      )}

      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-gray-500">
            {isScheduledPending ? "Valor agendado" : "Valor"}
          </dt>
          <dd className="mt-1 text-xl font-bold text-gray-900">
            {Number(transaction.valor).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Status</dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900">
            {statusLabels[transaction.status] || transaction.status}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Tipo</dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900">
            {operationTypeLabel}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">
            {transaction.dataEfetivacao
              ? "Data da efetivação"
              : "Data programada"}
          </dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900">
            {date ? new Date(date).toLocaleString("pt-BR") : "Não disponível"}
          </dd>
        </div>
        {transaction.dataAgendamento && transaction.dataEfetivacao && (
          <div>
            <dt className="text-xs text-gray-500">Agendado originalmente para</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">
              {new Date(transaction.dataAgendamento).toLocaleString("pt-BR")}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-gray-500">Origem (Pagador)</dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900">
            {originName}
            <span className="block break-all font-normal text-gray-500">
              {formatAccount(origin, transaction.contaOrigemId)}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Destino (Recebedor)</dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900">
            {destinationName}
            <span className="block break-all font-normal text-gray-500">
              {formatAccount(
                transaction.contaDestino,
                transaction.contaDestinoId,
              )}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Solicitante / Autenticação</dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900">
            {authenticatedBy}
            {transaction.usuarioSolicitanteId && (
              <span className="block break-all font-normal text-gray-500">
                ID {transaction.usuarioSolicitanteId}
              </span>
            )}
          </dd>
        </div>
        {transaction.chavePixUtilizada && (
          <div>
            <dt className="text-xs text-gray-500">Chave Pix</dt>
            <dd className="mt-1 break-all text-sm font-semibold text-gray-900">
              {transaction.chavePixUtilizada}
            </dd>
          </div>
        )}
        {transaction.motivoEstorno && (
          <div className="sm:col-span-2">
            <dt className="text-xs text-gray-500">Motivo da devolução</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">
              {transaction.motivoEstorno}
            </dd>
          </div>
        )}
        {transaction.transacaoExternaId && (
          <div>
            <dt className="text-xs text-gray-500">Identificador externo</dt>
            <dd className="mt-1 break-all text-sm font-semibold text-gray-900">
              {transaction.transacaoExternaId}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
