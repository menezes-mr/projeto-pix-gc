import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard, RequestAutenticada } from './jwt-auth.guard';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Realizar login e obter JWT access_token' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('admin-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Realizar login administrativo e obter JWT com papel ADMIN',
  })
  async adminLogin(@Body() loginDto: LoginDto) {
    return this.authService.adminLogin(loginDto);
  }

  @Get('minhas-contas')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar todas as contas vinculadas ao usuário autenticado',
  })
  async listarMinhasContas(@Req() req: RequestAutenticada) {
    return this.authService.listarMinhasContas(req.user.usuarioId);
  }

  @Post('trocar-conta')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Alternar a conta bancária ativa na sessão e emitir novo JWT',
  })
  async trocarConta(
    @Req() req: RequestAutenticada,
    @Body() body: { contaId: string },
  ) {
    return this.authService.trocarConta(req.user.usuarioId, body.contaId);
  }
}
