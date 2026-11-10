import { BadRequestException, ConflictException, HttpException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateSedeDto } from './dto/create-sede.dto';
import { UpdateSedeDto } from './dto/update-sede.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SedeGateway } from 'src/realtime/gateways/sede.gateway';

@Injectable()
export class SedeService {
  constructor ( 
    private readonly prisma: PrismaService,
    private readonly sedeGateway: SedeGateway
  ) {}
  
  private normalizeUrl(url: string) {
    return url.replace(/\\/g, "/");
  }

  async getSedes() {
    const sedes =await this.prisma.sede.findMany({
      include: {
        jefe_operaciones: {
          select: {
            id: true,
            nombre: true,
            avatar_url: true,
            activo: true,
          },
        },
        campaigns: {
          include: {
            campaign: {
              select: {
                id: true,
                nombre: true,
                hex: true,
                logo_url: true
              }
            }
          }
        }
      }
    });

    return sedes.map(sede => ({
      id: sede.id,
      nombre: sede.nombre,
      jefe_operaciones: sede.jefe_operaciones
        ? {
            ...sede.jefe_operaciones,
            avatar_url: sede.jefe_operaciones.avatar_url
              ? this.normalizeUrl(`${process.env.BASE_URL}/${sede.jefe_operaciones.avatar_url}`)
              : null,
          }
        : null,
      campaigns: sede.campaigns.map(c => ({
        id: c.campaign.id,
        nombre: c.campaign.nombre,
        hex: c.campaign.hex,
        logo_url: this.normalizeUrl(`${process.env.BASE_URL}/${c.campaign.logo_url}`)
      }))
    }));

  }

  async create( dto: CreateSedeDto ) {
    try {
      await this.validarJefeOperaciones(dto.jefe_operaciones_id);
       
      return this.prisma.$transaction(async (tx) => {

        const campaign = await tx.sede.create({
          data: dto
        });

        this.sedeGateway.emitGlobalSedeEvent('created', campaign);

        return { 
          message: `Sede creado satisfactoriamente`,
          status: 201 
        }
      });

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(`Ocurrio un error inesperado al crear una sede: ${error}`);
    }
  }

  async update( id: number, dto: UpdateSedeDto ) {
    try {
      await this.validarJefeOperaciones(dto.jefe_operaciones_id, id);

      return this.prisma.$transaction( async (tx) => {
        const update = await tx.sede.update({
          where: { id },
          data: dto
        });

        this.sedeGateway.emitGlobalSedeEvent('updated', update);

        return {
          message: `Sede actualizada con exito.`,
          status: 200
        }
      });

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(`Ocurrio un error inesperado al actualizar una sede: ${error}`);
    }
  }

  async delete( id: number) {
    try {
      return this.prisma.$transaction( async (tx) => {
        const eliminated = await tx.sede.delete({
          where: { id } 
        });

        this.sedeGateway.emitGlobalSedeEvent('deleted', eliminated);

        return {
          message: `Sede eliminada con exito`,
          status: 200
        }
      });
    } catch (error) {
      throw new InternalServerErrorException(`Ocurrio un error inesperado al intentar eliminar una sede: ${error}`);
    }
  }

  private async validarJefeOperaciones(
    cerradorId?: number | null,
    sedeId?: number,
  ): Promise<void> {
    if (cerradorId === undefined || cerradorId === null) {
      return;
    }

    const [cerrador, sedeAsignada] = await Promise.all([
      this.prisma.cerrador.findFirst({
        where: {
          id: cerradorId,
          activo: true,
        },
        select: { id: true },
      }),
      this.prisma.sede.findFirst({
        where: {
          jefe_operaciones_id: cerradorId,
          ...(sedeId !== undefined && {
            id: { not: sedeId },
          }),
        },
        select: {
          id: true,
          nombre: true,
        },
      }),
    ]);

    if (!cerrador) {
      throw new BadRequestException(
        'El jefe de operaciones debe ser un cerrador activo.',
      );
    }

    if (sedeAsignada) {
      throw new ConflictException(
        `El cerrador ya es jefe de operaciones de la sede ${sedeAsignada.nombre}.`,
      );
    }
  }
}
