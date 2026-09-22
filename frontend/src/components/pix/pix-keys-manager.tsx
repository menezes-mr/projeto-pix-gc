"use client";

import React from "react";
import { IdCard, Mail, Trash2, Plus, Sparkles, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PixKeysManager() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-bold text-gray-900">Minhas Chaves</h3>
        <p className="text-sm text-gray-500">
          Gerencie suas chaves PIX cadastradas para receber transferências em tempo real de qualquer banco.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* CPF Key */}
        <div className="border border-gray-100 bg-gray-50/50 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gray-200/50 flex items-center justify-center text-gray-600">
              <IdCard className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-gray-900 text-sm">CPF</span>
              <span className="text-sm font-medium text-gray-900">***.123.456-**</span>
              <span className="text-xs text-gray-500 mt-0.5">Criada em 15/02/2022</span>
            </div>
          </div>
          <button className="text-red-500 hover:text-red-600 transition-colors p-2">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* E-mail Key */}
        <div className="border border-gray-100 bg-gray-50/50 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gray-200/50 flex items-center justify-center text-gray-600">
              <Mail className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-gray-900 text-sm">E-mail</span>
              <span className="text-sm font-medium text-gray-900">jo***@email.com</span>
              <span className="text-xs text-gray-500 mt-0.5">Criada em 18/08/2023</span>
            </div>
          </div>
          <button className="text-red-500 hover:text-red-600 transition-colors p-2">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Button className="w-full bg-black hover:bg-gray-900 text-white gap-2 h-12">
          <Plus className="w-5 h-5" />
          Adicionar Nova Chave
        </Button>
        <Button className="w-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 gap-2 h-12 border-none">
          <Sparkles className="w-5 h-5" />
          Gerar Chave Aleatória (EVP)
        </Button>
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 flex gap-3 text-gray-500 text-xs items-center">
        <Info className="w-4 h-4 shrink-0" />
        <p>
          Você pode cadastrar até 5 chaves nesta conta de pessoa física.
        </p>
      </div>
    </div>
  );
}
