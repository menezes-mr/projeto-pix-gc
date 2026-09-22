"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "@/lib/api";

interface User {
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  balance: number;
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
    nome: string;
    documento: string;
    email: string;
    telefone: string | null;
    saldo: number;
  };
}

interface AuthContextType {
  user: User | null;
  login: (userData: LoginData) => Promise<void>;
  register: (userData: RegistrationData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("pix_token");
    const storedUser = localStorage.getItem("pix_user");
    
    if (storedToken && storedUser) {
      const { name, document, email, phone, balance } = JSON.parse(storedUser) as User;
      const storedProfile = { name, document, email, phone, balance };
      localStorage.setItem("pix_user", JSON.stringify(storedProfile));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(storedProfile);
    }
  }, []);

  const login = async ({ document, password }: LoginData) => {
    const identifier = document.trim();
    const response = await api.post<LoginResponse>("/auth/login", {
      identificador: identifier.includes("@") ? identifier : identifier.replace(/\D/g, ""),
      senha: password,
    });
    const { access_token, usuario } = response.data;
    const mappedUser: User = {
      name: usuario.nome,
      document: usuario.documento,
      email: usuario.email,
      phone: usuario.telefone ?? undefined,
      balance: usuario.saldo,
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
    <AuthContext.Provider value={{ user, login, register, logout }}>
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
