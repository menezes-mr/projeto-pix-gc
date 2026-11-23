"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import {
  Key,
  IdCard,
  Mail,
  Copy,
  CheckCircle2,
  Users,
  Plus,
  Trash2,
  Loader2,
  ArrowRight,
  Send,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";

interface PixKeyItem {
  chaveId: string;
  tipoChave: string;
  valorChave: string;
  status: string;
  dataCriacao: string;
}

interface ContatoPixItem {
  contatoId: string;
  nomeContato: string;
  chavePix: string;
  tipoChave: string;
}

export function KeysAndContacts() {
  const { user } = useAuth();
  const contaId = user?.contaId;
  const isTitular = (user?.role || "TITULAR") === "TITULAR";

  const [keys, setKeys] = useState<PixKeyItem[]>([]);
  const [contacts, setContacts] = useState<ContatoPixItem[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(isTitular);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const [showAddContact, setShowAddContact] = useState(false);
  const [nomeContato, setNomeContato] = useState("");
  const [tipoChave, setTipoChave] = useState("CPF");
  const [chavePix, setChavePix] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(
    null,
  );
  const [contactError, setContactError] = useState<string | null>(null);

  const loadContacts = useCallback(async () => {
    if (!isTitular) {
      setContacts([]);
      setLoadingContacts(false);
      return;
    }
    setLoadingContacts(true);
    try {
      const res = await api.get<ContatoPixItem[]>("/contatos");
      setContacts(res.data || []);
    } catch {
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  }, [isTitular]);

  useEffect(() => {
    if (!contaId) return;
    let active = true;

    api
      .get<PixKeyItem[]>("/pix/chaves/minhas", {
        params: { contaId },
      })
      .then((res) => {
        if (active) setKeys(res.data || []);
      })
      .catch(() => {
        if (active) setKeys([]);
      })
      .finally(() => {
        if (active) setLoadingKeys(false);
      });

    return () => {
      active = false;
    };
  }, [contaId]);

  useEffect(() => {
    if (!isTitular) return;
    let active = true;

    api
      .get<ContatoPixItem[]>("/contatos")
      .then((res) => {
        if (active) setContacts(res.data || []);
      })
      .catch(() => {
        if (active) setContacts([]);
      })
      .finally(() => {
        if (active) setLoadingContacts(false);
      });

    return () => {
      active = false;
    };
  }, [isTitular]);

  const handleCopy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(id);
      setTimeout(() => setCopiedValue(null), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeContato.trim() || !chavePix.trim()) return;
    setSavingContact(true);
    setContactError(null);
    try {
      await api.post("/contatos", {
        nomeContato: nomeContato.trim(),
        tipoChave,
        chavePix: chavePix.trim(),
      });
      setNomeContato("");
      setChavePix("");
      setShowAddContact(false);
      await loadContacts();
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string | string[] }>(err)) {
        const msg = err.response?.data?.message;
        setContactError(
          Array.isArray(msg)
            ? msg.join(", ")
            : msg || "Erro ao cadastrar contato.",
        );
      } else {
        setContactError("Erro ao cadastrar contato.");
      }
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = async (contatoId: string) => {
    setDeletingContactId(contatoId);
    try {
      await api.delete(`/contatos/${contatoId}`);
      await loadContacts();
    } catch {
      // ignore error
    } finally {
      setDeletingContactId(null);
    }
  };

  const activeKeysCount = keys.filter((k) => k.status === "ATIVA").length;

  const getKeyIcon = (type: string) => {
    if (type === "CPF" || type === "CNPJ") return <IdCard className="w-4 h-4" />;
    if (type === "EMAIL") return <Mail className="w-4 h-4" />;
    return <Key className="w-4 h-4" />;
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Minhas Chaves PIX */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900">
                Chaves PIX da Conta
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                {activeKeysCount}/5 ativas
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              Copie rapidamente para receber transferências
            </p>
          </div>
          <Link
            href="/pix#chaves"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 shrink-0"
          >
            Gerenciar
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loadingKeys ? (
          <div className="flex items-center justify-center py-6 text-indigo-600">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : keys.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center flex flex-col items-center gap-1.5">
            <Key className="w-6 h-6 text-gray-400" />
            <span className="text-xs text-gray-600">
              Nenhuma chave PIX vinculada a esta conta.
            </span>
            <Link
              href="/pix#chaves"
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Cadastrar chave agora
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {keys.slice(0, 4).map((k) => {
              const isSuspended = k.status === "SUSPENSA";
              return (
                <div
                  key={k.chaveId}
                  className={`rounded-lg border px-3.5 py-2.5 flex items-center justify-between gap-2 ${
                    isSuspended
                      ? "bg-amber-50/40 border-amber-200"
                      : "bg-gray-50/70 border-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white border border-gray-200/80 flex items-center justify-center text-gray-700 shrink-0">
                      {getKeyIcon(k.tipoChave)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold uppercase text-gray-600">
                          {k.tipoChave}
                        </span>
                        {isSuspended && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                            Suspensa
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-gray-900 truncate">
                        {k.valorChave}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleCopy(k.chaveId, k.valorChave)}
                    className="inline-flex items-center gap-1 rounded-md bg-white hover:bg-indigo-50 border border-gray-300 hover:border-indigo-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:text-indigo-600 transition-colors cursor-pointer shrink-0"
                    title="Copiar chave PIX"
                  >
                    {copiedValue === k.chaveId ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copiada</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contatos PIX Favoritos (Exclusivo para Titular) */}
      {isTitular && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm flex flex-col gap-4 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <h3 className="text-base font-bold text-gray-900">
                  Contatos PIX Favoritos
                </h3>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Chaves salvas para agilizar suas transferências
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAddContact((prev) => !prev);
                setContactError(null);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              {showAddContact ? "Fechar" : "Novo"}
            </button>
          </div>

          {showAddContact && (
            <form
              onSubmit={(e) => void handleAddContact(e)}
              className="rounded-xl bg-gray-50 border border-gray-200/80 p-3.5 flex flex-col gap-2.5"
            >
              {contactError && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2.5 py-1.5">
                  {contactError}
                </div>
              )}
              <input
                type="text"
                placeholder="Nome do contato (ex: Maria Silva)"
                value={nomeContato}
                onChange={(e) => setNomeContato(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex gap-2">
                <select
                  value={tipoChave}
                  onChange={(e) => setTipoChave(e.target.value)}
                  aria-label="Tipo de chave do contato"
                  className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="EMAIL">E-mail</option>
                  <option value="TELEFONE">Telefone</option>
                  <option value="ALEATORIA">Aleatória</option>
                </select>
                <input
                  type="text"
                  placeholder="Valor da chave PIX"
                  value={chavePix}
                  onChange={(e) => setChavePix(e.target.value)}
                  required
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={savingContact}
                className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {savingContact && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Salvar Contato Favorito
              </button>
            </form>
          )}

          {loadingContacts ? (
            <div className="flex items-center justify-center py-6 text-indigo-600">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center flex flex-col items-center gap-1">
              <Users className="w-6 h-6 text-gray-400" />
              <span className="text-xs text-gray-600">
                Você ainda não possui contatos PIX salvos.
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {contacts.slice(0, 5).map((c) => (
                <div
                  key={c.contatoId}
                  className="rounded-lg border border-gray-100 bg-gray-50/60 px-3.5 py-2.5 flex items-center justify-between gap-2"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-gray-900 truncate">
                      {c.nomeContato}
                    </span>
                    <span className="text-[11px] font-medium text-gray-600 truncate">
                      {c.tipoChave}: {c.chavePix}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleCopy(c.contatoId, c.chavePix)}
                      className="p-1.5 rounded-md text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                      title="Copiar chave do contato"
                    >
                      {copiedValue === c.contatoId ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <Link
                      href={`/pix?tab=transferir&chave=${encodeURIComponent(c.chavePix)}`}
                      className="p-1.5 rounded-md text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      title="Transferir para este contato"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      type="button"
                      disabled={deletingContactId === c.contatoId}
                      onClick={() => void handleDeleteContact(c.contatoId)}
                      className="p-1.5 rounded-md text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                      title="Remover contato"
                    >
                      {deletingContactId === c.contatoId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
