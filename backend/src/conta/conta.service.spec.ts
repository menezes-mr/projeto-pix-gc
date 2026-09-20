import { Test, TestingModule } from '@nestjs/testing';
import { ContaService } from './conta.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { StatusConta, StatusUsuario } from '../common/enums/status.enum';

describe('ContaService', () => {
  let service: ContaService;
  let prisma: PrismaService;

  const mockPrismaService = {
    conta: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    logAtividade: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContaService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ContaService>(ContaService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('consultarSaldo', () => {
    it('deve retornar saldo e limiteDiarioPix como Number quando o titular ativo consultar conta ativa', async () => {
      const mockConta = {
        contaId: 'conta-123',
        saldo: 1500.5, // Valores primitivos aceitos pelo Number()
        limiteDiarioPix: 1000,
        status: StatusConta.ATIVA,
        usuarios: [
          {
            usuario: {
              usuarioId: 'usr-123',
              status: StatusUsuario.ATIVO,
            },
          },
        ],
      };

      jest.spyOn(prisma.conta, 'findFirst').mockResolvedValue(mockConta as any);
      jest.spyOn(prisma.logAtividade, 'create').mockResolvedValue({} as any);

      const resultado = await service.consultarSaldo('conta-123', 'usr-123');

      expect(resultado).toEqual({
        saldo: 1500.5,
        limiteDiarioPix: 1000,
      });
      expect(prisma.logAtividade.create).toHaveBeenCalledWith({
        data: {
          usuarioId: 'usr-123',
          acao: 'CONSULTA_SALDO',
        },
      });
    });

    it('deve lançar ForbiddenException caso o usuário logado não seja o titular da conta', async () => {
      // 1. findFirst retorna null (não achou vínculo ativo de titularidade)
      jest.spyOn(prisma.conta, 'findFirst').mockResolvedValue(null);

      // 2. findUnique acha a conta para confirmar que ela existe, mas sem usuários vinculados ao ID informado
      jest.spyOn(prisma.conta, 'findUnique').mockResolvedValue({
        contaId: 'conta-123',
        status: StatusConta.ATIVA,
        usuarios: [],
      } as any);

      await expect(
        service.consultarSaldo('conta-123', 'outro-usuario'),
      ).rejects.toThrow(
        new ForbiddenException('Acesso negado: Você não é o titular desta conta.'),
      );
    });

    it('deve lançar NotFoundException caso a conta não exista no banco', async () => {
      jest.spyOn(prisma.conta, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.conta, 'findUnique').mockResolvedValue(null);

      await expect(
        service.consultarSaldo('conta-inexistente', 'usr-123'),
      ).rejects.toThrow(
        new NotFoundException('Conta bancária não encontrada.'),
      );
    });
  });
});