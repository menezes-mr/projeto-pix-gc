"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Gauge,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import type { PixTransaction } from "@/components/pix/pix-receipt";

function toNumericValue(value: number | string | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function isSameLocalDay(dateIso: string | null | undefined, now: Date): boolean {
  if (!dateIso) return false;
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isSameLocalMonth(
  dateIso: string | null | undefined,
  now: Date,
): boolean {
  if (!dateIso) return false;
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
}

interface FinancialSummaryProps {
  transactions: PixTransaction[];
  loading: boolean;
}

export function FinancialSummary({
  transactions,
  loading,
}: FinancialSummaryProps) {
  const { user } = useAuth();
  const contaId = user?.contaId;
  const dailyLimit = user?.dailyLimit ?? 1000;

  const { entradasMes, saidasMes, qtdEfetivadasMes, usadoHoje } =
    useMemo(() => {
      if (!contaId) {
        return {
          entradasMes: 0,
          saidasMes: 0,
          qtdEfetivadasMes: 0,
          usadoHoje: 0,
        };
      }

      const now = new Date();
      let totalIn = 0;
      let totalOut = 0;
      let countEfetivadas = 0;
      let totalTodayOut = 0;

      for (const tx of transactions) {
        const isEfetivada =
          tx.status === "EFETIVADA" || tx.status === "CONCLUIDA";
        if (!isEfetivada) continue;
        if (!isSameLocalMonth(tx.dataEfetivacao, now)) continue;

        const val = toNumericValue(tx.valor);
        countEfetivadas += 1;

        if (tx.contaDestinoId === contaId && tx.contaOrigemId !== contaId) {
          totalIn += val;
        } else if (tx.contaOrigemId === contaId) {
          totalOut += val;
          if (
            tx.tipoOperacao === "TRANSFERENCIA_SAIDA" &&
            isSameLocalDay(tx.dataEfetivacao, now)
          ) {
            totalTodayOut += val;
          }
        }
      }

      return {
        entradasMes: totalIn,
        saidasMes: totalOut,
        qtdEfetivadasMes: countEfetivadas,
        usadoHoje: totalTodayOut,
      };
    }, [contaId, transactions]);

  const balancoMes = entradasMes - saidasMes;
  const percentualLimite =
    dailyLimit > 0
      ? Math.min(100, Math.round((usadoHoje / dailyLimit) * 100))
      : 0;
  const disponivelHoje = Math.max(0, dailyLimit - usadoHoje);

  const formatBrl = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const nomeMes = new Date().toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <section
      aria-label="Resumo Financeiro do Mês"
      className="flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">
          Resumo Financeiro ({nomeMes})
        </h2>
        <span className="text-xs font-medium text-gray-600">
          {qtdEfetivadasMes}{" "}
          {qtdEfetivadasMes === 1
            ? "operação efetivada"
            : "operações efetivadas"}{" "}
          no mês
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-gray-700 uppercase">
            <span>Entradas no Mês</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <Loader2 className="w-5 h-5 text-emerald-600 animate-spin my-1" />
          ) : (
            <div className="text-2xl font-bold text-emerald-700">
              {formatBrl(entradasMes)}
            </div>
          )}
          <span className="text-xs text-gray-600">
            PIX recebidos e devoluções creditadas
          </span>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-gray-700 uppercase">
            <span>Saídas no Mês</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <Loader2 className="w-5 h-5 text-rose-600 animate-spin my-1" />
          ) : (
            <div className="text-2xl font-bold text-gray-900">
              {formatBrl(saidasMes)}
            </div>
          )}
          <span className="text-xs text-gray-600">
            Transferências e estornos enviados
          </span>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-gray-700 uppercase">
            <span>Balanço do Período</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin my-1" />
          ) : (
            <div
              className={`text-2xl font-bold ${
                balancoMes >= 0 ? "text-emerald-700" : "text-rose-600"
              }`}
            >
              {balancoMes > 0
                ? `+${formatBrl(balancoMes)}`
                : formatBrl(balancoMes)}
            </div>
          )}
          <span className="text-xs text-gray-600">
            Resultado líquido de movimentações no mês
          </span>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-gray-700 uppercase">
            <span>Limite Diário Hoje</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <Loader2 className="w-5 h-5 text-amber-600 animate-spin my-1" />
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold text-gray-900">
                  {formatBrl(disponivelHoje)}
                </span>
                <span className="text-[11px] font-semibold text-gray-600">
                  {percentualLimite}% usado
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    percentualLimite >= 90
                      ? "bg-rose-500"
                      : percentualLimite >= 60
                        ? "bg-amber-500"
                        : "bg-indigo-600"
                  }`}
                  style={{ width: `${percentualLimite}%` }}
                />
              </div>
            </div>
          )}
          <div className="flex items-center justify-between text-[11px] text-gray-600 font-medium">
            <span>Usado: {formatBrl(usadoHoje)}</span>
            <Link
              href="/perfil"
              className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700"
            >
              <SlidersHorizontal className="w-3 h-3" />
              Ajustar
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
