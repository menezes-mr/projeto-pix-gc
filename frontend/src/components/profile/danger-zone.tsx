"use client";

import React, { useState } from "react";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";

export function DangerZone() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasBalance = (user?.balance || 0) > 0;
  
  const formattedBalance = (user?.balance ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const handleInativarUsuario = async () => {
    if (!user?.id) return;
    if (!window.confirm("Deseja realmente inativar seu usuário? Esta ação impedirá novos acessos.")) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.delete(`/usuarios/${user.id}`);
      logout();
    } catch (err: unknown) {
      if (isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || "Erro ao inativar usuário.");
      } else {
        setError("Erro ao inativar usuário.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEncerrarConta = async () => {
    if (!user?.contaId) return;
    if (!window.confirm("Deseja realmente encerrar sua conta bancária?")) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.delete(`/contas/${user.contaId}`);
      logout();
    } catch (err: unknown) {
      if (isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || "Erro ao encerrar conta.");
      } else {
        setError("Erro ao encerrar conta.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-red-50/50 rounded-xl border border-red-200 p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-red-600 mb-2">
        <AlertTriangle className="w-5 h-5" />
        <h3 className="font-semibold">Encerramento</h3>
      </div>

      <p className="text-sm text-gray-600">
        Gerencie a suspensão temporária do acesso ou dê baixa definitiva na sua conta digital.
      </p>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mt-2">
        <Button 
          type="button"
          onClick={handleInativarUsuario}
          disabled={loading}
          className="flex-1 bg-transparent hover:bg-red-50 text-red-600 border border-red-200 shadow-sm h-11"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Inativar Usuário"}
        </Button>
        <Button 
          type="button"
          onClick={handleEncerrarConta}
          disabled={hasBalance || loading || !user?.contaId}
          className="flex-1 bg-transparent border border-gray-200 text-gray-400 shadow-sm h-11 disabled:bg-transparent disabled:opacity-50 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Encerrar Conta Bancária"}
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
