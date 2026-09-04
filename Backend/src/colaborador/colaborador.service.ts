import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomUUID } from 'crypto';
import { FilesService } from 'src/files/files.service';
import { ColaboradorPagination } from './pagination/colaPagination.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ColaboradorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileService: FilesService
  ) {}

  private normalizeUrl(url: string) {
    return url.replace(/\\/g, "/");
  }

  async updateAvatar(
    id: number,
    file: {
      buffer: Buffer,
      originalname: string,
      mimetype: string,
      size: number
    }
  ) {
    let pathDir: { path: string } = { path: '' };

    const colaborador = await this.prisma.colaborador.findUnique({
      where: { id }
    });

    if (!colaborador) throw new NotFoundException(
      `No se encontro el colaborador con ID: ${id}`
    );

    if (!file?.buffer) throw new BadRequestException("No se recibio un archivo valido.");

    try {
      if (colaborador.avatar_url) {
        const oldFolder = colaborador.avatar_url;
        const oldPath = oldFolder.substring(0, oldFolder.lastIndexOf('/'));
        await this.fileService.deleteFolder(oldPath);
      }

      const colaboradorKey = randomUUID();

      const pathResult = await this.fileService.createDir(`colaborador/avatar/${colaboradorKey}`);

      pathDir = pathResult;

      const filePayload = [
        {
          buffer: file.buffer,
          filename: file.originalname,
          pathDir: pathResult.path,
          mimetype: file.mimetype
        }
      ];

      const pathFile = await this.fileService.createFiles(filePayload);

      await this.prisma.$transaction( async (tx) => {
        return await tx.colaborador.update({
          where: { id },
          data: {
            avatar_url: pathFile[0].path
          }
        })
      });

      return {
        message: `Avatar actualizado con exito.`,
        status: 200
      }

    } catch (error) {
      if (pathDir) await this.fileService.deleteFolder(pathDir.path);

      throw new InternalServerErrorException(
        `Ocurrio un error inesperado al intentar actualizar el avatar: ${error}`
      )
    }
  }

  async getColaboradores({
    page= 1,
    limit= 50,
    nombre,
    supervisor,
    variante,
    sedeId,
    campaignId,
    activo,
    startDate,
    endDate,
  }: ColaboradorPagination) {
    const currentPage = Math.max(Number(page) || 1, 1);
    const currentLimit = Math.min(
      Math.max(Number(limit) || 50, 1),
      100,
    );

    const skip =
      (currentPage - 1) * currentLimit;

    /*
     * Filtro dinámico.
     */
    const where: Prisma.ColaboradorWhereInput = {};

    if (nombre?.trim()) {
      where.nombre = {
        contains: nombre.trim(),
      };
    }

    if (supervisor !== undefined) {
      where.supervisor = supervisor;
    }

    if (variante) {
      where.variante = variante;
    }

    if (sedeId !== undefined) {
      where.sede_id = sedeId;
    }

    if (campaignId !== undefined) {
      where.campaign_id = campaignId;
    }

    if (activo !== undefined) {
      where.activo = activo;
    }

    /*
     * Filtro por fecha de creación.
     *
     * startDate:
     * Desde las 00:00:00 del día indicado.
     *
     * endDate:
     * Se utiliza el inicio del día siguiente como límite
     * exclusivo para incluir todo el día indicado.
     */
    if (startDate || endDate) {
      where.createdAt = {};

      if (startDate) {
        where.createdAt.gte =
          this.parseStartDate(startDate);
      }

      if (endDate) {
        where.createdAt.lt =
          this.parseEndDate(endDate);
      }
    }

    const [colaboradores, total] =
      await this.prisma.$transaction([
        this.prisma.colaborador.findMany({
          where,

          skip,
          take: currentLimit,

          select: {
            id: true,
            nombre: true,
            supervisor: true,
            variante: true,
            avatar_url: true,
            tramitadas: true,
            activo: true,
            sede_id: true,
            campaign_id: true,
            createdAt: true,
            updatedAt: true,

            sede: {
              select: {
                id: true,
                nombre: true,
              },
            },

            campaign: {
              select: {
                id: true,
                nombre: true,
                logo_url: true,
                hex: true,
              },
            },
          },

          orderBy: [
            {
              activo: 'desc',
            },
            {
              nombre: 'asc',
            },
          ],
        }),

        this.prisma.colaborador.count({
          where,
        }),
      ]);

    const totalPages =
      total === 0
        ? 0
        : Math.ceil(total / currentLimit);

    const colab = colaboradores.map((colab) => ({
      id: colab.id,
      nombre: colab.nombre,
      supervisor: colab.supervisor,
      variante: colab.variante,
      avatar_url: colab.avatar_url ? this.normalizeUrl(`${process.env.BASE_URL}/${colab.avatar_url}`): null,
      tramitadas: colab.tramitadas,
      activo: colab.activo,
      createdAt: colab.createdAt,
      updatedAt: colab.updatedAt,
      sede: {
        id: colab.sede.id,
        nombre: colab.sede.nombre
      },
      campaign: {
        id: colab.campaign.id,
        nombre: colab.campaign.nombre,
        logo_url: this.normalizeUrl(`${process.env.BASE_URL}/${colab.campaign.logo_url}`),
        hex: colab.campaign.hex
      }
    }))
    
    return {
      data: colab,
      pagination: {
        total,
        page: currentPage,
        limit: currentLimit,
        totalPages,
        hasNextPage:
          currentPage < totalPages,
        hasPreviousPage:
          currentPage > 1,
      },

      filters: {
        nombre: nombre?.trim() || null,
        supervisor:
          supervisor ?? null,
        variante:
          variante ?? null,
        sedeId:
          sedeId ?? null,
        campaignId:
          campaignId ?? null,
        activo:
          activo ?? null,
        startDate:
          startDate ?? null,
        endDate:
          endDate ?? null,
      },
    };
  }

  private parseStartDate(value: string): Date {
    const date = this.parseDate(value);

    /*
     * Si se envía únicamente YYYY-MM-DD,
     * se toma desde el inicio del día UTC.
     */
    if (this.isDateOnly(value)) {
      date.setUTCHours(0, 0, 0, 0);
    }

    return date;
  }

  private parseEndDate(value: string): Date {
    const date = this.parseDate(value);

    /*
     * Para una fecha YYYY-MM-DD, el límite será
     * el inicio del día siguiente.
     *
     * Ejemplo:
     * endDate=2026-07-30
     * createdAt < 2026-07-31T00:00:00.000Z
     */
    if (this.isDateOnly(value)) {
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() + 1);

      return date;
    }

    /*
     * Cuando se envía fecha y hora, se usa esa hora
     * como límite exclusivo.
     */
    return date;
  }

  private parseDate(value: string): Date {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(
        `La fecha "${value}" no tiene un formato válido.`,
      );
    }

    return date;
  }

  private isDateOnly(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }
}
