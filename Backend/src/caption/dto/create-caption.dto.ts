import { IsHexColor, IsNumber, IsString } from "class-validator";

export class CreateCaptionDto {
    @IsString()
    title: string;

    @IsNumber()
    sku_id: number;

    @IsString()
    text: string;

    @IsHexColor()
    hex?: string;
}
