import { IsString } from "class-validator";

export class CreateUsuarioDto {
    @IsString()
    nombre: string;

    @IsString()
    username: string;

    @IsString()
    password: string;
}
