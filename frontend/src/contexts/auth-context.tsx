"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  password?: string;
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
    const storedToken = localStorage.getItem("pix_token");
    const storedUser = localStorage.getItem("pix_user");
    
    if (storedToken && storedUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(JSON.parse(storedUser));
    } else {
      setUser(null);
    }
  }, []);

  const login = async (userData: any) => {
    try {
      let loginData;
      let isRegistering = !!userData.document && !!userData.phone && !!userData.name;

      // Se for registro, cria o usuário antes de logar
      if (isRegistering) {
        // Assume document in userData
        const { api } = await import('@/lib/api');
        await api.post('/usuarios', {
          nomeCompleto: userData.name,
          email: `${userData.document.replace(/\D/g, '')}@email.com`, // mock email fallback
          cpfCnpj: userData.document,
          telefone: userData.phone,
          senha: userData.password,
        });
        loginData = { identificador: userData.document, senha: userData.password };
      } else {
        loginData = { identificador: userData.document, senha: userData.password };
      }

      const { api } = await import('@/lib/api');
      const response = await api.post('/auth/login', loginData);
      
      const { access_token, usuario } = response.data;
      
      const mappedUser = {
        name: usuario.nome,
        document: usuario.documento,
        email: usuario.email,
        phone: usuario.telefone,
        password: userData.password, // guardado no state local apenas
        balance: usuario.saldo,
      };

      setUser(mappedUser);
      localStorage.setItem("pix_token", access_token);
      localStorage.setItem("pix_user", JSON.stringify(mappedUser));
    } catch (error: any) {
      console.error("Erro no login/registro:", error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("pix_user");
    localStorage.removeItem("pix_token");
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
