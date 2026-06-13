import { IsString, Length } from "class-validator";

export class CreateSedeDto {
    @IsString({ message: `El nombre de la sede debe ser un texto valido.` })
    @Length(1, 255)
    nombre: string;
}