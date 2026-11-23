# Projeto PIX GC

Sistema simplificado de pagamentos instantâneos PIX desenvolvido para a disciplina de Gerência de Configuração.

## Arquitetura e Estrutura do Repositório

O projeto é organizado no padrão monorepo com separação clara de responsabilidades:

```
projeto-pix-gc/
├── backend/                  # API REST em NestJS com TypeScript e Prisma ORM
│   ├── src/
│   │   ├── auth/             # Autenticação JWT e proteção de rotas
│   │   ├── conta/            # Gestão de contas correntes, saldos e extratos
│   │   ├── usuarios/         # Cadastro e perfis de usuários
│   │   ├── pix-key/          # Gestão de chaves PIX (CPF, e-mail, telefone, aleatória)
│   │   ├── pix-transferencia/# Transferência instantânea com transações atômicas
│   │   ├── pix-recebimento/  # Recebimento de transferências e QR Code
│   │   ├── pix-agendado/     # Agendamentos e execução periódica via cron job
│   │   ├── relatorios/       # Relatórios gerenciais e auditoria
│   │   ├── notificacao/      # Eventos de notificação pós-transação
│   │   ├── prisma/           # Cliente e conexão com banco de dados
│   │   └── common/           # Enums, guards e utilitários globais
│   ├── prisma/               # Schema e migrações do PostgreSQL
│   └── test/                 # Testes unitários e de integração
├── frontend/                 # Interface Web moderna em Next.js e Tailwind CSS
│   ├── app/                  # Rotas do App Router ((auth), (dashboard))
│   └── src/                  # Componentes de interface, contextos e cliente HTTP
├── docker-compose.yml        # Orquestração local dos serviços e banco de dados
└── .env.example              # Modelo padronizado de variáveis de ambiente
```

## Pré-requisitos

* Docker e Docker Compose instalados
* Node.js v20+ (opcional para desenvolvimento local fora do container)

## Como Executar a Aplicação

1. Copie o arquivo de variáveis de ambiente para a raiz ou utilize os valores padrão:
   ```bash
   cp .env.example .env
   ```

2. Suba todos os serviços via Docker Compose:
   ```bash
   docker compose up -d --build
   ```

3. Acesse os serviços no navegador:
   * **Frontend:** [http://localhost:3000](http://localhost:3000)
   * **Backend API:** [http://localhost:3333](http://localhost:3333)
   * **Documentação Swagger:** [http://localhost:3333/docs](http://localhost:3333/docs)
   * **Prisma Studio (Banco de Dados Visual):** [http://localhost:5555](http://localhost:5555)
   * **PostgreSQL:** `localhost:5432` (banco: `pix_db`, usuário: `pix_user`)

## Comandos Úteis

### Visualizar Banco de Dados (Prisma Studio)
* **Via Docker (ativo por padrão):** [http://localhost:5555](http://localhost:5555)
* **Via terminal local (host):**
  ```bash
  cd backend && npm run prisma:studio
  ```

### Ver logs dos containers
```bash
docker compose logs -f backend
docker compose logs -f frontend
```

### Executar testes automatizados (Backend)
```bash
docker exec -it pix_backend npm test
```

Para executar as suítes de integração, use um PostgreSQL **exclusivo para testes**
cujo usuário possa criar e remover schemas. Na pasta `backend`, configure
`PIX_TEST_DATABASE_URL` e execute `npm run test:pix-agendado` e
`npm run test:soa3`. Os testes criam schemas isolados e os removem ao terminar.

### Autenticação e acesso administrativo

As operações de conta e de perfil exigem token JWT; o usuário só pode acessar
seus próprios dados e as contas das quais é titular. As rotas administrativas
exigem também o papel `ADMIN` no campo `Usuario.papelSistema`, consultado no
banco a cada requisição. Nenhum cadastro recebe esse papel automaticamente.
Para autorizar um administrador, um operador do banco deve atualizar esse campo
para `ADMIN` no registro do usuário correspondente; para revogar, use `USUARIO`.
O cabeçalho `x-user-role` não concede acesso.

A migration `20261115000000_papel_sistema` adiciona esse campo com valor padrão
`USUARIO`. Para bancos gerenciados por migrations, aplique
`npx prisma migrate deploy` na pasta `backend`. Bancos existentes criados com
`prisma db push` podem precisar de uma linha de base de migrations antes de
utilizar `migrate deploy`; não recrie nem descarte seus dados para essa transição.

Configure `JWT_SECRET` com um segredo próprio no ambiente de execução. Em
`NODE_ENV=production`, o backend não inicia se essa variável estiver ausente.
O Docker Compose usa o valor do `.env`, ou uma chave de desenvolvimento se ele
não for informado.

### Executar validação de código (Linter)
```bash
docker exec -it pix_backend npm run lint
docker exec -it pix_frontend npm run lint
```

### Parar os serviços
```bash
docker compose down
```

### Cotitulares e migrações

Titulares podem adicionar diretamente usuários ativos como cotitulares na página de perfil. A consulta de chaves exige autenticação e é limitada a 30 por minuto por usuário, em memória por instância.

O backend usa `prisma migrate deploy` na inicialização. Para um banco novo, as migrações são aplicadas automaticamente. Para um banco existente criado com `db push`, faça backup e compare seu esquema com as migrações antes de usar `prisma migrate resolve --applied` para estabelecer uma linha de base; não marque migrações como aplicadas sem confirmar que seus efeitos estão presentes. Depois aplique as migrações pendentes com `npx prisma migrate deploy`. Não descarte dados para resolver divergências.

Revise os administradores existentes antes de disponibilizar o sistema, especialmente o usuário `admin@pixgc.com` que versões anteriores podiam criar automaticamente. Revogue acessos indevidos e troque senhas conhecidas.
