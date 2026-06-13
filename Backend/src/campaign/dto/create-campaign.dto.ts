import { Type } from "class-transformer";
import { IsArray, IsHexColor, IsNotEmpty, IsNumber, IsNumberString, IsOptional, IsString, Length, ValidateNested } from "class-validator";

export class CreateCampaignDto {
    @IsNotEmpty()
    @IsString()
    @Length(1, 255, { message: 'El rango de nombre fue exedido' })
    nombre: string;


    @IsOptional()
    @IsHexColor({ message: 'El color Hex debe ser un codigo valido' })
    hex?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SedeDto)
    sedes?: SedeDto[]
}

class SedeDto {
    @IsNumber()
    id: number;
}
