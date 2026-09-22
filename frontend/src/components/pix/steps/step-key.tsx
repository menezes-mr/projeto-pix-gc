"use client";

import React, { useState } from "react";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface StepKeyProps {
  onNext: (key: string) => void;
}

export function StepKey({ onNext }: StepKeyProps) {
  const [pixKey, setPixKey] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pixKey.trim().length > 3) {
      onNext(pixKey);
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
        onChange={(e) => setPixKey(e.target.value)}
        autoFocus
        className="text-lg py-6"
      />

      <Button 
        type="submit" 
        disabled={pixKey.trim().length <= 3}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-lg gap-2 mt-4"
      >
        <Lock className="w-5 h-5" />
        Continuar
      </Button>
    </form>
  );
}
