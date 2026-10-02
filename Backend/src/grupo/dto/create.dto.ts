import { IsString } from "class-validator";

export class CreateGrupoDto {
  @IsString()
  nombre!: string;
}