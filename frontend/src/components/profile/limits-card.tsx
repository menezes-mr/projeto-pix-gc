"use client";

import React, { useState } from "react";
import { SlidersHorizontal, Wallet, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

export function LimitsCard() {
  const { user, updateDailyLimit } = useAuth();
  const [pixLimit, setPixLimit] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const currentLimit = pixLimit ?? (user?.dailyLimit ?? 1000);

  const formattedBalance = (user?.balance ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const formattedLimit = currentLimit.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateDailyLimit(currentLimit);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
    } finally {
      setSaving(false);
    }
  };

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
          value={currentLimit} 
          onChange={(e) => {
            setPixLimit(Number(e.target.value));
            setSaved(false);
          }}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        
        <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
          <span>R$ 0</span>
          <span>R$ 5.000,00</span>
        </div>
      </div>

      {saved && (
        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Limite atualizado com sucesso!</span>
        </div>
      )}

      <div className="flex justify-end mt-1">
        <Button 
          type="button"
          onClick={handleSave} 
          disabled={saving || currentLimit === user?.dailyLimit}
          className="bg-indigo-600 hover:bg-indigo-700 gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? "Salvando..." : "Salvar Limite"}
        </Button>
      </div>
    </div>
  );
}
