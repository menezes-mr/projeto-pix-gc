"use client";

import React from "react";
import Link from "next/link";
import {
  Send,
  QrCode,
  KeyRound,
  FileText,
  SlidersHorizontal,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export function QuickActions() {
  const { user } = useAuth();
  const isDependente = user?.role === "DEPENDENTE";

  const actions = [
    {
      title: "Transferir PIX",
      description: isDependente
        ? "Modo consulta (Dependente)"
        : "Envie valores na hora ou agende",
      href: "/pix?tab=transferir",
      icon: Send,
      color: "bg-indigo-50 text-indigo-600 border-indigo-100",
      hover: "hover:border-indigo-300 hover:bg-indigo-50/60",
    },
    {
      title: "Receber / Cobrar",
      description: "Gere QR Code PIX copia e cola",
      href: "/pix?tab=receber",
      icon: QrCode,
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
      hover: "hover:border-emerald-300 hover:bg-emerald-50/60",
    },
    {
      title: "Chaves PIX",
      description: "Gerencie e copie suas chaves",
      href: "/pix#chaves",
      icon: KeyRound,
      color: "bg-amber-50 text-amber-600 border-amber-100",
      hover: "hover:border-amber-300 hover:bg-amber-50/60",
    },
    {
      title: "Extrato & CSV",
      description: "Histórico, comprovantes e estornos",
      href: "/extrato",
      icon: FileText,
      color: "bg-sky-50 text-sky-600 border-sky-100",
      hover: "hover:border-sky-300 hover:bg-sky-50/60",
    },
    {
      title: "Limites & Conta",
      description: "Ajuste limite diário e cotitulares",
      href: "/perfil",
      icon: SlidersHorizontal,
      color: "bg-purple-50 text-purple-600 border-purple-100",
      hover: "hover:border-purple-300 hover:bg-purple-50/60",
    },
  ];

  return (
    <section aria-label="Ações Rápidas PIX" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
          Ações Rápidas
        </h2>
        {user?.accountNumber && (
          <span className="text-xs text-gray-400">
            Conta ativa: <strong className="text-gray-600">C/C {user.accountNumber}</strong>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              href={action.href}
              className={`group bg-white rounded-xl border border-gray-100 p-4 shadow-sm transition-all flex flex-col justify-between gap-3 ${action.hover}`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center ${action.color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {action.title}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                  {action.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

