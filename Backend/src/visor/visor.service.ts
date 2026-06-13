import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateVisorDto } from './dto/create-visor.dto';
import { UpdateVisorDto } from './dto/update-visor.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { TimeService } from 'src/time/time.service';

@Injectable()
export class VisorService {
  constructor(
      private readonly prisma: PrismaService,
      private readonly timeService: TimeService,
    ) {}

  private normalizeUrl(url: string) {
    return url.replace(/\\/g, "/");
  }
  
  async getAllCampaigns() {
    const campaigns = await this.prisma.campaign.findMany({
      include: {
        sedes: {
          include: {
            sede: true
          }
        }
      }
    });

    return campaigns.map(campaign => ({
      id: campaign.id,
      nombre: campaign.nombre,
      hex: campaign.hex,
      logoUrl: this.normalizeUrl(`${process.env.BASE_URL}/${campaign.logo_url}`),
      sedes: campaign.sedes && campaign.sedes.length > 0 ?
        campaign.sedes.map(cs => ({
          id: cs.sede.id,
          nombre: cs.sede.nombre,
        })) : []
    }));
  }

  private diasEntreFechaYHoy(fecha: Date): number {

    const hoy = new Date();

    const fechaUTC = Date.UTC(
      fecha.getFullYear(),
      fecha.getMonth(),
      fecha.getDate()
    );

    const hoyUTC = Date.UTC(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate()
    );

    return Math.floor((hoyUTC - fechaUTC) / (1000 * 60 * 60 * 24));
  }

  async getCampaign(campaignId: number) {
    try {
      const now = new Date();
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          sedes: {
            include: { 
              sede: {
                include: {
                  captions: {
                    include: {
                      caption: true
                    }
                  },
                  supervisores: {
                    where: {
                      activo: true
                    },
                    include: {
                      asesores: {
                        where: {
                          activo: true,
                          fecha_inicio: {
                            lte: now
                          },
                          OR: [
                            {fecha_fin: null},
                            {fecha_fin: {gte: now}}
                          ]
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          asignaciones: {
            include: {
              media: true
            }
          },
          assets: true,
        }
      });

      if (!campaign) throw new NotFoundException(`No se encontro la campana`);

      return {
        id: campaign.id,
        nombre: campaign.nombre,
        hex: campaign.hex,
        logoUrl: this.normalizeUrl(`${process.env.BASE_URL}/${campaign.logo_url}`),
        sedes: campaign.sedes && campaign.sedes.length > 0 ? 
          campaign.sedes.map(cs => ({
            id: cs.sede.id,
            nombre: cs.sede.nombre,
          })) : [],
        medias: campaign.asignaciones && campaign.asignaciones.length > 0 ?
          campaign.asignaciones.map(asignacion => ({
            id: asignacion.media.id,
            mimetype: asignacion.media.mimeType,
            duration: asignacion.media.durationMs,
            url: this.normalizeUrl(`${process.env.BASE_URL}/${asignacion.media.url}`)
          })) : [],
        captions: campaign.sedes && campaign.sedes.length > 0 ? 
          campaign.sedes.flatMap(cs => 
            cs.sede.captions
              .filter(sc =>
                (!sc.started_at || sc.started_at <= now) && 
                (!sc.ended_at || sc.ended_at >= now)
              )
              .map(sc => ({
                id: sc.caption.id,
                title: sc.caption.title,
                text: sc.caption.text,
                hex: sc.caption.hex,
              }))
          ) : [],
        stats: campaign.sedes && campaign.sedes.length > 0 ?
          campaign.sedes.flatMap(cs =>
            cs.sede.supervisores.flatMap(sup =>
              sup.asesores.map(ase => ({
                id: ase.id,
                sede: cs.sede.nombre,
                supervisor: sup.nombre,
                asesor: ase.nombre,
                tipoUsuario: ase.tipo,
                uci: ase.uci,
                hex: ase.hex,
                nroVentas: ase.nro_ventas_total || 0,
                nroVentasSemanal: ase.nro_ventas_semanal || 0,  
                fechaInicio: ase.fecha_inicio,
                fechaFin: ase.fecha_fin,
                nuevo: !!ase.fecha_inicio && this.diasEntreFechaYHoy(ase.fecha_inicio) <=3,
                createdAt: ase.createdAt,
              }))
            )
          ) : [],
        assets: campaign.assets ? {
          flagPe: this.normalizeUrl(`${process.env.BASE_URL}/${campaign.assets.flag_pe}`),
          flagEs: this.normalizeUrl(`${process.env.BASE_URL}/${campaign.assets.flag_es}`)
        } : null
      }

    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Ocurrio un error inesperado al intentar obtener la campana: ${error}`
      ); 
    }
  }
}
