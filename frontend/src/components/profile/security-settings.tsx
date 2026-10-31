"use client";

import React, { useState } from "react";
import { Shield, MessageSquare, Mail, Bell, CheckCircle2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/auth-context";

export function SecuritySettings() {
  const { user, updateProfile } = useAuth();
  const [customSms, setCustomSms] = useState<boolean | null>(null);
  const [customEmail, setCustomEmail] = useState<boolean | null>(null);
  const [customPush, setCustomPush] = useState<boolean | null>(null);
  const [savedMessage, setSavedMessage] = useState("");

  const sms = customSms ?? (user?.receberSms ?? false);
  const email = customEmail ?? (user?.receberEmail ?? false);
  const push = customPush ?? (user?.receberPush ?? false);

  const handleToggle = async (
    key: "receberSms" | "receberEmail" | "receberPush",
    val: boolean,
  ) => {
    if (key === "receberSms") setCustomSms(val);
    if (key === "receberEmail") setCustomEmail(val);
    if (key === "receberPush") setCustomPush(val);

    try {
      await updateProfile({ [key]: val });
      setSavedMessage("Preferência salva!");
      setTimeout(() => setSavedMessage(""), 2500);
    } catch {}
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-indigo-600">
          <Shield className="w-5 h-5" />
          <h3 className="font-semibold text-gray-900">Notificações de Segurança</h3>
        </div>
        {savedMessage && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{savedMessage}</span>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-2">
        Mantenha as chaves ativas para ser avisado em tempo real ao receber ou enviar transferências PIX.
      </p>

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900">Alertas por SMS</span>
              <span className="text-xs text-gray-500">Receba código de segurança e confirmações no celular</span>
            </div>
          </div>
          <Switch checked={sms} onChange={() => handleToggle("receberSms", !sms)} />
        </div>
        
        <hr className="border-gray-50" />

        <div className="flex items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
              <Mail className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900">Alertas por E-mail</span>
              <span className="text-xs text-gray-500">Relatórios consolidados e comprovantes por correio eletrônico</span>
            </div>
          </div>
          <Switch checked={email} onChange={() => handleToggle("receberEmail", !email)} />
        </div>

        <hr className="border-gray-50" />

        <div className="flex items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900">Notificações Push</span>
              <span className="text-xs text-gray-500">Avisos instantâneos de movimentações no aplicativo desktop e mobile</span>
            </div>
          </div>
          <Switch checked={push} onChange={() => handleToggle("receberPush", !push)} />
        </div>
      </div>
    </div>
  );
}
