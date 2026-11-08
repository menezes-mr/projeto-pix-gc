import React from "react";
import { PixArea } from "@/components/pix/pix-area";

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

      <PixArea />
    </div>
  );
}
