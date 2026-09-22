"use client";

import React, { useState } from "react";
import { User, Lock, Mail, Phone, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PasswordStrength } from "./password-strength";
import { cn, formatCPFOrCNPJ, formatPhone } from "@/lib/utils";

type AuthMode = "login" | "register";

export function AuthContainer() {
  const [mode, setMode] = useState<AuthMode>("login");
  
  const [showPassword, setShowPassword] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState("");
  
  const [password, setPassword] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [notificationSms, setNotificationSms] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState(false);
  const [notificationPush, setNotificationPush] = useState(false);


  const hasError = mode === "login" && false; 

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden">
      {/* Segmented Control / Tabs */}
      <div className="p-1 m-4 bg-gray-100 rounded-lg flex items-center">
        <button
          onClick={() => setMode("login")}
          className={cn(
            "flex-1 py-2 text-sm font-medium rounded-md transition-all",
            mode === "login" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          Entrar
        </button>
        <button
          onClick={() => setMode("register")}
          className={cn(
            "flex-1 py-2 text-sm font-medium rounded-md transition-all",
            mode === "register" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          Criar Conta
        </button>
      </div>

      <div className="px-6 pb-8 pt-2">
        {mode === "login" ? (
          <div className="flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
            
            {hasError && (
              <div className="bg-red-50 text-red-600 p-4 rounded-md flex gap-3 text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold">Atenção de Segurança</span>
                  <span>Acesso negado. Conta bloqueada preventivamente por suspeita de fraude. Entre em contato com o suporte.</span>
                </div>
              </div>
            )}

            <Input
              label="CPF/CNPJ ou E-mail"
              placeholder="000.000.000-00 ou seu@email.com"
              iconLeft={<User className="w-5 h-5" />}
              value={loginIdentifier}
              onChange={(e) => {
                const val = e.target.value;
                if (/[a-zA-Z@]/.test(val)) {
                  setLoginIdentifier(val);
                } else {
                  setLoginIdentifier(formatCPFOrCNPJ(val));
                }
              }}
            />

            <div className="flex flex-col gap-1.5">
              <Input
                label="Senha"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
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

            <Button className="mt-2 text-base h-12">
              Entrar →
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
            />

            <Input
              label="CPF/CNPJ"
              placeholder="000.000.000-00"
              value={document}
              onChange={(e) => setDocument(formatCPFOrCNPJ(e.target.value))}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="E-mail"
                placeholder="seu@email.com"
                iconLeft={<Mail className="w-5 h-5" />}
              />
              <Input
                label="Telefone"
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

            <Button className="mt-4 text-base h-12">
              Criar Conta ⊕
            </Button>
            
            <p className="text-[10px] text-center text-gray-400 mt-2 px-4 leading-relaxed">
              Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade e Proteção de Dados (LGPD).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
