import { IsString, IsNotEmpty } from 'class-validator';

export class CreateRandomKeyDto {
  @IsString()
  @IsNotEmpty()
  contaId: string;
}