import { PartialType } from '@nestjs/mapped-types';
import { CreateCaptionDto } from './create-caption.dto';

export class UpdateCaptionDto extends PartialType(CreateCaptionDto) {}
