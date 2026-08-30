import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class TransferenciaPixDto {
  @IsString()
  @IsNotEmpty()
  chavePixDestino!: string;

  @IsNumber(
    { allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 },
    { message: 'O valor deve ser um número com no máximo duas casas decimais' },
  )
  @Min(0.01, { message: 'O valor da transferência deve ser maior que zero' })
  valor!: number;
}
