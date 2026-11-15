import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Delete,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PixKeyService } from './pix-key.service';
import { CreateChavePixDto } from './dto/create-chave-pix.dto';
import { JwtAuthGuard, RequestAutenticada } from '../auth/jwt-auth.guard';

@ApiTags('Chaves Pix')
@ApiBearerAuth()
@Controller('pix/chaves')
export class PixKeyController {
  constructor(private readonly pixKeyService: PixKeyService) {}

  @Get('minhas')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar chaves PIX ativas da conta autenticada' })
  @ApiQuery({ name: 'contaId', required: false, type: String })
  async listarMinhasChaves(
    @Req() req: RequestAutenticada,
    @Query('contaId') contaIdQuery?: string,
  ) {
    const contaId = contaIdQuery || req.user.contaId;
    return this.pixKeyService.listarChavesDaConta(contaId, req.user.usuarioId);
  }

  @Post('aleatoria')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar chave PIX aleatória (EVP)' })
  @ApiQuery({ name: 'contaId', required: false, type: String })
  async createAleatoria(
    @Req() req: RequestAutenticada,
    @Query('contaId') contaIdQuery?: string,
  ) {
    const contaId = contaIdQuery || req.user.contaId;
    return this.pixKeyService.generateRandomKey(contaId, req.user.usuarioId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Vincular chave PIX (CPF, EMAIL, CNPJ)' })
  async createChave(
    @Body() dto: CreateChavePixDto,
    @Req() req: RequestAutenticada,
  ) {
    dto.contaId = dto.contaId || req.user.contaId;
    dto.usuarioId = req.user.usuarioId;
    return this.pixKeyService.associarChavePix(dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inativar / excluir chave PIX da conta' })
  @ApiParam({
    name: 'id',
    description: 'ID da chave (chaveId) ou valor da chave',
  })
  @ApiQuery({ name: 'contaId', required: false, type: String })
  async inativarChave(
    @Param('id') id: string,
    @Req() req: RequestAutenticada,
    @Query('contaId') contaIdQuery?: string,
  ) {
    const contaId = contaIdQuery || req.user.contaId;
    return this.pixKeyService.inativarChavePix(id, contaId, req.user.usuarioId);
  }

  @Patch(':id/suspender')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspender chave PIX da conta' })
  @ApiParam({
    name: 'id',
    description: 'ID da chave (chaveId) ou valor da chave',
  })
  @ApiQuery({ name: 'contaId', required: false, type: String })
  async suspenderChave(
    @Param('id') id: string,
    @Req() req: RequestAutenticada,
    @Query('contaId') contaIdQuery?: string,
  ) {
    const contaId = contaIdQuery || req.user.contaId;
    return this.pixKeyService.suspenderChave(id, contaId, req.user.usuarioId);
  }

  @Patch(':id/desbloquear')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desbloquear chave PIX suspensa' })
  @ApiParam({
    name: 'id',
    description: 'ID da chave (chaveId) ou valor da chave',
  })
  @ApiQuery({ name: 'contaId', required: false, type: String })
  async desbloquearChave(
    @Param('id') id: string,
    @Req() req: RequestAutenticada,
    @Query('contaId') contaIdQuery?: string,
  ) {
    const contaId = contaIdQuery || req.user.contaId;
    return this.pixKeyService.desbloquearChave(id, contaId, req.user.usuarioId);
  }

  @Get(':valorChave')
  @ApiOperation({
    summary: 'Consultar dados do recebedor por valor da chave PIX',
  })
  @ApiParam({ name: 'valorChave', description: 'Valor da chave PIX' })
  async validarChave(@Param('valorChave') valorChave: string) {
    return this.pixKeyService.validarChavePix(valorChave);
  }
}
