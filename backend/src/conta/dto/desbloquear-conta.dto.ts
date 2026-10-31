import { IsOptional, IsString } from 'class-validator';

export class DesbloquearContaDto {
  @IsOptional()
  @IsString()
  usuarioId?: string;

  @IsOptional()
  @IsString()
  motivo?: string;
}
