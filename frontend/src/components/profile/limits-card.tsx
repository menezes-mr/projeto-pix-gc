"use client";

import React, { useState } from "react";
import { SlidersHorizontal, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export function LimitsCard() {
  const { user } = useAuth();
  const [pixLimit, setPixLimit] = useState(3100);

  const formattedBalance = user?.balance?.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  }) || "R$ 50,00";

  const formattedLimit = pixLimit.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-6">
      <div className="flex items-center gap-2 text-indigo-600 mb-2">
        <SlidersHorizontal className="w-5 h-5" />
        <h3 className="font-semibold text-gray-900">Ajustes da Conta e Limites</h3>
      </div>

      <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
            Saldo Disponível
          </span>
          <span className="text-2xl font-bold text-gray-900">
            {formattedBalance}
          </span>
        </div>
        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
          <Wallet className="w-5 h-5" />
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Limite Diário PIX</span>
          <span className="text-sm font-bold text-indigo-600">{formattedLimit}</span>
        </div>
        
        <input 
          type="range" 
          min="0" 
          max="5000" 
          step="100"
          value={pixLimit} 
          onChange={(e) => setPixLimit(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        
        <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
          <span>R$ 0</span>
          <span>R$ 5.000,00</span>
        </div>
      </div>
    </div>
  );
}
