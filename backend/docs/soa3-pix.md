# SOA 3: cobrança, recebimento simulado e devolução

O sistema mantém chaves no banco local e não está conectado ao DICT, ao SPI ou a um prestador de serviços de pagamento. O código estático segue o BR Code, mas um pagamento bancário depende de a chave estar registrada em uma instituição financeira. Um pagamento externo não atualiza este sistema automaticamente; verifique o recebedor no aplicativo bancário antes de pagar. O nome e a cidade são dados do código, e o nome do recebedor apresentado pelo banco depende da consulta à chave.

A simulação de recebimento cria saldo fictício. Por padrão ela está desabilitada; para testes locais isolados, configure `PIX_SIMULACAO_HABILITADA=true` no processo do backend ou no `.env` do Docker Compose. Ela é sempre bloqueada quando `NODE_ENV=production`. O endpoint exige autenticação, chave ativa da conta do titular e um `transacaoExternaId` único; os créditos simulados não representam liquidação bancária e não têm remetente para devolução.


Para fazer uma demonstração, com o backend de testes em execução, rode na raiz do repositório `./scripts/simular-recebimento.sh 100.00`. O script pede o CPF ou e-mail e a senha do titular, usa uma chave ativa da conta e registra o recebimento. Requer Bash, curl, jq e Python 3. Use outro valor no argumento; opcionalmente defina `PIX_API_URL` para apontar a outro backend. Não execute contra um banco compartilhado sem autorização, pois altera o saldo desse banco.

A devolução é integral e aplicável a transferências efetivadas entre contas do sistema. Somente o titular da conta recebedora pode solicitá-la. O vínculo original, os dois saldos, o motivo opcional e o log são gravados na mesma transação de banco. O controle condicional impede devoluções duplicadas e saldo negativo.

A migration `20261108030000_motivo_estorno` adiciona o campo opcional de motivo sem alterar registros existentes. Aplique as migrations no banco do ambiente de destino com `npx prisma migrate deploy` dentro de `backend`.

Para testes de concorrência e rollback, configure `PIX_TEST_DATABASE_URL` para um PostgreSQL de testes no qual o usuário possa criar schemas e execute `npm run test:soa3` dentro de `backend`. O teste cria e remove um schema isolado. Os testes do payload podem ser executados com `npm test` dentro de `frontend`.
