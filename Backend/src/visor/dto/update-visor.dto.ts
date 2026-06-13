import { PartialType } from '@nestjs/mapped-types';
import { CreateVisorDto } from './create-visor.dto';

export class UpdateVisorDto extends PartialType(CreateVisorDto) {}
