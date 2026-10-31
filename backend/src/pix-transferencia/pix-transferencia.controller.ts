import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RequestAutenticada } from '../auth/jwt-auth.guard';
import { TransferenciaPixDto } from './dto/transferencia-pix.dto';
import { PixTransferenciaService } from './pix-transferencia.service';

@ApiTags('Pix Transferência')
@ApiBearerAuth()
@Controller('pix')
export class PixTransferenciaController {
  constructor(
    private readonly pixTransferenciaService: PixTransferenciaService,
  ) {}

  @Post('transferencia')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Realizar transferência PIX' })
  transferir(
    @Req() request: RequestAutenticada,
    @Body() dto: TransferenciaPixDto,
  ) {
    return this.pixTransferenciaService.transferir(request.user, dto);
  }
}
