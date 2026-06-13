import { Transform, Type } from "class-transformer";
import { IsArray, IsInt, IsNumberString, ValidateNested } from "class-validator";

export class AddSedeDto {
    @IsNumberString()
    campaign_id: string;

    @Transform(({ value }) => {
        if (!value) return [];
        try {
            const parsed = typeof value === "string" ? JSON.parse(value) : value;

            if (!Array.isArray(parsed)) return [];

            return parsed.map((item) => {
                const sede = new Sede();
                sede.id = Number(item.id);
                return sede;
            })
        } catch (error) {
            return [];
        }
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => Sede)
    sedes: Sede[];
}

class Sede {
    @IsInt()
    id: number;
}