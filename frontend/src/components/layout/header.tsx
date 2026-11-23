"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Zap,
  FileText,
  User,
  Bell,
  LogOut,
  ArrowLeftRight,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  Shield,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import type { PixTransaction } from "@/components/pix/pix-receipt";

interface ActivityLogItem {
  logId: string;
  acao: string;
  dataHora: string;
}

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  dateIso: string;
  kind: "in" | "out" | "scheduled" | "security" | "key";
}

function formatCurrency(val: number | string): string {
  const num = typeof val === "number" ? val : Number(val);
  return (Number.isFinite(num) ? num : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatNotificationTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapLogToNotification(log: ActivityLogItem): NotificationItem | null {
  const acao = log.acao;
  if (
    acao === "CONSULTA_SALDO" ||
    acao === "TRANSFERENCIA PIX" ||
    acao === "EXECUCAO_PIX_AGENDADO" ||
    acao === "ESTORNO_PIX" ||
    acao === "RECEBIMENTO_PIX_SIMULADO"
  ) {
    return null;
  }

  if (acao === "CRIACAO DE CHAVE ALEATORIA" || acao === "CRIACAO DE CHAVE PIX") {
    return {
      id: `log-${log.logId}`,
      title: "Nova chave PIX cadastrada",
      description: "Uma chave PIX foi vinculada à sua conta.",
      dateIso: log.dataHora,
      kind: "key",
    };
  }
  if (acao === "SUSPENSAO_CHAVE_PIX") {
    return {
      id: `log-${log.logId}`,
      title: "Chave PIX suspensa",
      description: "Uma chave PIX foi temporariamente suspensa.",
      dateIso: log.dataHora,
      kind: "key",
    };
  }
  if (acao === "DESBLOQUEIO_CHAVE_PIX" || acao === "REATIVACAO DE CHAVE PIX") {
    return {
      id: `log-${log.logId}`,
      title: "Chave PIX ativa",
      description: "Sua chave PIX foi desbloqueada/reativada.",
      dateIso: log.dataHora,
      kind: "key",
    };
  }
  if (acao.startsWith("INATIVACAO DE CHAVE PIX")) {
    return {
      id: `log-${log.logId}`,
      title: "Chave PIX removida",
      description: acao.replace("INATIVACAO DE CHAVE PIX", "").replace(/^:\s*/, "") || "Chave excluída da conta.",
      dateIso: log.dataHora,
      kind: "key",
    };
  }
  if (acao.startsWith("ADICAO_COTITULAR")) {
    return {
      id: `log-${log.logId}`,
      title: "Cotitular vinculado",
      description: acao.replace("ADICAO_COTITULAR:", "").trim(),
      dateIso: log.dataHora,
      kind: "security",
    };
  }
  if (acao.startsWith("REMOCAO_COTITULAR")) {
    return {
      id: `log-${log.logId}`,
      title: "Cotitular removido",
      description: acao.replace("REMOCAO_COTITULAR:", "").trim(),
      dateIso: log.dataHora,
      kind: "security",
    };
  }
  if (acao === "ATUALIZACAO DE CONTA") {
    return {
      id: `log-${log.logId}`,
      title: "Limite diário atualizado",
      description: "O limite diário PIX da conta foi alterado.",
      dateIso: log.dataHora,
      kind: "security",
    };
  }
  if (acao === "ATUALIZACAO DE USUARIO") {
    return {
      id: `log-${log.logId}`,
      title: "Perfil atualizado",
      description: "Seus dados ou preferências de alerta foram salvos.",
      dateIso: log.dataHora,
      kind: "security",
    };
  }
  if (acao === "CANCELAMENTO_PIX_AGENDADO") {
    return {
      id: `log-${log.logId}`,
      title: "Agendamento PIX cancelado",
      description: "Você cancelou uma transferência PIX agendada.",
      dateIso: log.dataHora,
      kind: "scheduled",
    };
  }

  return null;
}

export function Header() {
  const pathname = usePathname();
  const { user, logout, switchAccount } = useAuth();
  const [switching, setSwitching] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

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

  const loadNotifications = useCallback(async () => {
    if (!user?.contaId) return;
    setLoadingNotif(true);
    try {
      const [txRes, logsRes] = await Promise.all([
        api
          .get<{ data: PixTransaction[] }>(
            `/contas/${user.contaId}/transacoes`,
            { params: { page: 1, limit: 8 } },
          )
          .catch(() => null),
        api
          .get<{ dados: ActivityLogItem[] }>("/usuarios/meus-logs", {
            params: { page: 1, limit: 15 },
          })
          .catch(() => null),
      ]);

      const items: NotificationItem[] = [];
      const contaId = user.contaId;

      for (const tx of txRes?.data?.data || []) {
        const isIncoming =
          tx.contaDestinoId === contaId && tx.contaOrigemId !== contaId;
        const val = formatCurrency(tx.valor);
        const originName =
          tx.contaOrigem?.usuarios?.[0]?.usuario?.nomeCompleto ||
          (tx.contaOrigem?.numeroConta
            ? `Conta ${tx.contaOrigem.numeroConta}`
            : "Origem externa");
        const destName =
          tx.contaDestino?.usuarios?.[0]?.usuario?.nomeCompleto ||
          (tx.contaDestino?.numeroConta
            ? `Conta ${tx.contaDestino.numeroConta}`
            : tx.chavePixUtilizada || "Destinatário");

        if (tx.status === "PENDENTE") {
          items.push({
            id: `tx-${tx.transacaoId}`,
            title: `PIX agendado (${val})`,
            description: `Para ${destName} em ${formatNotificationTime(tx.dataAgendamento || "")}`,
            dateIso: tx.dataAgendamento || new Date().toISOString(),
            kind: "scheduled",
          });
        } else if (tx.status === "EFETIVADA" || tx.status === "CONCLUIDA") {
          if (tx.tipoOperacao === "ESTORNO") {
            items.push({
              id: `tx-${tx.transacaoId}`,
              title: isIncoming
                ? `Estorno PIX recebido (${val})`
                : `Devolução PIX enviada (${val})`,
              description: isIncoming
                ? `Valor devolvido por ${originName}`
                : `Valor devolvido para ${destName}`,
              dateIso: tx.dataEfetivacao || new Date().toISOString(),
              kind: isIncoming ? "in" : "out",
            });
          } else if (isIncoming) {
            items.push({
              id: `tx-${tx.transacaoId}`,
              title: `Você recebeu um PIX de ${val}`,
              description: `Enviado por ${originName}`,
              dateIso: tx.dataEfetivacao || new Date().toISOString(),
              kind: "in",
            });
          } else {
            items.push({
              id: `tx-${tx.transacaoId}`,
              title: `Você enviou um PIX de ${val}`,
              description: `Para ${destName}`,
              dateIso: tx.dataEfetivacao || new Date().toISOString(),
              kind: "out",
            });
          }
        }
      }

      for (const log of logsRes?.data?.dados || []) {
        const mapped = mapLogToNotification(log);
        if (mapped) {
          items.push(mapped);
        }
      }

      items.sort(
        (a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime(),
      );
      setNotifications(items.slice(0, 8));
    } finally {
      setLoadingNotif(false);
    }
  }, [user?.contaId]);

  const handleToggleNotif = () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) {
      void loadNotifications();
    }
  };

  useEffect(() => {
    if (!notifOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setNotifOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [notifOpen]);

  const renderKindIcon = (kind: NotificationItem["kind"]) => {
    if (kind === "in") {
      return (
        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <ArrowDownLeft className="w-4 h-4" />
        </div>
      );
    }
    if (kind === "out") {
      return (
        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <ArrowUpRight className="w-4 h-4" />
        </div>
      );
    }
    if (kind === "scheduled") {
      return (
        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <CalendarClock className="w-4 h-4" />
        </div>
      );
    }
    if (kind === "key") {
      return (
        <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
          <KeyRound className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
        <Shield className="w-4 h-4" />
      </div>
    );
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

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={handleToggleNotif}
            title="Notificações"
            aria-label="Notificações"
            aria-expanded={notifOpen}
            className={cn(
              "relative p-2 rounded-full transition-colors cursor-pointer",
              notifOpen
                ? "bg-indigo-50 text-indigo-600"
                : "bg-gray-50 hover:bg-gray-100 text-gray-600",
            )}
          >
            <Bell className="w-5 h-5" />
          </button>

          {notifOpen && (
            <div
              role="dialog"
              aria-label="Painel de notificações"
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Notificações
                  </h3>
                  <p className="text-[11px] text-gray-600">
                    Alertas de PIX e atividades da conta{" "}
                    {user?.accountNumber ? `C/C ${user.accountNumber}` : ""}
                  </p>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {loadingNotif ? (
                  <div className="flex items-center justify-center py-8 text-indigo-600 gap-2 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Carregando notificações...</span>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-8 px-4 text-center flex flex-col items-center gap-1.5">
                    <Bell className="w-6 h-6 text-gray-400" />
                    <span className="text-xs font-medium text-gray-700">
                      Nenhuma notificação recente
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Suas movimentações PIX e alertas de segurança aparecerão aqui.
                    </span>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      className="px-4 py-3 hover:bg-gray-50/80 transition-colors flex items-start gap-3"
                    >
                      {renderKindIcon(item.kind)}
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-bold text-gray-900 truncate">
                            {item.title}
                          </span>
                          <span className="text-[10px] font-medium text-gray-500 shrink-0">
                            {formatNotificationTime(item.dateIso)}
                          </span>
                        </div>
                        <span className="text-xs text-gray-600 truncate mt-0.5">
                          {item.description}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between text-xs">
                <Link
                  href="/extrato"
                  onClick={() => setNotifOpen(false)}
                  className="font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Ver extrato completo
                </Link>
                <Link
                  href="/perfil"
                  onClick={() => setNotifOpen(false)}
                  className="font-medium text-gray-600 hover:text-gray-900"
                >
                  Configurar alertas
                </Link>
              </div>
            </div>
          )}
        </div>

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
