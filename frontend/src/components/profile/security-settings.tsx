"use client";

import React, { useState } from "react";
import { Shield, MessageSquare, Mail, Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export function SecuritySettings() {
  const [sms, setSms] = useState(true);
  const [email, setEmail] = useState(true);
  const [push, setPush] = useState(true);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-6">
      <div className="flex items-center gap-2 text-indigo-600 mb-2">
        <Shield className="w-5 h-5" />
        <h3 className="font-semibold text-gray-900">Notificações de Segurança</h3>
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
          <Switch checked={sms} onChange={() => setSms(!sms)} />
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
          <Switch checked={email} onChange={() => setEmail(!email)} />
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
          <Switch checked={push} onChange={() => setPush(!push)} />
        </div>
      </div>
    </div>
  );
}
