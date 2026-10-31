"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/contexts/auth-context";
import { Loader2, ShieldAlert, LogOut, RefreshCw } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout, refreshAccount } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.contaId) {
      refreshAccount();
    }
  }, [user?.contaId, refreshAccount]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (user.accountStatus === "BLOQUEADA") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-lg bg-slate-900 border border-red-900/50 rounded-2xl p-8 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-amber-500" />

          <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-800/80 flex items-center justify-center text-red-400 mb-6 shadow-inner">
            <ShieldAlert className="w-9 h-9" />
          </div>

          <span className="text-[11px] font-bold uppercase tracking-widest text-red-400 bg-red-950/40 border border-red-800/50 px-3 py-1 rounded-full mb-3">
            SEGURANÇA PREVENTIVA • CONTA SUSPENSA
          </span>

          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
            Acesso Temporariamente Bloqueado
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            Por suspeita de fraude ou ordem de compliance administrativo, o acesso à sua conta corrente, visualização de perfil e transferências PIX foram suspensos preventivamente.
          </p>

          <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 mb-6 text-xs text-left flex flex-col gap-2">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-slate-400">Titular da Conta</span>
              <span className="font-semibold text-white">{user.name}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-slate-400">Agência / Conta</span>
              <span className="font-mono font-semibold text-white">Ag {user.agency || "0001"} • CC {user.accountNumber || "---"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Status Atual</span>
              <span className="font-bold text-red-400 uppercase">BLOQUEADA POR FRAUDE</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-6">
            Se você acredita que isso é um equívoco, entre em contato com o suporte ou aguarde a liberação pelo administrador do sistema.
          </p>

          <div className="w-full flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => refreshAccount()}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2.5 px-4 rounded-xl text-xs inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Verificar se Desbloqueada
            </button>
            <button
              type="button"
              onClick={logout}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-medium py-2.5 px-4 rounded-xl text-xs inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-red-600/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
