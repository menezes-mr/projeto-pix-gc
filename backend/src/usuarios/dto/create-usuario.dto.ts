import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
  IsOptional,
  IsBoolean,
  registerDecorator,
} from 'class-validator';

function cpfValido(value: string): boolean {
  if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) return false;
  for (let pos = 9; pos <= 10; pos++) {
    let soma = 0;
    for (let i = 0; i < pos; i++) soma += Number(value[i]) * (pos + 1 - i);
    const digito = (soma * 10) % 11;
    if ((digito === 10 ? 0 : digito) !== Number(value[pos])) return false;
  }
  return true;
}

function IsCpfValido(): PropertyDecorator {
  return (target, propertyName) =>
    registerDecorator({
      name: 'isCpfValido',
      target: target.constructor,
      propertyName: String(propertyName),
      options: { message: 'CPF inválido' },
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' &&
          (value.length !== 11 || cpfValido(value)),
      },
    });
}

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
  @IsCpfValido()
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
  @Matches(/[A-Z]/, {
    message: 'A senha deve conter pelo menos uma letra maiúscula',
  })
  @Matches(/\d/, {
    message: 'A senha deve conter pelo menos um número',
  })
  @Matches(/[^A-Za-z0-9]/, {
    message: 'A senha deve conter pelo menos um caractere especial',
  })
  senha!: string;

  @IsBoolean()
  @IsOptional()
  receberSms?: boolean;

  @IsBoolean()
  @IsOptional()
  receberEmail?: boolean;

  @IsBoolean()
  @IsOptional()
  receberPush?: boolean;
}
