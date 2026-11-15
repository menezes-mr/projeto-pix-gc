import { IsOptional, IsString } from 'class-validator';

export class BloquearContaDto {
  @IsOptional()
  @IsString()
  usuarioId!: string;

  @IsOptional()
  @IsString()
  motivo?: string;
}
