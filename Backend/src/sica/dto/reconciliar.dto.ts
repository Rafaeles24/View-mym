import { IsNotEmpty, IsString, Matches } from "class-validator";

export class ReconciliarSicaDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}\/\d{2}\/\d{4}$/, {
    message: 'inicio debe tener formato dd/MM/yyyy',
  })
  inicio!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}\/\d{2}\/\d{4}$/, {
    message: 'fin debe tener formato dd/MM/yyyy',
  })
  fin!: string;
}
