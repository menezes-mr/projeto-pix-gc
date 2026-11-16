"use client";

import React, { useState, useEffect } from "react";
import { Lock, User, Loader2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import axios from "axios";
import { api } from "@/lib/api";

interface Recipient {
  chavePix: string;
  tipoChave: string;
  nomeCompleto: string;
  documentoMascarado: string;
  contaId?: string;
}

interface ContatoPix {
  contatoId: string;
  nomeContato: string;
  chavePix: string;
  tipoChave: string;
}

interface StepKeyProps {
  onNext: (recipient: Recipient) => void;
}

export function StepKey({ onNext }: StepKeyProps) {
  const { user } = useAuth();
  const isTitular = (user?.role || "TITULAR") === "TITULAR";
  const [pixKey, setPixKey] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("chave") || "";
    }
    return "";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [contacts, setContacts] = useState<ContatoPix[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(isTitular);

  useEffect(() => {
    if (!isTitular) return;
    let active = true;

    const fetchContacts = async () => {
      try {
        const response = await api.get<ContatoPix[]>("/contatos");
        if (active) {
          setContacts(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err: unknown) {
        console.error("Erro ao carregar contatos PIX:", err);
      } finally {
        if (active) {
          setLoadingContacts(false);
        }
      }
    };

    fetchContacts();

    return () => {
      active = false;
    };
  }, [isTitular]);

  const submitKey = async (keyToSubmit: string) => {
    const trimmed = keyToSubmit.trim();
    if (trimmed.length <= 3) return;

    if (
      (user?.document && trimmed.replace(/\D/g, "") === user.document.replace(/\D/g, "")) ||
      (user?.email && trimmed.toLowerCase() === user.email.toLowerCase())
    ) {
      setError("Você não pode transferir para si mesmo (sua própria chave PIX).");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.get(`/pix/chaves/${encodeURIComponent(trimmed)}`);
      const data = response.data as Recipient;

      if (data.contaId && user?.contaId && data.contaId === user.contaId) {
        setError("Você não pode transferir para a sua própria conta bancária.");
        return;
      }

      onNext(data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Chave PIX não encontrada.");
      } else {
        setError("Chave PIX não encontrada.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitKey(pixKey);
  };

  const handleSelectContact = async (contact: ContatoPix) => {
    if (loading) return;
    setPixKey(contact.chavePix);
    await submitKey(contact.chavePix);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-bold text-gray-900 text-center">Para quem você quer transferir?</h3>
        <p className="text-sm text-gray-500 text-center mb-4">
          Digite o CPF, CNPJ, e-mail, telefone ou chave aleatória do destinatário.
        </p>
      </div>

      <Input 
        placeholder="Chave PIX..." 
        value={pixKey}
        onChange={(e) => { setPixKey(e.target.value); setError(""); }}
        autoFocus
        className={`text-lg py-6 ${error ? "border-red-500" : ""}`}
      />
      {error && <span className="text-red-500 text-sm font-medium -mt-4">{error}</span>}

      {isTitular && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <Users className="w-4 h-4" />
            <span>Contatos Rápidos</span>
          </div>

          {loadingContacts ? (
            <div className="flex items-center justify-center py-4 text-gray-400 gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Carregando contatos...</span>
            </div>
          ) : contacts.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">
              Nenhum contato salvo encontrado.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {contacts.map((contact) => (
                <button
                  key={contact.contatoId}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSelectContact(contact)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-indigo-50/60 hover:border-indigo-200 transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                    {contact.nomeContato.trim().charAt(0).toUpperCase() || (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-semibold text-gray-900 truncate">
                      {contact.nomeContato}
                    </span>
                    <span className="text-xs text-gray-500 truncate">
                      {contact.tipoChave}: {contact.chavePix}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Button 
        type="submit" 
        disabled={pixKey.trim().length <= 3 || loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-lg gap-2 mt-4"
      >
        <Lock className="w-5 h-5" />
        {loading ? "Buscando..." : "Continuar"}
      </Button>
    </form>
  );
}
