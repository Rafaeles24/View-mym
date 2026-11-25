import { Transform } from 'class-transformer';
import type { TransformFnParams } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCerradorDto {
  @Transform(({ value }: TransformFnParams) => {
    const valor: unknown = value;

    return typeof valor === 'string'
      ? valor.trim().replace(/\s+/g, ' ')
      : valor;
  })
  @IsString({
    message: 'El nombre del cerrador debe ser texto',
  })
  @IsNotEmpty({
    message: 'El nombre del cerrador es obligatorio',
  })
  @MaxLength(150, {
    message: 'El nombre no debe superar los 150 caracteres',
  })
  nombre!: string;
}
