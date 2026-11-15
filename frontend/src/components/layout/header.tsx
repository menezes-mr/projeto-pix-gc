"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Zap, FileText, User, Bell, LogOut, ArrowLeftRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

export function Header() {
  const pathname = usePathname();
  const { user, logout, switchAccount } = useAuth();
  const [switching, setSwitching] = useState(false);

  const navItems = [
    { label: "Início", href: "/", icon: Home, noAction: false },
    { label: "PIX", href: "/pix", icon: Zap, noAction: false },
    { label: "Extrato", href: "/extrato", icon: FileText, noAction: false },
    { label: "Perfil", href: "/perfil", icon: User, noAction: false },
  ];

  const handleSwitchAccount = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetContaId = e.target.value;
    if (!targetContaId || targetContaId === user?.contaId) return;
    setSwitching(true);
    try {
      await switchAccount(targetContaId);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <header className="w-full bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-xl">
          {user?.name?.charAt(0).toUpperCase() || "U"}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Bem-vindo de volta,</span>
            {user?.role && user.role !== "TITULAR" && (
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                {user.role}
              </span>
            )}
          </div>
          <span className="text-sm font-bold text-gray-900">Olá, {user?.name || "Usuário"}</span>
        </div>
      </div>

      <nav className="hidden md:flex items-center gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.noAction) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={(e) => e.preventDefault()}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        {user?.accounts && user.accounts.length > 1 && (
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
            {switching ? (
              <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
            ) : (
              <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            )}
            <select
              aria-label="Selecionar conta bancária ativa"
              value={user.contaId || ""}
              onChange={(e) => void handleSwitchAccount(e)}
              disabled={switching}
              className="bg-transparent text-xs font-semibold text-gray-800 focus:outline-none cursor-pointer"
            >
              {user.accounts.map((acc) => (
                <option key={acc.contaId} value={acc.contaId}>
                  C/C {acc.numeroConta} ({acc.papel}
                  {acc.papel !== "TITULAR" ? ` - ${acc.titularNome.split(" ")[0]}` : ""})
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          type="button"
          onClick={(e) => e.preventDefault()}
          title="Notificações"
          className="relative p-2 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors text-gray-600 cursor-pointer"
        >
          <Bell className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={logout}
          title="Sair"
          className="p-2 rounded-full bg-gray-50 hover:bg-red-50 hover:text-red-600 transition-colors text-gray-600 cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
