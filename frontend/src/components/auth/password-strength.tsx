import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password?: string;
}

export function PasswordStrength({ password = '' }: PasswordStrengthProps) {
  const rules = [
    { label: 'Mín. 8 caracteres', test: (p: string) => p.length >= 8 },
    { label: 'Número', test: (p: string) => /\d/.test(p) },
    { label: 'Letra maiúscula', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'Caractere especial', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];

  const fulfilledCount = rules.filter((rule) => rule.test(password)).length;
  const isStrong = fulfilledCount === rules.length;

  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">Força da Senha:</span>
        {isStrong && (
          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <Check className="w-3 h-3" /> Forte
          </span>
        )}
      </div>

      <div className="flex gap-1 h-1.5">
        {[1, 2, 3, 4].map((step) => {
          let bgColor = 'bg-gray-200';
          if (fulfilledCount >= step) {
            if (fulfilledCount < 3) bgColor = 'bg-red-500';
            else if (fulfilledCount === 3) bgColor = 'bg-amber-400';
            else bgColor = 'bg-emerald-500';
          }
          return (
            <div
              key={step}
              className={cn("flex-1 rounded-full transition-colors", bgColor)}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-y-1 mt-1">
        {rules.map((rule, idx) => {
          const isValid = rule.test(password);
          return (
            <div key={idx} className="flex items-center gap-1.5">
              <Check
                className={cn(
                  "w-3.5 h-3.5",
                  isValid ? "text-emerald-500" : "text-gray-300"
                )}
              />
              <span
                className={cn(
                  "text-[10px] sm:text-xs",
                  isValid ? "text-emerald-700 font-medium" : "text-gray-500"
                )}
              >
                {rule.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
