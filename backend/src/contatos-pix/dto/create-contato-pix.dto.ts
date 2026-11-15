import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class CreateContatoPixDto {
  @IsString()
  @IsNotEmpty()
  nomeContato!: string;

  @IsString()
  @IsNotEmpty()
  chavePix!: string;

  @IsString()
  @IsIn(['CPF', 'CNPJ', 'EMAIL', 'TELEFONE', 'ALEATORIA'])
  tipoChave!: string;
}
