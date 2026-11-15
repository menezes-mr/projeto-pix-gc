"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  IdCard,
  Mail,
  Trash2,
  Plus,
  Sparkles,
  Info,
  Loader2,
  Key,
  CheckCircle2,
  AlertCircle,
  Lock,
  Unlock,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import axios from "axios";

interface PixKey {
  chaveId: string;
  tipoChave: string;
  valorChave: string;
  status: string;
  dataCriacao: string;
}

export function PixKeysManager() {
  const { user } = useAuth();
  const contaId = user?.contaId;
  const userRole = user?.role || "TITULAR";
  const isTitular = userRole === "TITULAR";
  const canManageKeys = userRole === "TITULAR" || userRole === "OPERADOR";

  const [keys, setKeys] = useState<PixKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingKey, setAddingKey] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "idle" | "success" | "error";
    message: string;
  }>({
    type: "idle",
    message: "",
  });

  const loadKeys = useCallback(async () => {
    if (!contaId) {
      setKeys([]);
      setLoading(false);
      return;
    }
    try {
      const response = await api.get("/pix/chaves/minhas", {
        params: { contaId },
      });
      setKeys(response.data as PixKey[]);
    } catch (error) {
      console.error("Erro ao buscar chaves", error);
    } finally {
      setLoading(false);
    }
  }, [contaId]);

  useEffect(() => {
    if (!contaId) return;
    let active = true;
    api
      .get("/pix/chaves/minhas", {
        params: { contaId },
      })
      .then((response) => {
        if (active) {
          setKeys(response.data as PixKey[]);
          setFeedback({ type: "idle", message: "" });
        }
      })
      .catch((error) => {
        console.error("Erro ao buscar chaves", error);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [contaId]);

  const activeCount = keys.filter((k) => k.status === "ATIVA").length;
  const isLimitReached = activeCount >= 5;

  const handleCopyKey = async (chaveId: string, valorChave: string) => {
    try {
      await navigator.clipboard.writeText(valorChave);
      setCopiedId(chaveId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  const handleDeleteKey = async (chaveId: string) => {
    setDeletingId(chaveId);
    setFeedback({ type: "idle", message: "" });
    try {
      await api.delete(`/pix/chaves/${chaveId}`, {
        params: { contaId },
      });
      setFeedback({
        type: "success",
        message: "Chave PIX removida com sucesso!",
      });
      await loadKeys();
    } catch (error: unknown) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setFeedback({
          type: "error",
          message:
            error.response?.data?.message || "Erro ao remover chave PIX.",
        });
      } else {
        setFeedback({ type: "error", message: "Erro ao remover chave PIX." });
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleChangeStatus = async (
    chaveId: string,
    action: "suspender" | "desbloquear",
  ) => {
    setBusyId(chaveId);
    setFeedback({ type: "idle", message: "" });
    const fallback =
      action === "suspender"
        ? "Erro ao suspender chave PIX."
        : "Erro ao desbloquear chave PIX.";
    try {
      await api.patch(`/pix/chaves/${chaveId}/${action}`, {}, {
        params: { contaId },
      });
      setFeedback({
        type: "success",
        message:
          action === "suspender"
            ? "Chave PIX suspensa com sucesso!"
            : "Chave PIX desbloqueada com sucesso!",
      });
      await loadKeys();
    } catch (error: unknown) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setFeedback({
          type: "error",
          message: error.response?.data?.message || fallback,
        });
      } else {
        setFeedback({ type: "error", message: fallback });
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleAddRandomKey = async () => {
    if (isLimitReached) return;
    setAddingKey(true);
    setFeedback({ type: "idle", message: "" });
    try {
      await api.post("/pix/chaves/aleatoria", {}, {
        params: { contaId },
      });
      setFeedback({
        type: "success",
        message: "Chave aleatória gerada com sucesso!",
      });
      await loadKeys();
    } catch (error: unknown) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setFeedback({
          type: "error",
          message:
            error.response?.data?.message || "Erro ao gerar chave aleatória.",
        });
      } else {
        setFeedback({
          type: "error",
          message: "Erro ao gerar chave aleatória.",
        });
      }
    } finally {
      setAddingKey(false);
    }
  };

  const handleAddCpfKey = async () => {
    if (!user?.document || isLimitReached) return;
    setAddingKey(true);
    setFeedback({ type: "idle", message: "" });
    try {
      await api.post("/pix/chaves", {
        tipoChave: "CPF",
        valorChave: user.document.replace(/\D/g, ""),
        contaId,
      });
      setFeedback({
        type: "success",
        message: "Chave CPF vinculada com sucesso!",
      });
      await loadKeys();
    } catch (error: unknown) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setFeedback({
          type: "error",
          message: error.response?.data?.message || "Erro ao vincular CPF.",
        });
      } else {
        setFeedback({ type: "error", message: "Erro ao vincular CPF." });
      }
    } finally {
      setAddingKey(false);
    }
  };

  const handleAddEmailKey = async () => {
    if (!user?.email || isLimitReached) return;
    setAddingKey(true);
    setFeedback({ type: "idle", message: "" });
    try {
      await api.post("/pix/chaves", {
        tipoChave: "EMAIL",
        valorChave: user.email.trim().toLowerCase(),
        contaId,
      });
      setFeedback({
        type: "success",
        message: "Chave E-mail vinculada com sucesso!",
      });
      await loadKeys();
    } catch (error: unknown) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setFeedback({
          type: "error",
          message: error.response?.data?.message || "Erro ao vincular E-mail.",
        });
      } else {
        setFeedback({ type: "error", message: "Erro ao vincular E-mail." });
      }
    } finally {
      setAddingKey(false);
    }
  };

  const hasCpfKey = keys.some((k) => k.tipoChave === "CPF");
  const hasEmailKey = keys.some((k) => k.tipoChave === "EMAIL");

  const getIcon = (type: string) => {
    if (type === "CPF" || type === "CNPJ")
      return <IdCard className="w-5 h-5" />;
    if (type === "EMAIL") return <Mail className="w-5 h-5" />;
    return <Key className="w-5 h-5" />;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-xl font-bold text-gray-900">
            {isTitular ? "Minhas Chaves" : "Chaves da Conta"}
          </h3>
          {user?.accountNumber && (
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              C/C {user.accountNumber} ({userRole})
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          {isTitular
            ? "Gerencie suas chaves PIX cadastradas para receber transferências em tempo real."
            : "Visualize e gerencie as chaves PIX vinculadas a esta conta compartilhada."}
        </p>
      </div>

      {feedback.type === "success" && (
        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {feedback.type === "error" && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {isLimitReached && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            Limite de 5 chaves atingido. Remova uma chave existente para
            cadastrar uma nova.
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4 min-h-[150px]">
        {loading ? (
          <div className="flex items-center justify-center flex-1 text-indigo-600">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2">
            <Key className="w-8 h-8" />
            <span className="text-sm">Nenhuma chave cadastrada nesta conta</span>
          </div>
        ) : (
          keys.map((k) => {
            const suspended = k.status === "SUSPENSA";
            return (
              <div
                key={k.chaveId}
                className={`border rounded-xl p-4 flex items-center justify-between gap-2 ${
                  suspended
                    ? "border-amber-200 bg-amber-50/50"
                    : "border-gray-100 bg-gray-50/50"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-gray-200/50 flex items-center justify-center text-gray-600">
                    {getIcon(k.tipoChave)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">
                        {k.tipoChave}
                      </span>
                      {suspended && (
                        <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          Suspensa
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {k.valorChave}
                    </span>
                    <span className="text-xs text-gray-500 mt-0.5">
                      Criada em {new Date(k.dataCriacao).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleCopyKey(k.chaveId, k.valorChave)}
                    className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors"
                    title="Copiar chave PIX"
                  >
                    {copiedId === k.chaveId ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  {canManageKeys && (
                    <>
                      {suspended ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleChangeStatus(k.chaveId, "desbloquear")
                          }
                          disabled={busyId === k.chaveId || isLimitReached}
                          className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 px-2.5 py-2 rounded-lg transition-colors disabled:opacity-50"
                          title="Desbloquear chave PIX"
                        >
                          {busyId === k.chaveId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Unlock className="w-4 h-4" />
                          )}
                          Desbloquear Chave
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            handleChangeStatus(k.chaveId, "suspender")
                          }
                          disabled={busyId === k.chaveId}
                          className="flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 px-2.5 py-2 rounded-lg transition-colors disabled:opacity-50"
                          title="Suspender chave PIX"
                        >
                          {busyId === k.chaveId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Lock className="w-4 h-4" />
                          )}
                          Suspender Chave
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteKey(k.chaveId)}
                        disabled={deletingId === k.chaveId}
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                        title="Excluir chave PIX"
                      >
                        {deletingId === k.chaveId ? (
                          <Loader2 className="w-5 h-5 animate-spin text-red-600" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {canManageKeys ? (
        <div className="flex flex-col gap-2.5">
          {isTitular && (
            <>
              <Button
                type="button"
                onClick={handleAddCpfKey}
                disabled={
                  addingKey ||
                  loading ||
                  !user?.document ||
                  hasCpfKey ||
                  isLimitReached
                }
                className="w-full bg-black hover:bg-gray-900 text-white gap-2 h-11 disabled:opacity-50"
              >
                {addingKey ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {hasCpfKey
                  ? "CPF Já Vinculado"
                  : `Vincular CPF (${user?.document || ""})`}
              </Button>
              <Button
                type="button"
                onClick={handleAddEmailKey}
                disabled={
                  addingKey ||
                  loading ||
                  !user?.email ||
                  hasEmailKey ||
                  isLimitReached
                }
                className="w-full bg-gray-800 hover:bg-black text-white gap-2 h-11 disabled:opacity-50"
              >
                {addingKey ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {hasEmailKey
                  ? "E-mail Já Vinculado"
                  : `Vincular E-mail (${user?.email || ""})`}
              </Button>
            </>
          )}
          <Button
            type="button"
            onClick={handleAddRandomKey}
            disabled={addingKey || loading || isLimitReached}
            className="w-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 gap-2 h-11 border-none disabled:opacity-50"
          >
            {addingKey ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Gerar Chave Aleatória (EVP)
          </Button>
        </div>
      ) : (
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-700">
          Acesso de consulta ({userRole}): você pode visualizar e copiar as
          chaves PIX desta conta.
        </div>
      )}

      <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 flex items-center justify-between text-gray-500 text-xs">
        <div className="flex gap-2 items-center">
          <Info className="w-4 h-4 shrink-0" />
          <span>
            Você pode cadastrar até 5 chaves nesta conta de pessoa física.
          </span>
        </div>
        <span className="font-semibold text-gray-700">{activeCount}/5</span>
      </div>
    </div>
  );
}
