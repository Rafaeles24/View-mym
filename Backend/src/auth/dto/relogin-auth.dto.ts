import { IsString } from "class-validator";

export class ReLoginDto {
    @IsString()
    password: string;
}