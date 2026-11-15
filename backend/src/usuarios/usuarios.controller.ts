import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Delete,
  Get,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { JwtAuthGuard, RequestAutenticada } from '../auth/jwt-auth.guard';

@ApiTags('Usuários')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastrar novo usuário' })
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }

  @Get('meus-logs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar logs de atividade do usuário autenticado' })
  listarMeusLogs(
    @Req() req: RequestAutenticada,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.usuariosService.listarLogs(req.user.usuarioId, page, limit);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Excluir usuário por ID' })
  async remove(@Param('id') id: string, @Req() req: RequestAutenticada) {
    this.verificarProprioUsuario(id, req);
    return this.usuariosService.remove(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar dados do usuário por ID' })
  findOne(@Param('id') id: string, @Req() req: RequestAutenticada) {
    this.verificarProprioUsuario(id, req);
    return this.usuariosService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar dados e preferências do usuário' })
  update(
    @Param('id') id: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
    @Req() req: RequestAutenticada,
  ) {
    this.verificarProprioUsuario(id, req);
    return this.usuariosService.update(id, updateUsuarioDto);
  }

  private verificarProprioUsuario(id: string, req: RequestAutenticada) {
    if (id !== req.user.usuarioId) {
      throw new ForbiddenException(
        'Acesso permitido apenas ao próprio usuário',
      );
    }
  }
}
