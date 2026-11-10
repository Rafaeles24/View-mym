import { IsInt, IsOptional, IsString, Length, Min } from "class-validator";

export class CreateSedeDto {
    @IsString({ message: `El nombre de la sede debe ser un texto valido.` })
    @Length(1, 255)
    nombre: string;

    @IsOptional()
    @IsInt({ message: 'El jefe de operaciones debe ser un identificador válido.' })
    @Min(1)
    jefe_operaciones_id?: number | null;
}
