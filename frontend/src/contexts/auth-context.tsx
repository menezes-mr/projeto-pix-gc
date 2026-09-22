"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  balance: number;
}

interface AuthContextType {
  user: User | null;
  login: (userData: Partial<User>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Tenta carregar do localStorage no primeiro render (client-side)
    const stored = localStorage.getItem("pix_user");
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(JSON.parse(stored));
    } else {
      // Mock inicial se não tiver nada
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser({
        name: "João Silva",
        balance: 5000,
      });
    }
  }, []);

  const login = (userData: Partial<User>) => {
    const newUser = {
      name: userData.name || "Usuário",
      document: userData.document,
      email: userData.email,
      balance: userData.balance ?? 5000,
    };
    setUser(newUser);
    localStorage.setItem("pix_user", JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("pix_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
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
