import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Delete,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
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
  async listarMinhasChaves(@Req() req: RequestAutenticada) {
    return this.pixKeyService.listarChavesDaConta(req.user.contaId as string);
  }

  @Post('aleatoria')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar chave PIX aleatória (EVP)' })
  async createAleatoria(@Req() req: RequestAutenticada) {
    return this.pixKeyService.generateRandomKey(
      req.user.contaId as string,
      req.user.usuarioId,
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Vincular chave PIX (CPF, EMAIL, CNPJ)' })
  async createChave(
    @Body() dto: CreateChavePixDto,
    @Req() req: RequestAutenticada,
  ) {
    dto.contaId = req.user.contaId;
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
  async inativarChave(@Param('id') id: string, @Req() req: RequestAutenticada) {
    return this.pixKeyService.inativarChavePix(
      id,
      req.user.contaId as string,
      req.user.usuarioId,
    );
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
