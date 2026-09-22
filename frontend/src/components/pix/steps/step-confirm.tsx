"use client";

import React, { useState } from "react";
import { CheckCircle2, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

interface StepConfirmProps {
  recipientKey: string;
  amount: number;
  onNext: () => void;
}

export function StepConfirm({ recipientKey, amount, onNext }: StepConfirmProps) {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const formattedAmount = amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Se o usuário tem senha cadastrada, verifica. Senão, aceita qualquer coisa pra fim de protótipo.
    if (user?.password && password !== user.password) {
      setError("Senha incorreta. Tente novamente.");
      return;
    }
    
    setError("");
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-bold text-gray-900 text-center">Revisão e Senha</h3>
        <p className="text-sm text-gray-500 text-center mb-4">
          Confira os dados antes de confirmar a transferência.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center pb-3 border-b border-gray-200">
          <span className="text-sm text-gray-500">Valor a transferir</span>
          <span className="text-lg font-bold text-gray-900">{formattedAmount}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Para</span>
          <span className="text-sm font-semibold text-gray-900">João Silva</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Chave PIX</span>
          <span className="text-sm font-semibold text-gray-900">{recipientKey}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Senha de Acesso</label>
        <Input 
          type="password"
          placeholder="Digite sua senha cadastrada"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="text-lg"
          autoFocus
        />
        {error && <span className="text-red-500 text-sm font-medium mt-1">{error}</span>}
      </div>

      <Button 
        type="submit" 
        disabled={password.length === 0}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-lg gap-2 mt-4"
      >
        <CheckCircle2 className="w-5 h-5" />
        Confirmar Transferência
      </Button>
    </form>
  );
}
