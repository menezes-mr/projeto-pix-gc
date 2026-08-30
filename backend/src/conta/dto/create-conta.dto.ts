import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateContaDto {
  @IsNotEmpty({ message: 'O ID do usuário é obrigatório.' })
  @IsString()
  usuarioId!: string;

  @IsOptional()
  @IsNumber({}, { message: 'O limite diário do PIX deve ser um valor numérico.' })
  @Min(0, { message: 'O limite diário do PIX não pode ser negativo.' })
  limiteDiarioPix?: number;
}