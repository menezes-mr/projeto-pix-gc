import React from "react";
import { BalanceCard } from "@/components/dashboard/balance-card";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
      <BalanceCard />
      
      {/*próximas seções da Home, como atalhos, histórico, etc. */}
    </div>
  );
}
