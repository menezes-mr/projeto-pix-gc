import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
  IsOptional,
} from 'class-validator';

export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  nomeCompleto!: string;

  @IsEmail({}, { message: 'Formato de e-mail inválido' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório' })
  email!: string;

  @IsString({ message: 'O CPF/CNPJ deve conter apenas números' })
  @IsNotEmpty({ message: 'O CPF/CNPJ é obrigatório' })
  @Matches(/^(\d{11}|\d{14})$/, {
    message:
      'O CPF deve ter 11 dígitos ou o CNPJ deve ter 14 dígitos (apenas números)',
  })
  cpfCnpj!: string;

  @IsString({ message: 'O telefone deve ser uma string' })
  @Matches(/^\d{10,11}$/, {
    message:
      'O telefone deve conter apenas números (DDD + número, entre 10 e 11 dígitos)',
  })
  @IsOptional()
  telefone?: string | null;

  @IsString()
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  senha!: string;
}
