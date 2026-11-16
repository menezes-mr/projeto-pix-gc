"use client";

import React from "react";
import { BalanceCard } from "@/components/dashboard/balance-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { FinancialSummary } from "@/components/dashboard/financial-summary";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { KeysAndContacts } from "@/components/dashboard/keys-and-contacts";
import { useAuth } from "@/contexts/auth-context";

export default function HomePage() {
  const { user } = useAuth();
  const activeKey = user?.contaId || "home-default";

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
      <BalanceCard />

      <QuickActions />

      <FinancialSummary key={`summary-${activeKey}`} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2">
          <RecentTransactions key={`recent-${activeKey}`} />
        </div>
        <div className="lg:col-span-1">
          <KeysAndContacts key={`keys-${activeKey}`} />
        </div>
      </div>
    </div>
  );
}
