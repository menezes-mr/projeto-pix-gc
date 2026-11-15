"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Recipient {
  chavePix: string;
  tipoChave: string;
  nomeCompleto: string;
  documentoMascarado: string;
}

interface StepConfirmProps {
  recipient: Recipient;
  amount: number;
  scheduledAt: string | null;
  onNext: () => void;
  loading: boolean;
  error: string;
  onBack: () => void;
}

export function StepConfirm({ recipient, amount, scheduledAt, onNext, loading, error, onBack }: StepConfirmProps) {
  const formattedAmount = amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-bold text-gray-900 text-center">Revisão e Senha</h3>
        <p className="text-sm text-gray-500 text-center mb-4">
          Confira os dados antes de confirmar a transferência.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center pb-3 border-b border-gray-200">
          <span className="text-sm text-gray-500">Valor a transferir</span>
          <span className="text-lg font-bold text-gray-900">{formattedAmount}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Para</span>
          <span className="text-sm font-semibold text-gray-900">{recipient.nomeCompleto}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Chave PIX</span>
          <span className="text-sm font-semibold text-gray-900">{recipient.chavePix} ({recipient.tipoChave})</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Envio</span>
          <span className="text-sm font-semibold text-gray-900">
            {scheduledAt ? new Date(scheduledAt).toLocaleString("pt-BR") : "Imediato"}
          </span>
        </div>
      </div>

      {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex flex-col gap-3 mt-4">
        <Button 
          type="button"
          onClick={onNext}
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-lg gap-2"
        >
          <CheckCircle2 className="w-5 h-5" />
          {loading ? "Confirmando..." : "Confirmar Transferência"}
        </Button>
        <Button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="w-full h-12 text-lg bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-100"
        >
          Voltar
        </Button>
      </div>
    </div>
  );
}
