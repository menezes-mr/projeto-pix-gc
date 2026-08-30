import { IsString, IsNotEmpty, IsPositive, IsNumber } from 'class-validator';

export class RecebimentoPixDto {
  @IsString()
  @IsNotEmpty()
  chavePixDestino: string;

  @IsNumber()
  @IsPositive()
  valor: number;

  @IsString()
  @IsNotEmpty()
  transacaoExternaId: string;
}