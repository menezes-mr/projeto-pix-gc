# Execução automática de PIX agendado

O `PixAgendadoService` busca, a cada minuto, transações `PENDENTE` com
`dataAgendamento <= agora`. Cada transação tem sua própria execução: uma falha
não impede o processamento das demais. Datas são comparadas como instantes UTC,
incluindo a consulta SQL, independentemente do fuso horário do PostgreSQL.

## Preparação do ambiente

Na pasta `backend`, com `DATABASE_URL` e `DIRECT_URL` configuradas para o banco
da aplicação, execute antes de iniciar a versão nova:

```bash
npm ci
npx prisma migrate deploy
npx prisma generate
npm run build
npm run start:prod
```

A migração adiciona `usuarioSolicitanteId` e um índice para buscar pendências por
status e data. O motor de transferência passa a guardar o usuário autenticado.
O log de execução usa esse usuário, mesmo quando existem outros titulares.

**Agendamentos antigos sem `usuarioSolicitanteId` passam para `FALHA`.** Não é
possível reconstruir o autor usando apenas a conta ou os logs antigos, que não
possuem vínculo com a transação. Esses casos precisam de novo agendamento por
um usuário identificado; não há atribuição automática a outro titular.

## Regras e concorrência

- Origem e destino devem existir, ser diferentes e estar `ATIVA`.
- Todos os usuários vinculados às duas contas devem estar `ATIVO`. Conta sem
  usuário vinculado também falha. O solicitante deve continuar titular da origem.
- Somente transferências de saída com valor positivo podem ser executadas.
- Débito atômico, crédito, status `EFETIVADA`, `dataEfetivacao` e log
  `EXECUCAO_PIX_AGENDADO` são gravados na mesma transação.
- Falha de regra de negócio desfaz a movimentação e grava `FALHA`, sem data de
  efetivação. Falha técnica desfaz toda a transação e mantém `PENDENTE` para uma
  nova tentativa no próximo ciclo.
- O registro original do PIX é atualizado; não se cria outro histórico.
- O evento `pix.efetivado` é emitido após o commit. Falha na notificação não
  desfaz um PIX efetivado; a entrega das notificações não tem garantia de retry.

`FOR UPDATE SKIP LOCKED` reserva o PIX para um único executor. As contas são
bloqueadas em ordem estável, e usuários/vínculos ficam protegidos contra
alterações durante a validação. Essa proteção funciona entre instâncias da
aplicação. `waitForCompletion` também evita sobreposição do Cron na mesma instância.

Um `SAVEPOINT` é criado depois do bloqueio do PIX. Se o decremento deixar o saldo
negativo, uma exceção de negócio provoca `ROLLBACK TO SAVEPOINT`, restaurando os
saldos antes de gravar `FALHA`. O bloqueio do PIX permanece até o commit, eliminando
uma janela em que outro executor poderia assumir o registro durante a falha.

Referências: [agendamento no NestJS](https://docs.nestjs.com/techniques/task-scheduling),
[bloqueios no PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html)
e [savepoints](https://www.postgresql.org/docs/current/sql-savepoint.html).

## Validação

```bash
npm test -- --runInBand
PIX_TEST_DATABASE_URL='postgresql://usuario:senha@localhost:5432/banco_teste' npm run test:pix-agendado
```

O teste de integração exige um PostgreSQL de testes e não utiliza `DATABASE_URL`
como alternativa. Cria um schema com UUID, aplica as migrations nele, executa os
cenários e remove somente esse schema ao terminar. O usuário do banco precisa de
permissão para criar schemas, tabelas, funções e triggers.

São verificados saldo insuficiente e rollback real, contas/usuários inativos,
identificação do solicitante, datas futuras e vencidas, execução repetida,
concorrência entre duas conexões, disputa pelo saldo, transferências em sentidos
opostos e falha técnica depois de movimentar saldos. Os testes do Cron verificam
o intervalo de um minuto, a ausência de sobreposição e a continuação após erro.
