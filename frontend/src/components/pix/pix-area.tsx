"use client";

import { useState } from "react";
import { PixTransferFlow } from "./pix-transfer-flow";
import { PixKeysManager } from "./pix-keys-manager";
import { PixExtrato } from "./pix-extrato";
import { PixCobranca } from "./pix-cobranca";

export function PixArea() {
  const [aba, setAba] = useState<"transferir" | "receber">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "receber") return "receber";
    }
    return "transferir";
  });
  const [revisao, setRevisao] = useState(0);
  const [revisaoChaves, setRevisaoChaves] = useState(0);
  const atualizar = () => setRevisao((valor) => valor + 1);
  return (
    <>
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Operações PIX"
      >
        {(
          [
            ["transferir", "Transferir PIX"],
            ["receber", "Receber / Cobrar PIX"],
          ] as const
        ).map(([id, nome]) => (
          <button
            key={id}
            role="tab"
            aria-selected={aba === id}
            onClick={() => setAba(id)}
            className={`rounded-lg px-4 py-2 font-semibold text-sm ${aba === id ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-700"}`}
          >
            {nome}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {aba === "transferir" ? (
            <PixTransferFlow onCompleted={atualizar} />
          ) : (
            <PixCobranca key={revisaoChaves} />
          )}
        </div>
        <div id="chaves">
          <PixKeysManager
            onKeysChanged={() => setRevisaoChaves((valor) => valor + 1)}
          />
        </div>
      </div>
      <PixExtrato revisao={revisao} />
    </>
  );
}
