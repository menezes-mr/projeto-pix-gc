import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsString({ message: 'O identificador deve ser um texto' })
  @IsNotEmpty({ message: 'O identificador é obrigatório' })
  identificador: string;

  @IsString({ message: 'A senha deve ser um texto' })
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  senha: string;
}
