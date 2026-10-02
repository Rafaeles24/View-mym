import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateGrupoDto } from './dto/create.dto';

@Injectable()
export class GrupoService {
  constructor(
    private readonly prisma: PrismaService
  ) {}

  async getGrupo(id: number) {
    return await this.prisma.grupo.findUnique({
      where: { id }
    });
  }

  async create(dto: CreateGrupoDto) {
    try {
      const grupo = await this.prisma.grupo.create({
        data: dto
      });

      return {
        message: `Grupo ${grupo.nombre} creado exitosamente.`,
        statusCode: 201
      }

    } catch (error) {
      throw new InternalServerErrorException(`Ocurrio un error al intentar crear un grupo.`);
    }
  }
}
