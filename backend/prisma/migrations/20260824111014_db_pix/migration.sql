-- CreateTable
CREATE TABLE "Usuario" (
    "usuarioId" TEXT NOT NULL,
    "cpfCnpj" TEXT NOT NULL,
    "nomeCompleto" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,
    "senha" TEXT NOT NULL,
    "receberSms" BOOLEAN NOT NULL DEFAULT false,
    "receberEmail" BOOLEAN NOT NULL DEFAULT false,
    "receberPush" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("usuarioId")
);

-- CreateTable
CREATE TABLE "Conta" (
    "contaId" TEXT NOT NULL,
    "agencia" TEXT NOT NULL,
    "numeroConta" TEXT NOT NULL,
    "saldo" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "limiteDiarioPix" DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
    "status" TEXT NOT NULL DEFAULT 'ATIVA',
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conta_pkey" PRIMARY KEY ("contaId")
);

-- CreateTable
CREATE TABLE "UsuarioConta" (
    "usuarioId" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "papel" TEXT NOT NULL,

    CONSTRAINT "UsuarioConta_pkey" PRIMARY KEY ("usuarioId","contaId")
);

-- CreateTable
CREATE TABLE "ChavePix" (
    "chaveId" TEXT NOT NULL,
    "tipoChave" TEXT NOT NULL,
    "valorChave" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVA',
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contaId" TEXT NOT NULL,

    CONSTRAINT "ChavePix_pkey" PRIMARY KEY ("chaveId")
);

-- CreateTable
CREATE TABLE "ContatoPix" (
    "contatoId" TEXT NOT NULL,
    "nomeContato" TEXT NOT NULL,
    "chavePix" TEXT NOT NULL,
    "tipoChave" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "ContatoPix_pkey" PRIMARY KEY ("contatoId")
);

-- CreateTable
CREATE TABLE "TransacaoPix" (
    "transacaoId" TEXT NOT NULL,
    "chavePixUtilizada" TEXT,
    "valor" DECIMAL(10,2) NOT NULL,
    "tipoOperacao" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "dataAgendamento" TIMESTAMP(3),
    "dataEfetivacao" TIMESTAMP(3),
    "transacaoEstornoId" TEXT,
    "contaOrigemId" TEXT NOT NULL,
    "contaDestinoId" TEXT,

    CONSTRAINT "TransacaoPix_pkey" PRIMARY KEY ("transacaoId")
);

-- CreateTable
CREATE TABLE "LogAtividade" (
    "logId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "LogAtividade_pkey" PRIMARY KEY ("logId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_cpfCnpj_key" ON "Usuario"("cpfCnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Conta_numeroConta_key" ON "Conta"("numeroConta");

-- CreateIndex
CREATE UNIQUE INDEX "ChavePix_valorChave_key" ON "ChavePix"("valorChave");

-- CreateIndex
CREATE UNIQUE INDEX "TransacaoPix_transacaoEstornoId_key" ON "TransacaoPix"("transacaoEstornoId");

-- AddForeignKey
ALTER TABLE "UsuarioConta" ADD CONSTRAINT "UsuarioConta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioConta" ADD CONSTRAINT "UsuarioConta_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta"("contaId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChavePix" ADD CONSTRAINT "ChavePix_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "Conta"("contaId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContatoPix" ADD CONSTRAINT "ContatoPix_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransacaoPix" ADD CONSTRAINT "TransacaoPix_contaOrigemId_fkey" FOREIGN KEY ("contaOrigemId") REFERENCES "Conta"("contaId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransacaoPix" ADD CONSTRAINT "TransacaoPix_contaDestinoId_fkey" FOREIGN KEY ("contaDestinoId") REFERENCES "Conta"("contaId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransacaoPix" ADD CONSTRAINT "TransacaoPix_transacaoEstornoId_fkey" FOREIGN KEY ("transacaoEstornoId") REFERENCES "TransacaoPix"("transacaoId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAtividade" ADD CONSTRAINT "LogAtividade_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("usuarioId") ON DELETE RESTRICT ON UPDATE CASCADE;
