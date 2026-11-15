import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RequestAutenticada } from '../auth/jwt-auth.guard';
import { PixRecebimentoService } from './pix-recebimento.service';
import { RecebimentoPixDto } from './dto/recebimento-pix.dto';

@ApiTags('Pix Recebimento')
@ApiBearerAuth()
@Controller('pix/recebimento')
@UseGuards(JwtAuthGuard)
export class PixRecebimentoController {
  constructor(private readonly pixRecebimentoService: PixRecebimentoService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simular recebimento PIX em ambiente de testes' })
  async receber(
    @Req() req: RequestAutenticada,
    @Body() dto: RecebimentoPixDto,
  ) {
    return this.pixRecebimentoService.receberPix(req.user, dto);
  }
}
