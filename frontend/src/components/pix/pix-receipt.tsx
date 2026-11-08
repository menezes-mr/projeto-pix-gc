"use client";

import { Printer } from "lucide-react";

export interface PixAccountSummary {
  contaId: string;
  agencia?: string;
  numeroConta?: string;
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
  PENDENTE: "Pendente",
  CANCELADA: "Cancelada",
  FALHA: "Falha",
};

function formatAccount(account?: PixAccountSummary | null, fallbackId?: string | null) {
  if (!account) return fallbackId || "Não informado";
  const number = account.numeroConta
    ? `${account.numeroConta}${account.agencia ? ` · Ag. ${account.agencia}` : ""}`
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
  const isOutgoing = accountId
    ? transaction.contaOrigemId === accountId
    : transaction.tipoOperacao === "TRANSFERENCIA_SAIDA";
  const origin = transaction.contaOrigem || (isOutgoing ? originAccount : undefined);
  const date = transaction.dataEfetivacao || transaction.dataAgendamento;
  const authenticatedBy =
    transaction.usuarioSolicitante?.nomeCompleto ||
    authenticatedUserName ||
    (transaction.usuarioSolicitanteId ? "Usuário autenticado" : "Sessão autenticada (JWT)");

  return (
    <section className="pix-receipt rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Comprovante Pix</h2>
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
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-gray-500">Valor</dt>
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
            {isOutgoing ? "Pix enviado" : "Pix recebido"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">
            {transaction.dataEfetivacao ? "Data da transação" : "Data agendada"}
          </dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900">
            {date ? new Date(date).toLocaleString("pt-BR") : "Não disponível"}
          </dd>
        </div>
        {transaction.dataAgendamento && transaction.dataEfetivacao && (
          <div>
            <dt className="text-xs text-gray-500">Agendado para</dt>
            <dd className="mt-1 text-sm font-semibold text-gray-900">
              {new Date(transaction.dataAgendamento).toLocaleString("pt-BR")}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-gray-500">Origem</dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900">
            {isOutgoing ? authenticatedUserName || "Conta de origem" : "Conta de origem externa"}
            <span className="block break-all font-normal text-gray-500">
              {formatAccount(origin, transaction.contaOrigemId)}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Destino</dt>
          <dd className="mt-1 text-sm font-semibold text-gray-900">
            {isOutgoing ? recipientName || "Conta de destino" : authenticatedUserName || "Sua conta"}
            <span className="block break-all font-normal text-gray-500">
              {formatAccount(transaction.contaDestino, transaction.contaDestinoId)}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Autenticação</dt>
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
