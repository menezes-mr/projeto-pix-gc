"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "@/lib/api";

export interface User {
  id: string;
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  balance: number;
  contaId?: string | null;
  agency?: string;
  accountNumber?: string;
  dailyLimit?: number;
}

interface LoginData {
  document: string;
  password: string;
}

interface RegistrationData extends LoginData {
  name: string;
  email: string;
  phone?: string;
}

interface LoginResponse {
  access_token: string;
  usuario: {
    id: string;
    nome: string;
    documento: string;
    email: string;
    telefone: string | null;
    saldo: number;
    contaId: string | null;
    agencia?: string;
    numeroConta?: string;
    limiteDiarioPix?: number;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData: LoginData) => Promise<void>;
  register: (userData: RegistrationData) => Promise<void>;
  refreshAccount: () => Promise<void>;
  updateProfile: (data: { email?: string; phone?: string; name?: string }) => Promise<void>;
  updateDailyLimit: (newLimit: number) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("pix_token");
    const storedUser = localStorage.getItem("pix_user");
    
    if (storedToken && storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as User;
        setTimeout(() => {
          setUser(parsed);
          setLoading(false);
        }, 0);

        if (parsed.contaId) {
          api.get(`/contas/${parsed.contaId}`)
            .then((res) => {
              const updated: User = {
                ...parsed,
                balance: Number(res.data.saldo),
                agency: res.data.agencia,
                accountNumber: res.data.numeroConta,
                dailyLimit: Number(res.data.limiteDiarioPix),
              };
              setUser(updated);
              localStorage.setItem("pix_user", JSON.stringify(updated));
            })
            .catch(() => {});
        }
      } catch {
        localStorage.removeItem("pix_user");
        localStorage.removeItem("pix_token");
        setTimeout(() => {
          setLoading(false);
        }, 0);
      }
    } else {
      setTimeout(() => {
        setLoading(false);
      }, 0);
    }
  }, []);

  const refreshAccount = async () => {
    if (!user?.contaId) return;
    try {
      const res = await api.get(`/contas/${user.contaId}`);
      setUser((prev) => {
        if (!prev) return null;
        const updated: User = {
          ...prev,
          balance: Number(res.data.saldo),
          agency: res.data.agencia,
          accountNumber: res.data.numeroConta,
          dailyLimit: Number(res.data.limiteDiarioPix),
        };
        localStorage.setItem("pix_user", JSON.stringify(updated));
        return updated;
      });
    } catch {}
  };

  const updateProfile = async (data: { email?: string; phone?: string; name?: string }) => {
    if (!user?.id) return;
    const res = await api.patch(`/usuarios/${user.id}`, {
      ...(data.name && { nomeCompleto: data.name }),
      ...(data.email && { email: data.email }),
      ...(data.phone && { telefone: data.phone.replace(/\D/g, "") }),
    });
    setUser((prev) => {
      if (!prev) return null;
      const updated: User = {
        ...prev,
        name: res.data.nomeCompleto || prev.name,
        email: res.data.email || prev.email,
        phone: res.data.telefone || prev.phone,
      };
      localStorage.setItem("pix_user", JSON.stringify(updated));
      return updated;
    });
  };

  const updateDailyLimit = async (newLimit: number) => {
    if (!user?.contaId) return;
    const res = await api.patch(`/contas/${user.contaId}`, {
      limiteDiarioPix: newLimit,
      usuarioId: user.id,
    });
    setUser((prev) => {
      if (!prev) return null;
      const updated: User = {
        ...prev,
        dailyLimit: Number(res.data.limiteDiarioPix),
      };
      localStorage.setItem("pix_user", JSON.stringify(updated));
      return updated;
    });
  };

  const login = async ({ document, password }: LoginData) => {
    const identifier = document.trim();
    const response = await api.post<LoginResponse>("/auth/login", {
      identificador: identifier.includes("@") ? identifier : identifier.replace(/\D/g, ""),
      senha: password,
    });
    const { access_token, usuario } = response.data;
    const mappedUser: User = {
      id: usuario.id,
      name: usuario.nome,
      document: usuario.documento,
      email: usuario.email,
      phone: usuario.telefone ?? undefined,
      balance: usuario.saldo,
      contaId: usuario.contaId,
      agency: usuario.agencia || "0001",
      accountNumber: usuario.numeroConta || "",
      dailyLimit: usuario.limiteDiarioPix || 1000,
    };

    localStorage.setItem("pix_token", access_token);
    localStorage.setItem("pix_user", JSON.stringify(mappedUser));
    setUser(mappedUser);
  };

  const register = async (userData: RegistrationData) => {
    const document = userData.document.replace(/\D/g, "");
    const phone = userData.phone?.replace(/\D/g, "");

    await api.post("/usuarios", {
      nomeCompleto: userData.name.trim(),
      email: userData.email.trim(),
      cpfCnpj: document,
      telefone: phone || undefined,
      senha: userData.password,
    });

    try {
      await login({ document, password: userData.password });
    } catch {
      throw new Error("Cadastro criado, mas não foi possível entrar automaticamente. Tente acessar pela aba Entrar.");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("pix_user");
    localStorage.removeItem("pix_token");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, refreshAccount, updateProfile, updateDailyLimit, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
