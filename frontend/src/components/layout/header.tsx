"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Zap, FileText, User, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

export function Header() {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    { label: "Início", href: "/", icon: Home },
    { label: "PIX", href: "/pix", icon: Zap },
    { label: "Extrato", href: "/extrato", icon: FileText },
    { label: "Perfil", href: "/perfil", icon: User },
  ];

  return (
    <header className="w-full bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-xl">
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 font-medium">Bem-vindo de volta,</span>
          <span className="text-sm font-bold text-gray-900">Olá, {user?.name || 'Usuário'}</span>
        </div>
      </div>

      <nav className="hidden md:flex items-center gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
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

      <div className="flex items-center">
        <button className="relative p-2 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors text-gray-600">
          <Bell className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
