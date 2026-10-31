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
   * **PostgreSQL:** `localhost:5432` (banco: `pix_db`, usuário: `pix_user`)

## Comandos Úteis

### Ver logs dos containers
```bash
docker compose logs -f backend
docker compose logs -f frontend
```

### Executar testes automatizados (Backend)
```bash
docker exec -it pix_backend npm test
```

### Executar validação de código (Linter)
```bash
docker exec -it pix_backend npm run lint
docker exec -it pix_frontend npm run lint
```

### Parar os serviços
```bash
docker compose down
```