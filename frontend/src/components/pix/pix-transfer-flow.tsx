"use client";

import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { StepKey } from "./steps/step-key";
import { StepValue } from "./steps/step-value";
import { StepConfirm } from "./steps/step-confirm";
import { Button } from "@/components/ui/button";

import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

interface Recipient {
  chavePix: string;
  tipoChave: string;
  nomeCompleto: string;
  documentoMascarado: string;
}

export function PixTransferFlow() {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNextKey = (rec: Recipient) => {
    setRecipient(rec);
    setStep(2);
  };

  const handleNextValue = (val: number) => {
    setAmount(val);
    setStep(3);
  };

  const handleConfirm = async (password: string) => {
    if (!recipient) return;
    setLoading(true);
    setError("");
    try {
      await api.post('/pix/transferencia', {
        chavePixDestino: recipient.chavePix,
        valor: amount,
      });
      setStep(4);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao transferir");
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setRecipient(null);
    setAmount(0);
  };

  const stepTitles = {
    1: "Passo 1 de 3: Identificar Destinatário",
    2: "Passo 2 de 3: Inserir Valor e Data",
    3: "Passo 3 de 3: Revisão e Senha",
    4: "Transferência Realizada",
  };

  const stepProgress = {
    1: "33%",
    2: "66%",
    3: "100%",
    4: "100%",
  };

  if (step === 4) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-2xl font-bold text-gray-900">Transferência Concluída!</h2>
          <p className="text-gray-500 text-center">
            Sua transferência de <strong>{amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong> para <strong>{recipient?.nomeCompleto}</strong> foi enviada com sucesso.
          </p>
        </div>
        <Button onClick={resetFlow} className="mt-4 bg-gray-900 hover:bg-black text-white w-full max-w-xs">
          Nova Transferência
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
      
      {/* Progress Header */}
      <div className="p-6 border-b border-gray-100 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
              {step}
            </div>
            <h3 className="font-bold text-gray-900 text-sm sm:text-base">
              {stepTitles[step]}
            </h3>
          </div>
          <span className="text-xs font-semibold text-gray-500">
            Etapa {stepProgress[step]}
          </span>
        </div>
        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-indigo-600 h-full transition-all duration-500" 
            style={{ width: stepProgress[step] }} 
          />
        </div>
      </div>

      {/* Steps Content */}
      <div className="flex-1">
        {step === 1 && <StepKey onNext={handleNextKey} />}
        {step === 2 && recipient && <StepValue recipient={recipient} onNext={handleNextValue} onBack={() => setStep(1)} />}
        {step === 3 && recipient && <StepConfirm recipient={recipient} amount={amount} onNext={handleConfirm} loading={loading} error={error} onBack={() => setStep(2)} />}
      </div>
    </div>
  );
}
