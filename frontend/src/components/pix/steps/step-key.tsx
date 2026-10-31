"use client";

import React, { useState } from "react";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { api } from "@/lib/api";

interface Recipient {
  chavePix: string;
  tipoChave: string;
  nomeCompleto: string;
  documentoMascarado: string;
}

interface StepKeyProps {
  onNext: (recipient: Recipient) => void;
}

export function StepKey({ onNext }: StepKeyProps) {
  const [pixKey, setPixKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pixKey.trim().length <= 3) return;
    
    setLoading(true);
    setError("");
    
    try {
      const response = await api.get(`/pix/chaves/${encodeURIComponent(pixKey)}`);
      onNext(response.data as Recipient);
    } catch (err: any) {
      setError(err.response?.data?.message || "Chave PIX não encontrada.");
    } finally {
      setLoading(false);
    }
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
