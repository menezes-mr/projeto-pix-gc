import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ContatosPixService } from './contatos-pix.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ContatosPixService', () => {
  let service: ContatosPixService;
  let prisma: {
    contatoPix: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      contatoPix: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContatosPixService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ContatosPixService>(ContatosPixService);
  });

  describe('listar', () => {
    it('deve listar contatos do usuário ordenados por nome', async () => {
      const contatosMock = [
        {
          contatoId: 'ct1',
          nomeContato: 'Alice',
          chavePix: 'alice@email.com',
          tipoChave: 'EMAIL',
          usuarioId: 'u1',
        },
        {
          contatoId: 'ct2',
          nomeContato: 'Bruno',
          chavePix: '12345678900',
          tipoChave: 'CPF',
          usuarioId: 'u1',
        },
      ];
      prisma.contatoPix.findMany.mockResolvedValue(contatosMock);

      const resultado = await service.listar('u1');

      expect(prisma.contatoPix.findMany).toHaveBeenCalledWith({
        where: { usuarioId: 'u1' },
        orderBy: { nomeContato: 'asc' },
      });
      expect(resultado).toEqual(contatosMock);
    });
  });

  describe('criar', () => {
    const dto = {
      nomeContato: 'Carlos',
      chavePix: 'carlos@email.com',
      tipoChave: 'EMAIL',
    };

    it('deve cadastrar novo contato quando a chave ainda não estiver salva', async () => {
      prisma.contatoPix.findFirst.mockResolvedValue(null);
      const contatoCriado = {
        contatoId: 'ct3',
        ...dto,
        usuarioId: 'u1',
      };
      prisma.contatoPix.create.mockResolvedValue(contatoCriado);

      const resultado = await service.criar('u1', dto);

      expect(prisma.contatoPix.findFirst).toHaveBeenCalledWith({
        where: { usuarioId: 'u1', chavePix: dto.chavePix },
      });
      expect(prisma.contatoPix.create).toHaveBeenCalledWith({
        data: {
          nomeContato: dto.nomeContato,
          chavePix: dto.chavePix,
          tipoChave: dto.tipoChave,
          usuarioId: 'u1',
        },
      });
      expect(resultado).toEqual(contatoCriado);
    });

    it('deve lançar ConflictException quando a chave já estiver salva para o usuário', async () => {
      prisma.contatoPix.findFirst.mockResolvedValue({
        contatoId: 'ct3',
        ...dto,
        usuarioId: 'u1',
      });

      await expect(service.criar('u1', dto)).rejects.toThrow(ConflictException);
      expect(prisma.contatoPix.create).not.toHaveBeenCalled();
    });
  });

  describe('remover', () => {
    const contatoExistente = {
      contatoId: 'ct1',
      nomeContato: 'Alice',
      chavePix: 'alice@email.com',
      tipoChave: 'EMAIL',
      usuarioId: 'u1',
    };

    it('deve remover o contato quando pertencer ao usuário', async () => {
      prisma.contatoPix.findUnique.mockResolvedValue(contatoExistente);
      prisma.contatoPix.delete.mockResolvedValue(contatoExistente);

      const resultado = await service.remover('u1', 'ct1');

      expect(prisma.contatoPix.findUnique).toHaveBeenCalledWith({
        where: { contatoId: 'ct1' },
      });
      expect(prisma.contatoPix.delete).toHaveBeenCalledWith({
        where: { contatoId: 'ct1' },
      });
      expect(resultado).toEqual({ mensagem: 'Contato removido com sucesso.' });
    });

    it('deve lançar NotFoundException quando o contato não existir', async () => {
      prisma.contatoPix.findUnique.mockResolvedValue(null);

      await expect(service.remover('u1', 'inexistente')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.contatoPix.delete).not.toHaveBeenCalled();
    });

    it('deve lançar ForbiddenException quando o contato pertencer a outro usuário', async () => {
      prisma.contatoPix.findUnique.mockResolvedValue(contatoExistente);

      await expect(service.remover('outro-usuario', 'ct1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.contatoPix.delete).not.toHaveBeenCalled();
    });
  });
});
