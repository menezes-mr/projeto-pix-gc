import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ContatosPixService } from './contatos-pix.service';
import { CreateContatoPixDto } from './dto/create-contato-pix.dto';
import { JwtAuthGuard, RequestAutenticada } from '../auth/jwt-auth.guard';

@ApiTags('Contatos Pix')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contatos')
export class ContatosPixController {
  constructor(private readonly contatosPixService: ContatosPixService) {}

  @Get()
  @ApiOperation({ summary: 'Listar contatos PIX do usuário autenticado' })
  async listar(@Req() req: RequestAutenticada) {
    return this.contatosPixService.listar(req.user.usuarioId, req.user.contaId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastrar novo contato PIX' })
  async criar(
    @Req() req: RequestAutenticada,
    @Body() dto: CreateContatoPixDto,
  ) {
    return this.contatosPixService.criar(
      req.user.usuarioId,
      dto,
      req.user.contaId,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover contato PIX da agenda' })
  @ApiParam({ name: 'id', description: 'ID do contato (contatoId)' })
  async remover(@Req() req: RequestAutenticada, @Param('id') id: string) {
    return this.contatosPixService.remover(
      req.user.usuarioId,
      id,
      req.user.contaId,
    );
  }
}
