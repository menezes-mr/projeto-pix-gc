import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class AdicionarCotitularDto {
  @IsString()
  @IsNotEmpty()
  identificador!: string;

  @IsString()
  @IsIn(['TITULAR', 'OPERADOR', 'DEPENDENTE'])
  papel!: string;
}

