"use client";

import React, { useState } from "react";
import {
  Eye,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Lock,
  Info,
} from "lucide-react";
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
  const balance = user?.balance ?? 0;
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

  const rawAmount =
    parseFloat(amountStr.replace(/\./g, "").replace(",", ".")) || 0;
  const isInsufficient = scheduleMode === "now" && rawAmount > balance;
  const isScheduledWithoutCurrentBalance =
    scheduleMode === "scheduled" && rawAmount > balance;
  const isOverLimit = rawAmount > dailyLimit;
  const isScheduleInvalid =
    scheduleMode === "scheduled" && (!scheduledAt || !scheduleDateValid);
  const isValid =
    rawAmount > 0 && !isInsufficient && !isOverLimit && !isScheduleInvalid;

  const applyPresetSchedule = (targetDate: Date) => {
    const minDate = new Date(Date.now() + 60_000);
    const minStr = toLocalDateTimeValue(minDate);
    const valStr = toLocalDateTimeValue(targetDate);
    setMinimumScheduleLocal(minStr);
    setScheduledAt(valStr);
    setScheduleDateValid(targetDate.getTime() > Date.now());
  };

  const openSchedulePicker = () => {
    const minDate = new Date(Date.now() + 60_000);
    setMinimumScheduleLocal(toLocalDateTimeValue(minDate));

    if (!scheduledAt) {
      const tomorrowMorning = new Date();
      tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
      tomorrowMorning.setHours(9, 0, 0, 0);
      setScheduledAt(toLocalDateTimeValue(tomorrowMorning));
      setScheduleDateValid(true);
    }
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
            Limite Diário:{" "}
            {dailyLimit.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </div>
        </div>
        <div className="text-3xl font-bold">{formattedBalance}</div>
      </div>

      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 mt-0.5">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-emerald-600 tracking-wider">
              DESTINATÁRIO VALIDADO
            </span>
            <span className="text-sm font-bold text-gray-900 mt-1">
              {recipient.nomeCompleto}
            </span>
            <span className="text-xs text-gray-500">
              Chave: {recipient.chavePix} ({recipient.tipoChave})
            </span>
          </div>
        </div>
        <button
          onClick={onBack}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          Trocar
        </button>
      </div>

      <div className="flex flex-col items-center gap-4 py-4">
        <span className="text-sm font-medium text-gray-600">
          Qual o valor da transferência?
        </span>

        <div className="flex flex-col items-center w-full">
          <div className="flex items-center justify-center border-b-2 focus-within:border-indigo-600 border-gray-300 w-full max-w-xs transition-colors">
            <span
              className={`text-4xl font-bold mr-2 ${isInsufficient ? "text-red-600" : "text-gray-900"}`}
            >
              R$
            </span>
            <input
              type="text"
              value={amountStr}
              onChange={handleAmountChange}
              placeholder="0,00"
              className={`text-5xl font-bold bg-transparent outline-none w-full text-center py-2 ${isInsufficient ? "text-red-600" : "text-gray-900"}`}
            />
          </div>

          {isInsufficient && (
            <div className="flex items-center gap-1.5 mt-3 text-red-600 text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Saldo insuficiente para envio imediato. Você pode agendar para
                outra data.
              </span>
            </div>
          )}
          {isScheduledWithoutCurrentBalance && !isOverLimit && (
            <div className="flex items-center gap-1.5 mt-3 text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-medium">
              <Info className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                Você não precisa ter saldo agora. Certifique-se de manter saldo
                disponível na data agendada.
              </span>
            </div>
          )}
          {isOverLimit && (
            <div className="flex items-center gap-1.5 mt-3 text-red-600 text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>O valor ultrapassa seu limite diário de Pix.</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-2 flex-wrap justify-center">
          <button
            type="button"
            onClick={() => setFixedAmount(50)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-semibold text-gray-700 transition-colors"
          >
            R$ 50,00
          </button>
          <button
            type="button"
            onClick={() => setFixedAmount(100)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-semibold text-gray-700 transition-colors"
          >
            R$ 100,00
          </button>
          {balance > 0 && (
            <button
              type="button"
              onClick={() => setFixedAmount(balance)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-semibold text-gray-700 transition-colors"
            >
              Tudo ({formattedBalance})
            </button>
          )}
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
              {scheduleMode === "now"
                ? "Agora (débito imediato)"
                : "Agendado (débito na data programada)"}
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
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  d.setHours(9, 0, 0, 0);
                  applyPresetSchedule(d);
                }}
                className="rounded-lg border border-gray-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:text-indigo-700 transition-colors cursor-pointer"
              >
                Amanhã às 09h
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 7);
                  d.setHours(9, 0, 0, 0);
                  applyPresetSchedule(d);
                }}
                className="rounded-lg border border-gray-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:text-indigo-700 transition-colors cursor-pointer"
              >
                Daqui a 7 dias
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(Date.now() + 2 * 60_000);
                  applyPresetSchedule(d);
                }}
                className="rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 transition-colors cursor-pointer"
              >
                Daqui a 2 min (teste rápido)
              </button>
            </div>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
              Data e horário programados
              <input
                type="datetime-local"
                value={scheduledAt}
                min={minimumScheduleLocal}
                onChange={(event) => {
                  const value = event.target.value;
                  setScheduledAt(value);
                  setScheduleDateValid(
                    Boolean(value) && new Date(value).getTime() > Date.now(),
                  );
                }}
                className="h-11 rounded-md border border-gray-300 bg-white px-3 text-gray-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                required
              />
              {scheduledAt && !scheduleDateValid && (
                <span className="text-xs font-medium text-red-600">
                  Escolha uma data e horário futuros.
                </span>
              )}
              <span className="text-xs font-normal text-gray-500">
                O valor só será debitado da sua conta e creditado ao
                destinatário na data programada. Você pode cancelar o
                agendamento a qualquer momento antes da execução.
              </span>
            </label>
          </div>
        )}
      </div>

      <Button
        onClick={() =>
          onNext(rawAmount, scheduleMode === "scheduled" ? scheduledAt : null)
        }
        disabled={!isValid}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-lg gap-2 mt-4 disabled:bg-gray-200 disabled:text-gray-400"
      >
        <Lock className="w-5 h-5" />
        Continuar
      </Button>
    </div>
  );
}
