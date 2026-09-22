"use client";

import React, { useState } from "react";
import { Eye, EyeOff, Zap } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export function BalanceCard() {
  const { user } = useAuth();
  const [showBalance, setShowBalance] = useState(true);

  const formattedBalance = user?.balance?.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  }) || "R$ 0,00";

  return (
    <div className="w-full bg-gradient-to-r from-[#3b3c5a] via-[#484ea3] to-[#5b63e4] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
      
      {/* Saldo Section */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white/70">Saldo disponível</span>
        <button
          onClick={() => setShowBalance(!showBalance)}
          className="text-white/70 hover:text-white transition-colors"
        >
          {showBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
        </button>
      </div>
      
      <div className="mb-6">
        <h2 className="text-4xl font-bold tracking-tight">
          {showBalance ? formattedBalance : "R$ •••••"}
        </h2>
      </div>

      {/* Limite PIX Section */}
      <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-xs font-medium">
        <Zap className="w-3 h-3 text-green-300 fill-green-300" />
        <span className="text-white/80">
          Limite Diário PIX: <strong className="text-white">R$ 1.000,00</strong>
        </span>
      </div>
    </div>
  );
}
