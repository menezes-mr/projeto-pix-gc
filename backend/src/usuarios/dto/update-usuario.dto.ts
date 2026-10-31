import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUsuarioDto } from './create-usuario.dto';

export class UpdateUsuarioDto extends PartialType(
  OmitType(CreateUsuarioDto, ['cpfCnpj'] as const),
) {}
