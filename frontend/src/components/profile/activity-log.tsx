"use client";

import React, { useState, useEffect } from "react";
import { History, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import axios from "axios";

interface ActivityLogItem {
  logId: string;
  acao: string;
  dataHora: string;
}

interface ActivityLogResponse {
  dados: ActivityLogItem[];
  meta: {
    total: number;
    pagina: number;
    limite: number;
    totalPaginas: number;
  };
}

const PAGE_SIZE = 10;

const ACTION_LABELS: Record<string, string> = {
  "CRIACAO DE USUARIO": "Cadastro criado",
  "ATUALIZACAO DE USUARIO": "Dados cadastrais atualizados",
  "INATIVACAO DE USUARIO": "Usuário inativado",
  "TRANSFERENCIA PIX": "Transferência PIX realizada",
  "CRIACAO DE CHAVE ALEATORIA": "Chave aleatória criada",
  "CRIACAO DE CHAVE PIX": "Chave PIX vinculada",
  "REATIVACAO DE CHAVE PIX": "Chave PIX reativada",
  SUSPENSAO_CHAVE_PIX: "Chave PIX suspensa",
  DESBLOQUEIO_CHAVE_PIX: "Chave PIX desbloqueada",
};

function formatAction(acao: string) {
  if (ACTION_LABELS[acao]) return ACTION_LABELS[acao];
  if (acao.startsWith("INATIVACAO DE CHAVE PIX")) return "Chave PIX removida";
  const text = acao.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  const day = date.toLocaleDateString("pt-BR");
  const time = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} às ${time}`;
}

export function ActivityLog() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api
      .get<ActivityLogResponse>("/usuarios/meus-logs", {
        params: { page: 1, limit: PAGE_SIZE },
      })
      .then((response) => {
        if (active) {
          setLogs(response.data.dados);
          setPage(response.data.meta.pagina);
          setTotalPages(response.data.meta.totalPaginas);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (axios.isAxiosError<{ message?: string }>(err)) {
          setError(
            err.response?.data?.message || "Erro ao carregar atividades.",
          );
        } else {
          setError("Erro ao carregar atividades.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    setError("");
    try {
      const response = await api.get<ActivityLogResponse>(
        "/usuarios/meus-logs",
        {
          params: { page: page + 1, limit: PAGE_SIZE },
        },
      );
      setLogs((prev) => [...prev, ...response.data.dados]);
      setPage(response.data.meta.pagina);
      setTotalPages(response.data.meta.totalPaginas);
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setError(
          err.response?.data?.message || "Erro ao carregar mais atividades.",
        );
      } else {
        setError("Erro ao carregar mais atividades.");
      }
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-6">
      <div className="flex items-center gap-2 text-indigo-600">
        <History className="w-5 h-5" />
        <h3 className="font-semibold text-gray-900">
          Registro de Atividades & Segurança
        </h3>
      </div>

      <p className="text-sm text-gray-500">
        Acompanhe as ações realizadas na sua conta, das mais recentes para as
        mais antigas.
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8 text-indigo-600">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-sm text-gray-400">
          Nenhuma atividade registrada
        </div>
      ) : (
        <ol className="relative border-l border-gray-200 ml-2 flex flex-col gap-5">
          {logs.map((log) => (
            <li key={log.logId} className="ml-5 relative">
              <span className="absolute -left-[26px] top-1 w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-white" />
              <p className="text-sm font-semibold text-gray-900">
                {formatAction(log.acao)}
              </p>
              <p className="text-xs text-gray-500">
                {formatDateTime(log.dataHora)}
              </p>
            </li>
          ))}
        </ol>
      )}

      {!loading && page < totalPages && (
        <Button
          type="button"
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="w-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 gap-2 h-11 border-none disabled:opacity-50"
        >
          {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
          Carregar mais
        </Button>
      )}
    </div>
  );
}
