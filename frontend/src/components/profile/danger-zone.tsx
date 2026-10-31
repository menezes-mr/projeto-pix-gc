"use client";

import React from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

export function DangerZone() {
  const { user } = useAuth();
  const hasBalance = (user?.balance || 0) > 0;
  
  const formattedBalance = user?.balance?.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  }) || "R$ 0,00";

  return (
    <div className="bg-red-50/50 rounded-xl border border-red-200 p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-red-600 mb-2">
        <AlertTriangle className="w-5 h-5" />
        <h3 className="font-semibold">Encerramento</h3>
      </div>

      <p className="text-sm text-gray-600">
        Gerencie a suspensão temporária do acesso ou dê baixa definitiva na sua conta digital.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mt-2">
        <Button className="flex-1 bg-transparent hover:bg-red-50 text-red-600 border border-red-200 shadow-sm h-11">
          Inativar Usuário
        </Button>
        <Button 
          disabled={hasBalance}
          className="flex-1 bg-transparent border border-gray-200 text-gray-400 shadow-sm h-11 disabled:bg-transparent disabled:opacity-50"
        >
          Encerrar Conta Bancária
        </Button>
      </div>

      {hasBalance && (
        <div className="mt-2 bg-red-50 border border-red-100 rounded-lg p-4 flex gap-3 text-red-600 text-sm items-start">
          <Info className="w-5 h-5 shrink-0" />
          <p>
            Você possui saldo na conta ({formattedBalance}). Transfira todo o valor antes de solicitar o encerramento.
          </p>
        </div>
      )}
    </div>
  );
}
