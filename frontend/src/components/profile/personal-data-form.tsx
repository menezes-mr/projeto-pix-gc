"use client";

import React from "react";
import { User, Lock, Mail, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

export function PersonalDataForm() {
  const { user } = useAuth();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-6">
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
            value={user?.document || "123.456.789-00"} 
            disabled 
            className="bg-gray-100 text-gray-500 cursor-not-allowed border-gray-100"
          />
        </div>

        <Input
          label="E-mail"
          defaultValue={user?.email || "joao.silva@email.com"}
          iconLeft={<Mail className="w-5 h-5" />}
        />

        <Input
          label="Telefone"
          defaultValue={user?.phone || "(11) 98765-4321"}
          iconLeft={<Phone className="w-5 h-5" />}
        />
      </div>

      <div className="flex justify-end mt-2">
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
}
