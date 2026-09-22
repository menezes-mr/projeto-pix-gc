"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { User, Lock, Mail, Phone, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PasswordStrength } from "./password-strength";
import { cn, formatCPFOrCNPJ, formatPhone } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

type AuthMode = "login" | "register";

export function AuthContainer() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  
  const [showPassword, setShowPassword] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState("");
  
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [notificationSms, setNotificationSms] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState(false);
  const [notificationPush, setNotificationPush] = useState(false);


  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === "register") {
        await register({ name, email, document, phone, password });
      } else {
        await login({ document: loginIdentifier, password });
      }
      router.push("/");
    } catch (cause) {
      if (isAxiosError<{ message?: string | string[] }>(cause)) {
        const message = cause.response?.data?.message;
        setError(Array.isArray(message) ? message.join(" ") : message || "Não foi possível acessar o serviço. Tente novamente.");
      } else {
        setError(cause instanceof Error ? cause.message : "Não foi possível concluir a solicitação. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden">
      {/* Segmented Control / Tabs */}
      <div className="p-1 m-4 bg-gray-100 rounded-lg flex items-center">
        <button
          onClick={() => changeMode("login")}
          disabled={isSubmitting}
          className={cn(
            "flex-1 py-2 text-sm font-medium rounded-md transition-all",
            mode === "login" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          Entrar
        </button>
        <button
          onClick={() => changeMode("register")}
          disabled={isSubmitting}
          className={cn(
            "flex-1 py-2 text-sm font-medium rounded-md transition-all",
            mode === "register" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          Criar Conta
        </button>
      </div>

      <form className="px-6 pb-8 pt-2" onSubmit={handleSubmit} aria-busy={isSubmitting}>
        {error && (
          <div role="alert" className="mb-5 bg-red-50 text-red-600 p-4 rounded-md flex gap-3 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {mode === "login" ? (
          <div className="flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">

            <Input
              label="CPF/CNPJ ou E-mail"
              placeholder="000.000.000-00 ou seu@email.com"
              iconLeft={<User className="w-5 h-5" />}
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              autoComplete="username"
              required
            />

            <div className="flex flex-col gap-1.5">
              <Input
                label="Senha"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                iconLeft={<Lock className="w-5 h-5" />}
                iconRight={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
              />
            </div>

            <Button type="submit" className="mt-2 text-base h-12" disabled={isSubmitting}>
              {isSubmitting ? "Entrando..." : "Entrar →"}
            </Button>
            
            <div className="text-center mt-2">
              <a href="#" className="text-sm text-gray-500 hover:text-black hover:underline transition-colors">
                Esqueci minha senha
              </a>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <Input
              label="Nome Completo"
              placeholder="Ex: Ana Carolina Silva"
              iconLeft={<User className="w-5 h-5" />}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />

            <Input
              label="CPF/CNPJ"
              placeholder="000.000.000-00"
              value={document}
              onChange={(e) => setDocument(formatCPFOrCNPJ(e.target.value))}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                iconLeft={<Mail className="w-5 h-5" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <Input
                label="Telefone"
                type="tel"
                autoComplete="tel"
                placeholder="(11) 99999-9999"
                iconLeft={<Phone className="w-5 h-5" />}
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Input
                label="Senha"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••••••"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
                iconLeft={<Lock className="w-5 h-5" />}
                iconRight={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
              />
              <PasswordStrength password={password} />
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                NOTIFICAÇÕES DE SEGURANÇA
              </h3>
              
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-800">SMS</span>
                  <span className="text-xs text-gray-500">Alertas de transações e tokens</span>
                </div>
                <Switch checked={notificationSms} onChange={() => setNotificationSms(!notificationSms)} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-800">E-mail</span>
                  <span className="text-xs text-gray-500">Relatórios e comprovantes</span>
                </div>
                <Switch checked={notificationEmail} onChange={() => setNotificationEmail(!notificationEmail)} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-800">Push</span>
                  <span className="text-xs text-gray-500">Avisos instantâneos no aparelho</span>
                </div>
                <Switch checked={notificationPush} onChange={() => setNotificationPush(!notificationPush)} />
              </div>
            </div>

            <Button type="submit" className="mt-4 text-base h-12" disabled={isSubmitting}>
              {isSubmitting ? "Criando conta..." : "Criar Conta ⊕"}
            </Button>
            
            <p className="text-[10px] text-center text-gray-400 mt-2 px-4 leading-relaxed">
              Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade e Proteção de Dados (LGPD).
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
