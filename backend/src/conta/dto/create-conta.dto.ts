import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';


export class CreateContaDto {
  @IsNotEmpty({ message: 'A agência é obrigatória.' })
  @IsString()
  agencia!: string;

  @IsNotEmpty({ message: 'O número da conta é obrigatório.' })
  @IsString()
  numeroConta!: string;

  @IsNotEmpty({ message: 'O ID do usuário é obrigatório.' })
  @IsString()
  usuarioId!: string;

  @IsOptional()
  @IsNumber()
  limiteDiarioPix?: number;
}