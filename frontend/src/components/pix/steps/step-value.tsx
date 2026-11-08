"use client";

import React, { useState } from "react";
import { Eye, CheckCircle2, AlertCircle, Calendar, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

interface Recipient {
  chavePix: string;
  tipoChave: string;
  nomeCompleto: string;
  documentoMascarado: string;
}

interface StepValueProps {
  recipient: Recipient;
  onNext: (amount: number, scheduledAt: string | null) => void;
  onBack: () => void;
}

function toLocalDateTimeValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function StepValue({ recipient, onNext, onBack }: StepValueProps) {
  const { user } = useAuth();
  const balance = user?.balance || 5000;
  const dailyLimit = user?.dailyLimit ?? 1000;
  
  const [amountStr, setAmountStr] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "scheduled">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [minimumScheduleLocal, setMinimumScheduleLocal] = useState("");
  const [scheduleDateValid, setScheduleDateValid] = useState(false);
  
  const formattedBalance = balance.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const rawAmount = parseFloat(amountStr.replace(/\./g, "").replace(",", ".")) || 0;
  const isInsufficient = scheduleMode === "now" && rawAmount > balance;
  const isOverLimit = rawAmount > dailyLimit;
  const isScheduleInvalid = scheduleMode === "scheduled" && (!scheduledAt || !scheduleDateValid);
  const isValid = rawAmount > 0 && !isInsufficient && !isOverLimit && !isScheduleInvalid;

  const openSchedulePicker = () => {
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setMinimumScheduleLocal(toLocalDateTimeValue(tomorrow));
    setScheduleMode("scheduled");
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
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
      
      <div className="bg-gray-900 rounded-xl p-6 text-white relative overflow-hidden flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400 text-xs font-bold tracking-wider">
            SALDO EM CONTA <Eye className="w-4 h-4" />
          </div>
          <div className="bg-white/10 px-3 py-1 rounded-full text-xs font-medium">
            Limite Diário: {dailyLimit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
        </div>
        <div className="text-3xl font-bold">
          {formattedBalance}
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 mt-0.5">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-emerald-600 tracking-wider">DESTINATÁRIO VALIDADO</span>
            <span className="text-sm font-bold text-gray-900 mt-1">{recipient.nomeCompleto}</span>
            <span className="text-xs text-gray-500">Chave: {recipient.chavePix} ({recipient.tipoChave})</span>
          </div>
        </div>
        <button onClick={onBack} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
          Trocar
        </button>
      </div>

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
          {isOverLimit && (
            <div className="flex items-center gap-1.5 mt-3 text-red-600 text-sm font-medium">
              <AlertCircle className="w-4 h-4" />
              <span>O valor ultrapassa seu limite diário de Pix.</span>
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

      <div className="border border-gray-200 bg-gray-50/50 rounded-xl p-4 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">Quando enviar</span>
            <span className="text-sm font-semibold text-gray-900">
              {scheduleMode === "now" ? "Agora (transferência imediata)" : "Agendamento"}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 rounded-lg border border-gray-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setScheduleMode("now")}
            aria-pressed={scheduleMode === "now"}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${scheduleMode === "now" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Agora
          </button>
          <button
            type="button"
            onClick={openSchedulePicker}
            aria-pressed={scheduleMode === "scheduled"}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${scheduleMode === "scheduled" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Agendar
          </button>
        </div>
        {scheduleMode === "scheduled" && (
          <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            Data e hora (a partir de amanhã)
            <input
              type="datetime-local"
              value={scheduledAt}
              min={minimumScheduleLocal}
              onChange={(event) => {
                const value = event.target.value;
                setScheduledAt(value);
                setScheduleDateValid(
                  Boolean(value) && new Date(value).getTime() >= new Date(minimumScheduleLocal).getTime(),
                );
              }}
              className="h-11 rounded-md border border-gray-300 bg-white px-3 text-gray-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              required
            />
            {scheduledAt && !scheduleDateValid && (
              <span className="text-xs font-medium text-red-600">Escolha uma data a partir de amanhã.</span>
            )}
            <span className="text-xs font-normal text-gray-500">
              O saldo será debitado quando o Pix for processado.
            </span>
          </label>
        )}
      </div>

      <Button 
        onClick={() => onNext(rawAmount, scheduleMode === "scheduled" ? scheduledAt : null)}
        disabled={!isValid}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-lg gap-2 mt-4 disabled:bg-gray-200 disabled:text-gray-400"
      >
        <Lock className="w-5 h-5" />
        Continuar
      </Button>

    </div>
  );
}
