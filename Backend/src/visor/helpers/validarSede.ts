import { BadRequestException } from "@nestjs/common";

export function validarSedeId(
    sedeId: number
  ): void {
    if (!Number.isInteger(sedeId) || sedeId <=0) 
      throw new BadRequestException('SedeId debe ser un entero positivo');
  }