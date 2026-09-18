import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  Min,
} from 'class-validator';

export class AssignMediaToSedesDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  mediaId!: number;

  @IsArray()
  @ArrayUnique()
  sedeIds!: number[];
}