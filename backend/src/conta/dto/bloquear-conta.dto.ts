import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class BloquearContaDto {
  @IsNotEmpty({ message: 'O ID do usuário/administrador responsável é obrigatório.' })
  @IsString()
  usuarioId!: string;

  @IsOptional()
  @IsString()
  motivo?: string;
}