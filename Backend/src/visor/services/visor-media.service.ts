import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { normalizeUrl } from "../helpers/normalizeUrl";

@Injectable()
export class VisorMediaService {
  constructor(
    private readonly prisma: PrismaService
  ) {}

  async obtenerMediaPorSede(
    sedeId: number
  ) {
    const sede = await this.prisma.sede.findFirstOrThrow({
      where: { id: sedeId },
      include: {
        medias: {
          include: {
            media: true
          },
          orderBy: {
            prioridad: 'desc'
          }
        }
      }
    });

    return {
      ...sede,

      medias: sede.medias.map((asignacion) => ({
        id: asignacion.media.id,
        url: normalizeUrl(`${process.env.BASE_URL}/${asignacion.media.url}`),
        prioridad: asignacion.prioridad,
        inicio: asignacion.started_at,
        fin: asignacion.ended_at,
        mimetype: asignacion.media.mimeType,
        duracionms: asignacion.media.durationMs,
      }))
    }
  }
}