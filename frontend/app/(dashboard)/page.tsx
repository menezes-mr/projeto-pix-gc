"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BalanceCard } from "@/components/dashboard/balance-card";
import { FinancialSummary } from "@/components/dashboard/financial-summary";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { KeysAndContacts } from "@/components/dashboard/keys-and-contacts";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import type { PixTransaction } from "@/components/pix/pix-receipt";

interface TransactionsResponse {
  data: PixTransaction[];
}

export default function HomePage() {
  const { user } = useAuth();
  const contaId = user?.contaId;
  const activeKey = contaId || "home-default";

  const [transactions, setTransactions] = useState<PixTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  const loadTransactions = useCallback(async () => {
    if (!contaId) return;
    setLoadingTransactions(true);
    try {
      const res = await api.get<TransactionsResponse>(
        `/contas/${contaId}/transacoes`,
        {
          params: { page: 1, limit: 30 },
        },
      );
      setTransactions(res.data.data || []);
    } catch {
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  }, [contaId]);

  useEffect(() => {
    if (!contaId) return;
    let active = true;

    api
      .get<TransactionsResponse>(`/contas/${contaId}/transacoes`, {
        params: { page: 1, limit: 30 },
      })
      .then((res) => {
        if (active) setTransactions(res.data.data || []);
      })
      .catch(() => {
        if (active) setTransactions([]);
      })
      .finally(() => {
        if (active) setLoadingTransactions(false);
      });

    return () => {
      active = false;
    };
  }, [contaId]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
      <BalanceCard />

      <FinancialSummary
        transactions={transactions}
        loading={loadingTransactions}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2">
          <RecentTransactions
            transactions={transactions}
            loading={loadingTransactions}
            onRefresh={loadTransactions}
          />
        </div>
        <div className="lg:col-span-1">
          <KeysAndContacts key={`keys-${activeKey}`} />
        </div>
      </div>
    </div>
  );
}
