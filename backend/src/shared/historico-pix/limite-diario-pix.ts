import { Prisma } from '@prisma/client';

// dataEfetivacao é gravada em UTC em uma coluna timestamp sem fuso.
export async function limiteDiarioExcedido(
  tx: Prisma.TransactionClient,
  contaId: string,
  valor: Prisma.Decimal,
  limite: Prisma.Decimal,
  agora = new Date(),
): Promise<boolean> {
  const [resultado] = await tx.$queryRaw<Array<{ total: Prisma.Decimal }>>`
    SELECT COALESCE(SUM("valor"), 0) AS total
    FROM "TransacaoPix"
    WHERE "contaOrigemId" = ${contaId}
      AND "status" = 'EFETIVADA'
      AND "tipoOperacao" = 'TRANSFERENCIA_SAIDA'
      AND ("dataEfetivacao" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date
        = (${agora}::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date
  `;
  return resultado.total.plus(valor).greaterThan(limite);
}
