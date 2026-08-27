import { IsString, IsNotEmpty } from 'class-validator';

export class CreateRandomKeyDto {
  @IsString()
  @IsNotEmpty()
  contaId: string;

  // Provisório: enquanto não existe autenticação, o usuário vem no corpo.
  // Quando o login estiver pronto, troque por req.user.id e remova este campo.
  // necessário para validar se a conta pertence ao usuário informado.
  @IsString()
  @IsNotEmpty()
  usuarioId: string;
}