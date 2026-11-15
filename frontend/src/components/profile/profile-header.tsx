"use client";

import React, { useState } from "react";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export function ProfileHeader() {
  const { user, switchAccount } = useAuth();
  const [switching, setSwitching] = useState(false);
  const currentRole = user?.role || "TITULAR";

  const handleSwitch = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetId = e.target.value;
    if (!targetId || targetId === user?.contaId) return;
    setSwitching(true);
    try {
      await switchAccount(targetId);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-bold text-gray-900">
            {user?.name || "Usuário"}
          </h2>
          <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            {currentRole}
          </span>
        </div>
        <p className="text-sm text-gray-500">
          BancoDigital Ag {user?.agency || "0001"} • C/C{" "}
          {user?.accountNumber || "---"} •{" "}
          {currentRole === "TITULAR"
            ? "Titular da Conta"
            : `Cotitular (${currentRole})`}
        </p>
      </div>

      {user?.accounts && user.accounts.length > 1 && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Conta Ativa na Sessão
          </span>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            {switching ? (
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
            ) : (
              <ArrowLeftRight className="w-4 h-4 text-indigo-600 shrink-0" />
            )}
            <select
              value={user.contaId || ""}
              onChange={(e) => void handleSwitch(e)}
              disabled={switching}
              className="bg-transparent text-xs font-semibold text-gray-800 focus:outline-none cursor-pointer"
            >
              {user.accounts.map((acc) => (
                <option key={acc.contaId} value={acc.contaId}>
                  Ag {acc.agencia} • C/C {acc.numeroConta} — {acc.papel} (
                  {acc.titularNome})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
