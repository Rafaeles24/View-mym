import { IsString } from "class-validator";

export class CreateCerradorDto {
  @IsString()
  nombre!: string;
}