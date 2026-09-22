"use client";

import React, { useState } from "react";
import { Eye, CheckCircle2, AlertCircle, Calendar, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

interface StepValueProps {
  recipientKey: string;
  onNext: (amount: number) => void;
}

export function StepValue({ recipientKey, onNext }: StepValueProps) {
  const { user } = useAuth();
  const balance = user?.balance || 5000;
  
  const [amountStr, setAmountStr] = useState("");
  
  const formattedBalance = balance.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const rawAmount = parseFloat(amountStr.replace(/\./g, "").replace(",", ".")) || 0;
  const isInsufficient = rawAmount > balance;
  const isValid = rawAmount > 0 && !isInsufficient;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val === "") {
      setAmountStr("");
      return;
    }
    const num = parseInt(val, 10) / 100;
    setAmountStr(num.toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
  };

  const setFixedAmount = (val: number) => {
    setAmountStr(val.toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      
      {/* Saldo Block */}
      <div className="bg-gray-900 rounded-xl p-6 text-white relative overflow-hidden flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-bold tracking-wider">
            SALDO EM CONTA <Eye className="w-4 h-4" />
          </div>
          <div className="bg-white/10 px-3 py-1 rounded-full text-xs font-medium">
            Limite Diário: R$ 1.000,00
          </div>
        </div>
        <div className="text-3xl font-bold">
          {formattedBalance}
        </div>
      </div>

      {/* Bloco com Destinatário Validado */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 mt-0.5">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-emerald-600 tracking-wider">DESTINATÁRIO VALIDADO</span>
            <span className="text-sm font-bold text-gray-900 mt-1">João Silva</span>
            <span className="text-xs text-gray-500">CPF: ***.123.456-**</span>
          </div>
        </div>
        <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
          Trocar
        </button>
      </div>

      {/* Campo de valor */}
      <div className="flex flex-col items-center gap-4 py-4">
        <span className="text-sm font-medium text-gray-600">Qual o valor da transferência?</span>
        
        <div className="flex flex-col items-center w-full">
          <div className="flex items-center justify-center border-b-2 focus-within:border-indigo-600 border-gray-300 w-full max-w-xs transition-colors">
            <span className={`text-4xl font-bold mr-2 ${isInsufficient ? 'text-red-600' : 'text-gray-900'}`}>R$</span>
            <input 
              type="text"
              value={amountStr}
              onChange={handleAmountChange}
              placeholder="0,00"
              className={`text-5xl font-bold bg-transparent outline-none w-full text-center py-2 ${isInsufficient ? 'text-red-600' : 'text-gray-900'}`}
            />
          </div>
          
          {isInsufficient && (
            <div className="flex items-center gap-1.5 mt-3 text-red-600 text-sm font-medium">
              <AlertCircle className="w-4 h-4" />
              <span>Saldo insuficiente para esta transação.</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-2">
          <button onClick={() => setFixedAmount(50)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-semibold text-gray-700 transition-colors">
            R$ 50,00
          </button>
          <button onClick={() => setFixedAmount(100)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-semibold text-gray-700 transition-colors">
            R$ 100,00
          </button>
          <button onClick={() => setFixedAmount(balance)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-semibold text-gray-700 transition-colors">
            Tudo ({formattedBalance})
          </button>
        </div>
      </div>

      {/* Date Block */}
      <div className="border border-gray-200 bg-gray-50/50 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">Data de Envio</span>
            <span className="text-sm font-semibold text-gray-900">Hoje (Transferência imediata)</span>
          </div>
        </div>
        <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
          Agendar
        </button>
      </div>

      <Button 
        onClick={() => onNext(rawAmount)}
        disabled={!isValid}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-lg gap-2 mt-4 disabled:bg-gray-200 disabled:text-gray-400"
      >
        <Lock className="w-5 h-5" />
        Continuar
      </Button>

    </div>
  );
}
