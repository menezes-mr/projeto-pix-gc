-- Registros anteriores permanecem sem autor: não é possível inferir quem agendou.
ALTER TABLE "TransacaoPix" ADD COLUMN "usuarioSolicitanteId" TEXT;

ALTER TABLE "TransacaoPix" ADD CONSTRAINT "TransacaoPix_usuarioSolicitanteId_fkey"
FOREIGN KEY ("usuarioSolicitanteId") REFERENCES "Usuario"("usuarioId")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "TransacaoPix_status_dataAgendamento_idx"
ON "TransacaoPix"("status", "dataAgendamento");
