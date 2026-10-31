"use client";

import React, { useState, useEffect } from "react";
import { IdCard, Mail, Trash2, Plus, Sparkles, Info, Loader2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface PixKey {
  chaveId: string;
  tipoChave: string;
  valorChave: string;
  dataCriacao: string;
}

export function PixKeysManager() {
  const [keys, setKeys] = useState<PixKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingKey, setAddingKey] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const response = await api.get('/pix/chaves/minhas');
      setKeys(response.data as PixKey[]);
    } catch (error) {
      console.error("Erro ao buscar chaves", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRandomKey = async () => {
    setAddingKey(true);
    try {
      await api.post('/pix/chaves/aleatoria', {});
      fetchKeys();
    } catch (error) {
      console.error("Erro ao gerar chave", error);
    } finally {
      setAddingKey(false);
    }
  };

  const getIcon = (type: string) => {
    if (type === 'CPF' || type === 'CNPJ') return <IdCard className="w-5 h-5" />;
    if (type === 'EMAIL') return <Mail className="w-5 h-5" />;
    return <Key className="w-5 h-5" />;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-bold text-gray-900">Minhas Chaves</h3>
        <p className="text-sm text-gray-500">
          Gerencie suas chaves PIX cadastradas para receber transferências em tempo real.
        </p>
      </div>

      <div className="flex flex-col gap-4 min-h-[150px]">
        {loading ? (
          <div className="flex items-center justify-center flex-1 text-indigo-600">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2">
            <Key className="w-8 h-8" />
            <span className="text-sm">Nenhuma chave cadastrada</span>
          </div>
        ) : (
          keys.map((k) => (
            <div key={k.chaveId} className="border border-gray-100 bg-gray-50/50 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gray-200/50 flex items-center justify-center text-gray-600">
                  {getIcon(k.tipoChave)}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-900 text-sm">{k.tipoChave}</span>
                  <span className="text-sm font-medium text-gray-900">{k.valorChave}</span>
                  <span className="text-xs text-gray-500 mt-0.5">
                    Criada em {new Date(k.dataCriacao).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button className="text-red-500 hover:text-red-600 transition-colors p-2">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>


      <div className="flex flex-col gap-3">
        <Button className="w-full bg-black hover:bg-gray-900 text-white gap-2 h-12">
          <Plus className="w-5 h-5" />
          Adicionar Chave (CPF/Email)
        </Button>
        <Button 
          onClick={handleAddRandomKey}
          disabled={addingKey || loading}
          className="w-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 gap-2 h-12 border-none"
        >
          {addingKey ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
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
