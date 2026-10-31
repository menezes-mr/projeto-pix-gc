"use client";

import React, { useState } from "react";
import { User, Lock, Mail, Phone, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { isAxiosError } from "axios";

export function PersonalDataForm() {
  const { user, updateProfile } = useAuth();
  const [customEmail, setCustomEmail] = useState<string | null>(null);
  const [customPhone, setCustomPhone] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const email = customEmail ?? (user?.email || "");
  const phone = customPhone ?? (user?.phone || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus("idle");
    setMessage("");

    try {
      await updateProfile({ email, phone });
      setStatus("success");
      setMessage("Dados atualizados com sucesso!");
    } catch (err: unknown) {
      setStatus("error");
      if (isAxiosError<{ message?: string }>(err)) {
        setMessage(err.response?.data?.message || "Erro ao atualizar dados.");
      } else {
        setMessage("Erro ao atualizar dados.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-6">
      <div className="flex items-center gap-2 text-indigo-600 mb-2">
        <User className="w-5 h-5" />
        <h3 className="font-semibold text-gray-900">Dados Pessoais</h3>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700">CPF/CNPJ</label>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Lock className="w-3 h-3" />
              <span>Somente leitura</span>
            </div>
          </div>
          <Input 
            value={user?.document || ""} 
            disabled 
            className="bg-gray-100 text-gray-500 cursor-not-allowed border-gray-100"
          />
        </div>

        <Input
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setCustomEmail(e.target.value)}
          iconLeft={<Mail className="w-5 h-5" />}
          required
        />

        <Input
          label="Telefone"
          type="tel"
          value={phone}
          onChange={(e) => setCustomPhone(e.target.value)}
          iconLeft={<Phone className="w-5 h-5" />}
        />
      </div>

      {status === "success" && (
        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {status === "error" && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="flex justify-end mt-2">
        <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </form>
  );
}
