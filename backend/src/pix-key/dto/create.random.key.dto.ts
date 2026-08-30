import { IsString, IsNotEmpty } from 'class-validator';

export class CreateRandomKeyDto {
  @IsString()
  @IsNotEmpty()
  contaId: string;

 //so por enquanto, pq é preciso para logar a ação de criação da chave aleatória
  @IsString()
  @IsNotEmpty()
  usuarioId: string;
}