"use client";

import React, { useEffect, useState } from "react";
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
import { api } from "@/lib/api";
import type { PixTransaction } from "@/components/pix/pix-receipt";

interface TransactionsResponse {
  data: PixTransaction[];
  meta: {
    paginaAtual: number;
    totalPaginas: number;
    totalRegistros: number;
  };
}

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

export function FinancialSummary() {
  const { user } = useAuth();
  const contaId = user?.contaId;
  const dailyLimit = user?.dailyLimit ?? 1000;

  const [loading, setLoading] = useState(true);
  const [entradasMes, setEntradasMes] = useState(0);
  const [saidasMes, setSaidasMes] = useState(0);
  const [qtdEfetivadasMes, setQtdEfetivadasMes] = useState(0);
  const [usadoHoje, setUsadoHoje] = useState(0);

  useEffect(() => {
    if (!contaId) return;

    let active = true;
    const now = new Date();
    const firstDayMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    api
      .get<TransactionsResponse>(`/contas/${contaId}/transacoes`, {
        params: {
          page: 1,
          limit: 50,
          dataInicio: firstDayMonth,
          dataFim: todayStr,
        },
      })
      .then((res) => {
        if (!active) return;
        const list = res.data.data || [];
        let totalIn = 0;
        let totalOut = 0;
        let countEfetivadas = 0;
        let totalTodayOut = 0;

        for (const tx of list) {
          const isEfetivada =
            tx.status === "EFETIVADA" || tx.status === "CONCLUIDA";
          if (!isEfetivada) continue;

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

        setEntradasMes(totalIn);
        setSaidasMes(totalOut);
        setQtdEfetivadasMes(countEfetivadas);
        setUsadoHoje(totalTodayOut);
      })
      .catch(() => {
        if (!active) return;
        setEntradasMes(0);
        setSaidasMes(0);
        setQtdEfetivadasMes(0);
        setUsadoHoje(0);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [contaId]);

  const balancoMes = entradasMes - saidasMes;
  const percentualLimite =
    dailyLimit > 0 ? Math.min(100, Math.round((usadoHoje / dailyLimit) * 100)) : 0;
  const disponivelHoje = Math.max(0, dailyLimit - usadoHoje);

  const formatBrl = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const nomeMes = new Date().toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <section aria-label="Resumo Financeiro do Mês" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
          Resumo Financeiro ({nomeMes})
        </h2>
        <span className="text-xs text-gray-400">
          {qtdEfetivadasMes} {qtdEfetivadasMes === 1 ? "operação efetivada" : "operações efetivadas"} no mês
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase">
            <span>Entradas no Mês</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <Loader2 className="w-5 h-5 text-emerald-600 animate-spin my-1" />
          ) : (
            <div className="text-2xl font-bold text-emerald-600">
              {formatBrl(entradasMes)}
            </div>
          )}
          <span className="text-xs text-gray-400">
            PIX recebidos e devoluções creditadas
          </span>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase">
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
          <span className="text-xs text-gray-400">
            Transferências e estornos enviados
          </span>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase">
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
                balancoMes >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {balancoMes > 0 ? `+${formatBrl(balancoMes)}` : formatBrl(balancoMes)}
            </div>
          )}
          <span className="text-xs text-gray-400">
            Resultado líquido de movimentações no mês
          </span>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase">
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
                <span className="text-[11px] font-semibold text-gray-500">
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
          <div className="flex items-center justify-between text-[11px] text-gray-400">
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
