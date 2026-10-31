"use client";

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Zap } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export function BalanceCard() {
  const { user, refreshAccount } = useAuth();
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    refreshAccount();
  }, [refreshAccount]);

  const formattedBalance = (user?.balance ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const formattedLimit = (user?.dailyLimit ?? 1000).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <div className="w-full bg-gradient-to-r from-[#3b3c5a] via-[#484ea3] to-[#5b63e4] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-white/70">Saldo disponível</span>
          {user?.accountNumber && (
            <span className="text-xs text-white/50">
              Agência {user.agency || "0001"} • Conta {user.accountNumber}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowBalance(!showBalance)}
          className="text-white/70 hover:text-white transition-colors cursor-pointer"
        >
          {showBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-4xl font-bold tracking-tight">
          {showBalance ? formattedBalance : "R$ •••••"}
        </h2>
      </div>

      <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-xs font-medium">
        <Zap className="w-3 h-3 text-green-300 fill-green-300" />
        <span className="text-white/80">
          Limite Diário PIX: <strong className="text-white">{formattedLimit}</strong>
        </span>
      </div>
    </div>
  );
}
