import { Transform, Type } from "class-transformer";
import { IsArray, IsInt, IsNumberString, ValidateNested } from "class-validator";

export class AddCaptionDto {
    @IsNumberString()
    sede_id: string;

    @Transform(({ value }) => {
        if (!value) return [];
        try {
            const parsed = typeof value === "string" ? JSON.parse(value) : value;

            if (!Array.isArray(parsed)) return [];

            return parsed.map((item) => {
                const caption = new Caption();
                caption.id = Number(item.id);
                return caption;
            })
        } catch (error) {
            return [];
        }
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => Caption)
    captions: Caption[];
}

class Caption {
    @IsInt()
    id: number;
}