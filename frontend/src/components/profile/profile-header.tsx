"use client";

import React from "react";
import { useAuth } from "@/contexts/auth-context";

export function ProfileHeader() {
  const { user } = useAuth();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-gray-900">
          {user?.name || "Usuário"}
        </h2>
        <p className="text-sm text-gray-500">
          BancoDigital Ag 0001 • C/C 84920-1 • Titular Pessoa Física
        </p>
      </div>
    </div>
  );
}
