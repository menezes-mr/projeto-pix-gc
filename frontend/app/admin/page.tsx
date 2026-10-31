"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Shield,
  ShieldAlert,
  Lock,
  User,
  TrendingUp,
  DollarSign,
  Activity,
  Calendar,
  Search,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  LogOut,
  RefreshCw,
  FileText,
  Users,
  Ban,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import axios from "axios";

interface DetalheItem {
  status: string;
  tipoOperacao: string;
  valorTotal: number;
  quantidade: number;
}

interface TransacaoItem {
  transacaoId: string;
  valor: number;
  tipoOperacao: string;
  status: string;
  chavePixUtilizada: string | null;
  dataEfetivacao: string | null;
  dataAgendamento: string | null;
  origemTitular: string;
  destinoTitular: string;
  contaOrigemId: string | null;
  contaDestinoId: string | null;
}

interface RelatorioData {
  periodo: {
    dataInicio: string;
    dataFim: string;
  };
  volumeTotalEfetivado: number;
  detalhamento: DetalheItem[];
  transacoes: TransacaoItem[];
}

interface ContaItem {
  contaId: string;
  numeroConta: string;
  saldo: number;
  limiteDiarioPix: number;
  status: string;
  dataCriacao: string;
  titular: {
    nomeCompleto: string;
    cpfCnpj: string;
    email: string;
    usuarioId: string;
  } | null;
  totalChaves: number;
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("admin_session") === "true";
    }
    return false;
  });
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState<"relatorios" | "antifraude">("relatorios");

  const [dataInicio, setDataInicio] = useState("2026-10-01");
  const [dataFim, setDataFim] = useState("2026-10-31");
  const [relatorio, setRelatorio] = useState<RelatorioData | null>(null);
  const [loadingRelatorio, setLoadingRelatorio] = useState(false);

  const [contas, setContas] = useState<ContaItem[]>([]);
  const [loadingContas, setLoadingContas] = useState(false);
  const [buscaConta, setBuscaConta] = useState("");

  const [contaParaBloquear, setContaParaBloquear] = useState<ContaItem | null>(null);
  const [motivoBloqueio, setMotivoBloqueio] = useState("Suspeita de golpe / Movimentação atípica");
  const [bloqueando, setBloqueando] = useState(false);
  const [contaParaDesbloquear, setContaParaDesbloquear] = useState<ContaItem | null>(null);
  const [desbloqueando, setDesbloqueando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (username.trim() === "admin" && (password === "admin" || password === "admin123")) {
      sessionStorage.setItem("admin_session", "true");
      setIsAdmin(true);
    } else {
      setLoginError("Credenciais inválidas. Use admin / admin123 para demonstração.");
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem("admin_session");
    setIsAdmin(false);
    setRelatorio(null);
    setContas([]);
  };

  const carregarRelatorio = useCallback(async () => {
    setLoadingRelatorio(true);
    try {
      const res = await api.get("/admin/relatorios/transacoes", {
        headers: { "x-user-role": "ADMIN" },
        params: { dataInicio, dataFim },
      });
      setRelatorio(res.data as RelatorioData);
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setFeedback({
          tipo: "error",
          texto: err.response?.data?.message || "Erro ao carregar relatório.",
        });
      }
    } finally {
      setLoadingRelatorio(false);
    }
  }, [dataInicio, dataFim]);

  const carregarContas = useCallback(async () => {
    setLoadingContas(true);
    try {
      const res = await api.get("/admin/relatorios/contas", {
        headers: { "x-user-role": "ADMIN" },
      });
      setContas(res.data as ContaItem[]);
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setFeedback({
          tipo: "error",
          texto: err.response?.data?.message || "Erro ao listar contas.",
        });
      }
    } finally {
      setLoadingContas(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let cancel = false;

    const carregarInicial = async () => {
      try {
        const [resRelatorio, resContas] = await Promise.all([
          api.get("/admin/relatorios/transacoes", {
            headers: { "x-user-role": "ADMIN" },
            params: { dataInicio, dataFim },
          }),
          api.get("/admin/relatorios/contas", {
            headers: { "x-user-role": "ADMIN" },
          }),
        ]);
        if (!cancel) {
          setRelatorio(resRelatorio.data as RelatorioData);
          setContas(resContas.data as ContaItem[]);
        }
      } catch (err: unknown) {
        if (!cancel && axios.isAxiosError<{ message?: string }>(err)) {
          setFeedback({
            tipo: "error",
            texto: err.response?.data?.message || "Erro ao carregar dados.",
          });
        }
      }
    };

    void carregarInicial();

    return () => {
      cancel = true;
    };
  }, [isAdmin, dataInicio, dataFim]);

  const handleBloquearConta = async () => {
    if (!contaParaBloquear) return;
    setBloqueando(true);
    setFeedback(null);
    try {
      await api.patch(
        `/contas/${contaParaBloquear.contaId}/bloquear`,
        {
          usuarioId: contaParaBloquear.titular?.usuarioId || "admin-sistema",
          motivo: motivoBloqueio,
        },
        {
          headers: { "x-user-role": "ADMIN" },
        }
      );
      setFeedback({
        tipo: "success",
        texto: `Conta ${contaParaBloquear.numeroConta} bloqueada por suspeita de fraude com sucesso.`,
      });
      setContaParaBloquear(null);
      await carregarContas();
      await carregarRelatorio();
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setFeedback({
          tipo: "error",
          texto: err.response?.data?.message || "Erro ao bloquear conta.",
        });
      } else {
        setFeedback({ tipo: "error", texto: "Erro ao bloquear conta." });
      }
    } finally {
      setBloqueando(false);
    }
  };

  const handleDesbloquearConta = async () => {
    if (!contaParaDesbloquear) return;
    setDesbloqueando(true);
    setFeedback(null);
    try {
      await api.patch(
        `/contas/${contaParaDesbloquear.contaId}/desbloquear`,
        {
          usuarioId: contaParaDesbloquear.titular?.usuarioId || "admin-sistema",
          motivo: "Desbloqueio regular efetuado pela administração",
        },
        {
          headers: { "x-user-role": "ADMIN" },
        }
      );
      setFeedback({
        tipo: "success",
        texto: `Conta ${contaParaDesbloquear.numeroConta} e acessos do titular desbloqueados com sucesso.`,
      });
      setContaParaDesbloquear(null);
      await carregarContas();
      await carregarRelatorio();
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setFeedback({
          tipo: "error",
          texto: err.response?.data?.message || "Erro ao desbloquear conta.",
        });
      } else {
        setFeedback({ tipo: "error", texto: "Erro ao desbloquear conta." });
      }
    } finally {
      setDesbloqueando(false);
    }
  };

  const contasFiltradas = contas.filter((c) => {
    const termo = buscaConta.toLowerCase();
    const nome = c.titular?.nomeCompleto.toLowerCase() || "";
    const cpf = c.titular?.cpfCnpj || "";
    const numero = c.numeroConta || "";
    return nome.includes(termo) || cpf.includes(termo) || numero.includes(termo);
  });

  const totalTransacoesGeral = relatorio?.detalhamento.reduce((acc, curr) => acc + curr.quantidade, 0) || 0;
  const transacoesEfetivadas = relatorio?.detalhamento.find((d) => d.status === "EFETIVADA")?.quantidade || 0;
  const transacoesPendentes = relatorio?.detalhamento.find((d) => d.status === "PENDENTE")?.quantidade || 0;
  const ticketMedio = transacoesEfetivadas > 0 ? (relatorio?.volumeTotalEfetivado || 0) / transacoesEfetivadas : 0;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          <div className="flex flex-col items-center text-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Central Administrativa</h1>
              <p className="text-sm text-slate-400 mt-1">Acesso institucional e governança antifraude</p>
            </div>
          </div>

          {loginError && (
            <div className="mb-6 p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                Usuário Administrador
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setUsername("admin");
                setPassword("admin123");
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 text-left transition-colors cursor-pointer"
            >
              Usar credenciais de demonstração (admin / admin123)
            </button>

            <button
              type="submit"
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              Entrar no Portal Admin
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retornar ao Internet Banking
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-600/30">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base">Banco PIX GC</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                ADMINISTRADOR
              </span>
            </div>
            <span className="text-xs text-slate-400">Backoffice & Central de Prevenção a Fraudes</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Internet Banking
          </Link>
          <button
            type="button"
            onClick={handleAdminLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-950/50 border border-red-900/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-6">
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
              feedback.tipo === "success"
                ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                : "bg-red-950/40 border-red-800/60 text-red-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.tipo === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <span>{feedback.texto}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        <div className="flex border-b border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("relatorios")}
            className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-colors cursor-pointer ${
              activeTab === "relatorios"
                ? "border-indigo-500 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Relatórios & Volume Financeiro
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("antifraude")}
            className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-colors cursor-pointer ${
              activeTab === "antifraude"
                ? "border-indigo-500 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Ban className="w-4 h-4" />
            Monitoramento Antifraude ({contas.length} contas)
          </button>
        </div>

        {activeTab === "relatorios" && (
          <div className="flex flex-col gap-6">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Período de Análise</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">De:</span>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Até:</span>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={carregarRelatorio}
                  disabled={loadingRelatorio}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loadingRelatorio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Atualizar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                  <span>VOLUME EFETIVADO</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-400">
                  {(relatorio?.volumeTotalEfetivado || 0).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
                <span className="text-[11px] text-slate-500">Transações compensadas com sucesso</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                  <span>TOTAL DE TRANSAÇÕES</span>
                  <Activity className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-bold text-white">{totalTransacoesGeral}</div>
                <span className="text-[11px] text-slate-500">{transacoesEfetivadas} efetivadas no período</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                  <span>PIX PENDENTES / AGENDADOS</span>
                  <Calendar className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-400">{transacoesPendentes}</div>
                <span className="text-[11px] text-slate-500">Aguardando execução pela rotina Cron</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                  <span>TICKET MÉDIO</span>
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-purple-400">
                  {ticketMedio.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
                <span className="text-[11px] text-slate-500">Valor médio por operação efetivada</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col gap-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Últimas Transações Registradas na Rede
              </h3>

              {loadingRelatorio ? (
                <div className="flex items-center justify-center p-12 text-indigo-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : !relatorio?.transacoes || relatorio.transacoes.length === 0 ? (
                <div className="text-center p-8 text-slate-500 text-sm">
                  Nenhuma transação encontrada para o período selecionado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 uppercase text-[10px] text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">ID Transação</th>
                        <th className="py-3 px-4">Data/Hora</th>
                        <th className="py-3 px-4">Origem</th>
                        <th className="py-3 px-4">Destino</th>
                        <th className="py-3 px-4">Chave Utilizada</th>
                        <th className="py-3 px-4">Valor</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                      {relatorio.transacoes.map((t) => (
                        <tr key={t.transacaoId} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 text-slate-400 font-sans">{t.transacaoId.slice(0, 8)}...</td>
                          <td className="py-3 px-4 font-sans text-slate-300">
                            {t.dataEfetivacao
                              ? new Date(t.dataEfetivacao).toLocaleString("pt-BR")
                              : t.dataAgendamento
                              ? `Agendado: ${new Date(t.dataAgendamento).toLocaleString("pt-BR")}`
                              : "—"}
                          </td>
                          <td className="py-3 px-4 font-sans text-slate-200">{t.origemTitular}</td>
                          <td className="py-3 px-4 font-sans text-slate-200">{t.destinoTitular}</td>
                          <td className="py-3 px-4 text-slate-400 truncate max-w-[140px]">
                            {t.chavePixUtilizada || "—"}
                          </td>
                          <td className="py-3 px-4 font-bold text-white">
                            {t.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                t.status === "EFETIVADA"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : t.status === "PENDENTE"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : "bg-red-500/10 text-red-400 border border-red-500/20"
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "antifraude" && (
          <div className="flex flex-col gap-6">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={buscaConta}
                  onChange={(e) => setBuscaConta(e.target.value)}
                  placeholder="Buscar por titular, CPF ou conta..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={carregarContas}
                disabled={loadingContas}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {loadingContas ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Recarregar Contas
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-400" />
                    Monitoramento de Contas Correntes
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Visão global de saldos, limites e intervenção preventiva contra fraudes
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-400">{contasFiltradas.length} contas listadas</span>
              </div>

              {loadingContas ? (
                <div className="flex items-center justify-center p-12 text-indigo-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : contasFiltradas.length === 0 ? (
                <div className="text-center p-8 text-slate-500 text-sm">
                  Nenhuma conta encontrada com o termo informado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 uppercase text-[10px] text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Conta</th>
                        <th className="py-3 px-4">Titular</th>
                        <th className="py-3 px-4">Documento</th>
                        <th className="py-3 px-4">Saldo</th>
                        <th className="py-3 px-4">Limite Diário</th>
                        <th className="py-3 px-4">Chaves</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Ação Antifraude</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans text-xs">
                      {contasFiltradas.map((c) => {
                        const isBloqueada = c.status === "BLOQUEADA";
                        const isAtiva = c.status === "ATIVA";

                        return (
                          <tr key={c.contaId} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-white">{c.numeroConta}</td>
                            <td className="py-3 px-4 font-medium text-slate-200">
                              {c.titular?.nomeCompleto || "Sem Titular"}
                            </td>
                            <td className="py-3 px-4 text-slate-400 font-mono">{c.titular?.cpfCnpj || "—"}</td>
                            <td className="py-3 px-4 font-mono text-emerald-400 font-medium">
                              {c.saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-300">
                              {c.limiteDiarioPix.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </td>
                            <td className="py-3 px-4 text-slate-400">{c.totalChaves} ativas</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isAtiva
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : isBloqueada
                                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                    : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                                }`}
                              >
                                {c.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {isAtiva ? (
                                <button
                                  type="button"
                                  onClick={() => setContaParaBloquear(c)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 text-xs font-semibold transition-colors cursor-pointer"
                                >
                                  <Ban className="w-3 h-3" />
                                  Bloquear por Fraude
                                </button>
                              ) : isBloqueada ? (
                                <button
                                  type="button"
                                  onClick={() => setContaParaDesbloquear(c)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  Desbloquear Conta
                                </button>
                              ) : (
                                <span className="text-slate-500 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {contaParaBloquear && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center gap-3 text-red-400">
                <div className="w-10 h-10 rounded-xl bg-red-950/50 border border-red-800/50 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Bloquear Conta por Fraude</h4>
                  <p className="text-xs text-slate-400">Ação irreversível preventiva de segurança</p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-300 flex flex-col gap-1.5">
                <div>
                  <span className="text-slate-500">Conta:</span>{" "}
                  <strong className="text-white font-mono">{contaParaBloquear.numeroConta}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Titular:</span>{" "}
                  <strong className="text-white">{contaParaBloquear.titular?.nomeCompleto}</strong>
                </div>
                <div>
                  <span className="text-slate-500">CPF:</span>{" "}
                  <span className="font-mono text-slate-400">{contaParaBloquear.titular?.cpfCnpj}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Motivo do Bloqueio
                </label>
                <textarea
                  rows={3}
                  value={motivoBloqueio}
                  onChange={(e) => setMotivoBloqueio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <p className="text-[11px] text-amber-400/90 leading-relaxed bg-amber-950/20 p-2.5 rounded-lg border border-amber-900/30">
                Atenção: O bloqueio suspenderá imediatamente o acesso do cliente ao internet banking e cancelará todos os agendamentos PIX pendentes desta conta.
              </p>

              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setContaParaBloquear(null)}
                  disabled={bloqueando}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleBloquearConta}
                  disabled={bloqueando}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {bloqueando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                  Confirmar Bloqueio
                </button>
              </div>
            </div>
          </div>
        )}
        {contaParaDesbloquear && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center gap-3 text-emerald-400">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/50 border border-emerald-800/50 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Desbloquear Conta Bancária</h4>
                  <p className="text-xs text-slate-400">Reativação e liberação de acesso ao usuário</p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-300 flex flex-col gap-1.5">
                <div>
                  <span className="text-slate-500">Conta:</span>{" "}
                  <strong className="text-white font-mono">{contaParaDesbloquear.numeroConta}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Titular:</span>{" "}
                  <strong className="text-white">{contaParaDesbloquear.titular?.nomeCompleto}</strong>
                </div>
                <div>
                  <span className="text-slate-500">CPF:</span>{" "}
                  <span className="font-mono text-slate-400">{contaParaDesbloquear.titular?.cpfCnpj}</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                Ao confirmar o desbloqueio, o status da conta e do usuário titular retornará para <strong>ATIVA</strong>, restaurando o acesso ao Internet Banking e transferências PIX.
              </p>

              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setContaParaDesbloquear(null)}
                  disabled={desbloqueando}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDesbloquearConta}
                  disabled={desbloqueando}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {desbloqueando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Confirmar Desbloqueio
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
