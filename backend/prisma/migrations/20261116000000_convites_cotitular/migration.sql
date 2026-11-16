CREATE TABLE "ConviteCotitular" (
  "conviteId" TEXT NOT NULL, "contaId" TEXT NOT NULL, "usuarioId" TEXT NOT NULL,
  "papel" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDENTE',
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiraEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConviteCotitular_pkey" PRIMARY KEY ("conviteId"),
  CONSTRAINT "ConviteCotitular_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta"("contaId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ConviteCotitular_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ConviteCotitular_contaId_usuarioId_key" ON "ConviteCotitular"("contaId", "usuarioId");
