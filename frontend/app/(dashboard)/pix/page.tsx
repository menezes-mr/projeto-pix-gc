"use client";

import React from "react";
import { PixArea } from "@/components/pix/pix-area";
import { useAuth } from "@/contexts/auth-context";

export default function PixPage() {
  const { user } = useAuth();
  const formattedLimit = (user?.dailyLimit ?? 1000).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <div className="flex flex-col gap-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Área PIX</h1>
          <p className="text-sm text-gray-500">
            Faça transferências instantâneas e administre as chaves cadastradas
            {user?.accountNumber ? ` na conta ${user.accountNumber}` : ""}.
          </p>
        </div>
        <div className="bg-gray-100 text-gray-700 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap">
          Limite Diário: {formattedLimit}
        </div>
      </div>

      <PixArea key={user?.contaId || "pix-area"} />
    </div>
  );
}
