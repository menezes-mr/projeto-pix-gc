-- AlterTable
ALTER TABLE "TransacaoPix"
ADD COLUMN "transacaoExternaId" TEXT,
ALTER COLUMN "contaOrigemId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "TransacaoPix_transacaoExternaId_key"
ON "TransacaoPix"("transacaoExternaId");
