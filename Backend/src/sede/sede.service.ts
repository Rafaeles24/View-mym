import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateSedeDto } from './dto/create-sede.dto';
import { UpdateSedeDto } from './dto/update-sede.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RealtimeGateway } from 'src/realtime/realtime.gateway';
import { AddCaptionDto } from './dto/add-caption.dto';

@Injectable()
export class SedeService {
  constructor ( 
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeGateway 
  ) {}
  
  private normalizeUrl(url: string) {
    return url.replace(/\\/g, "/");
  }

  async getSedes() {
    const sedes =await this.prisma.sede.findMany({
      include: {
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
      
      return this.prisma.$transaction(async (tx) => {

        const campaign = await tx.sede.create({
          data: dto
        });

        this.rt.emitGlobalSedeEvent('create', campaign);

        return { 
          message: `Sede creado satisfactoriamente`,
          status: 201 
        }
      });

    } catch (error) {
      throw new InternalServerErrorException(`Ocurrio un error inesperado al crear una sede: ${error}`);
    }
  }

  async update( id: number, dto: UpdateSedeDto ) {
    try {
      return this.prisma.$transaction( async (tx) => {
        const update = await tx.sede.update({
          where: { id },
          data: dto
        });

        this.rt.emitGlobalSedeEvent('updated', update);

        return {
          message: `Sede actualizada con exito.`,
          status: 200
        }
      });

    } catch (error) {
      throw new InternalServerErrorException(`Ocurrio un error inesperado al actualizar una sede: ${error}`);
    }
  }

  async delete( id: number) {
    try {
      return this.prisma.$transaction( async (tx) => {
        const eliminated = await tx.sede.delete({
          where: { id } 
        });

        this.rt.emitGlobalSedeEvent('deleted', eliminated);

        return {
          message: `Sede eliminada con exito`,
          status: 200
        }
      });
    } catch (error) {
      throw new InternalServerErrorException(`Ocurrio un error inesperado al intentar eliminar una sede: ${error}`);
    }
  }
}
