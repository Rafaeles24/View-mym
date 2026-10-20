import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { validarSedeId } from "../helpers/validarSede";

@Injectable()
export class VisorSedeService {
  constructor(
    private readonly prisma: PrismaService
  ) {}

  async obtenerSede(
    sedeId: number
  ) {
    validarSedeId(sedeId);

    const sede = await this.prisma.sede.findUnique({
      where: { id: sedeId },
      select: {
        id: true,
        nombre: true,
      }
    })

    if (!sede) throw new NotFoundException('Sede no encontrado');

    return {
      id: sede.id,
      nombre: sede.nombre === 'TOMAS VALLE'
        ? 'TOMAS V.' : sede.nombre === 'BACKOFFICE' ? 'BO': sede.nombre,
    }
  }
}