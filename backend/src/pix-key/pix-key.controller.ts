import { Controller, Post, Body, HttpCode, HttpStatus, Get, Param, UseGuards, Req } from '@nestjs/common';
import { PixKeyService } from './pix-key.service';
import { CreateRandomKeyDto } from './dto/create.random.key.dto';
import { CreateChavePixDto } from './dto/create-chave-pix.dto';
import { JwtAuthGuard, RequestAutenticada } from '../auth/jwt-auth.guard';

@Controller('pix/chaves')
export class PixKeyController {
  constructor(private readonly pixKeyService: PixKeyService) {}

  @Get('minhas')
  @UseGuards(JwtAuthGuard)
  async listarMinhasChaves(@Req() req: RequestAutenticada) {
    return this.pixKeyService.listarChavesDaConta(req.user.contaId as string);
  }

  @Post('aleatoria')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createAleatoria(@Req() req: RequestAutenticada) {
    return this.pixKeyService.generateRandomKey(req.user.contaId as string, req.user.usuarioId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createChave(@Body() dto: CreateChavePixDto, @Req() req: RequestAutenticada) {
    dto.contaId = req.user.contaId as string;
    dto.usuarioId = req.user.usuarioId;
    return this.pixKeyService.associarChavePix(dto);
  }

  @Get(':valorChave')
  async validarChave(@Param('valorChave') valorChave: string) {
    return this.pixKeyService.validarChavePix(valorChave);
  }
}