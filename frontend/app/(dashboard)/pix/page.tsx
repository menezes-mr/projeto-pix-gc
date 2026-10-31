import React from "react";
import { PixTransferFlow } from "@/components/pix/pix-transfer-flow";
import { PixKeysManager } from "@/components/pix/pix-keys-manager";

export default function PixPage() {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in zoom-in-95 duration-300">
      
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Área PIX</h1>
          <p className="text-sm text-gray-500">
            Faça transferências instantâneas e administre suas chaves cadastradas.
          </p>
        </div>
        <div className="bg-gray-100 text-gray-700 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap">
          Limite Diário: R$ 1.000,00
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2">
          <PixTransferFlow />
        </div>

        <div className="lg:col-span-1">
          <PixKeysManager />
        </div>

      </div>
    </div>
  );
}
