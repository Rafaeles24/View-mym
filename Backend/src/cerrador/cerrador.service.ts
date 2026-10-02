import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCerradorDto } from './dto/create.dto';

@Injectable()
export class CerradorService {
  constructor(
    private readonly prisma: PrismaService
  ) {}

  async getCerrador(id: number) {
    return await this.prisma.cerrador.findUnique({
      where: { id }
    });
  }

  async create(dto: CreateCerradorDto) {
    try {
      const cerrador = await this.prisma.cerrador.create({
        data: {
          nombre: this.generarNombreCorto(dto.nombre),
          nombre_normalizado: dto.nombre
        }
      });

      return cerrador;
    } catch (error) {
      throw new InternalServerErrorException(`Ocurrio un error al crear un cerrador: ${error}`)
    }
  }

  private generarNombreCorto(nc: string): string {
    const partes = nc
      .trim()
      .replace(/\s+/g, " ")
      .split(" ");

    if (partes.length >= 3) {
      const primerNombre = partes[0];
      const primerApellido = partes[2];

      return `${primerNombre} ${primerApellido}`;
    }

    if (partes.length === 2) {
      return `${partes[0]} ${partes[1]}`;
    }

    return partes[0] ?? "";
  }
}
