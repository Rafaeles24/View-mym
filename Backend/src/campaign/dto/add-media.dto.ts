import { Transform, Type } from "class-transformer";
import { IsArray, IsNumber, IsNumberString, ValidateNested } from "class-validator";

export class AddMediaDto {
    @IsNumberString()
    campaignId: string;

    @Transform(({ value }) => {
        if (!value) return [];
        try {
            const parsed = typeof value === "string" ? JSON.parse(value) : value;
            if (!Array.isArray(parsed)) return [];

            return parsed.map((item) => {
                const media = new MediaDto();
                media.id = item.id;
                return media;
            })
        } catch (error) {
            return [];
        }
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MediaDto)
    asignaciones: MediaDto[];
}

class MediaDto {
    @IsNumber()
    id: number;
}