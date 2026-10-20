import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { FilesService } from 'src/files/files.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomUUID } from "crypto";
import { MediaPagination } from './pagination/mediaPagination.dto';
import { DeleteMediaDto } from './dto/delete-media.dto';
import path from 'path';
import { OptimizeService } from 'src/optimize/optimize.service';
import { AssignMediaToSedesDto } from './dto/add-media.dto';
import { SedeGateway } from 'src/realtime/gateways/sede.gateway';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileService: FilesService,
    private readonly optimizeService: OptimizeService,
    private readonly sedeGateway: SedeGateway,
  ) {}
  
  private normalizeUrl(url: string) {
    return url.replace(/\\/g, "/");
  }

  async getMedias({
    page = 1,
    limit = 50,
    mimetype,
    sedeId,
    startDate,
    endDate
  } : MediaPagination) {
    try {
      const skip = (page - 1) * limit;
      
      const where: any = {
        ...(mimetype && {
          mimeType: {
            contains: mimetype
          }
        }),

        ...(sedeId || startDate || endDate 
          ? {
            asignaciones: {
              some: {
                ...(sedeId && {
                  sedeId: sedeId
                }),

                ...((startDate || endDate) && {
                  AND: [
                    {
                      OR: [
                        { started_at: null },
                        ...(startDate
                          ? [{started_at: { lte: new Date(startDate) }}]
                          : []
                        )
                      ]
                    },
                    {
                      OR: [
                        { ended_at: null },
                        ...(endDate
                          ? [{ ended_at: { gte: new Date(endDate) } }]
                          : []
                        )
                      ]
                    }
                  ]
                })
              }
            }
          } : {}
        )
      }

      const [ medias, total ] = await Promise.all([
        this.prisma.media.findMany({
          where,
          include: {
            asignaciones: {
              include: {
                sede: true
              }
            }
          },
          skip,
          take: limit,
          orderBy: {
            createdAt: "desc"
          }
        }),

        this.prisma.media.count({ where })
      ]);

      return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        data: medias.map(media => {

          return {
            id: media.id,
            url: this.normalizeUrl(`${process.env.BASE_URL}/${media.url}`),
            mimetype: media.mimeType,
            duration: media.durationMs,
            createdat: media.createdAt,

            sedes:
              media.asignaciones?.map(a => ({
                id: a.sede.id,
                nombre: a.sede.nombre,
                prioridad: a.prioridad,
                started_at: a.started_at,
                ended_at: a.ended_at
              })) || []
          }
        })
      }

    } catch (error) {
      throw new InternalServerErrorException(`Error obteniendo las medias: ${error}`);
    }
    
  }

  async create(
      files: {
          buffer: Buffer,
          filename: string,
          mimetype: string,
          size: number,
      }[]
  ) {
      let pathDir: { path: string } = { path: '' };
      try {
          
          if (!files || files.length === 0) {
              throw new BadRequestException(
                  `No hay archivos para agregar.`
              );
          }
          const storageKey = randomUUID();
          const pathDirResult = await this.fileService.createDir(
              `media/${storageKey}`
          );

          pathDir = pathDirResult;

          const optimizedFiles = await this.optimizeService.optimizeFiles(files);

          const createdFiles = await this.fileService.createFiles(
              optimizedFiles.map(file => ({
                  buffer: file.buffer,
                  filename: file.filename,
                  pathDir: pathDir.path,
                  mimetype: file.mimetype,
              }))
          );
          const savedFiles = createdFiles.map(file => ({
              url: file.path,
              filename: file.filename,
              mimetype: file.mimetype,
          }));
          const mediaData = await Promise.all(
              savedFiles.map(async (file, i) => {
                  let durationMs = 60000;
                  
                  if (file.mimetype.startsWith('video/')) {
                      try {
                          durationMs = await this.fileService.getVideoDuration(file.url);
                      } catch (error) {
                          throw new InternalServerErrorException(
                              `Error obteniendo la duracion del video ${file.filename}: ${error}`
                          );
                      }
                  } 
                  return {
                      nombre: file.filename,
                      url: file.url,
                      mimetype: file.mimetype,
                      durationMs: durationMs
                  }
              })
          );
          const saved = await this.prisma.media.createMany({
              data: mediaData.map(media => ({
                  nombre: media.nombre,
                  url: media.url,
                  mimeType: media.mimetype,
                  durationMs: media.durationMs
              }))
          });
          return {
              message: `${saved.count} archivos guardados correctamente`,
              status: 'success'
          }
      } catch (error) {
          if (pathDir.path) await this.fileService.deleteFolder(pathDir.path);  
          throw new InternalServerErrorException(
              `Error creando los archivos: ${error}`
          );
      }
  }

  async delete(dto: DeleteMediaDto) {
      try {
          await this.prisma.$transaction(async (tx) => {
            const media = await tx.media.findUnique({
              where: { id: dto.id }
            });

            if (!media) throw new NotFoundException(`No se encontro la media con id: ${dto.id}`);
            
            const folderPath = path.dirname(media.url);
            await this.fileService.deleteFolder(folderPath);
            
            await tx.media.delete({
              where: { id: media.id }
            });
          })

          return {
            message: `Media eliminado exitosamente.`,
            state: 200
          }
      } catch (error) {
          throw new InternalServerErrorException(
              `Error eliminando el media: ${error}`
          );
      }
  } 

  async asignarMediaASedes(
    dto: AssignMediaToSedesDto,
  ) {
    /*
     * 1. Validar que la media exista.
     */
    const media = await this.prisma.media.findUnique({
      where: {
        id: dto.mediaId,
      },
      select: {
        id: true,
        nombre: true,
        durationMs: true,
      },
    });

    if (!media) {
      throw new NotFoundException(
        `La media ${dto.mediaId} no existe.`,
      );
    }

    /*
     * 2. Eliminar posibles sedes duplicadas.
     *
     * Si vienen dos configuraciones para la misma sede,
     * nos quedamos con la última.
     */
    const sedesMap = new Map<
      number,
      AssignMediaToSedesDto["sedes"][number]
    >();

    for (const sede of dto.sedes) {
      sedesMap.set(sede.sedeId, sede);
    }

    const sedesDto = Array.from(
      sedesMap.values(),
    );

    const sedeIds = sedesDto.map(
      (sede) => sede.sedeId,
    );

    /*
     * Sedes que deberán recibir refresh
     * por Socket.IO.
     */
    const sedesAfectadas =
      new Set<number>();

    const resultado =
      await this.prisma.$transaction(
        async (tx) => {
          /*
           * 3. Validar que todas las sedes existan.
           */
          if (sedeIds.length > 0) {
            const sedes =
              await tx.sede.findMany({
                where: {
                  id: {
                    in: sedeIds,
                  },
                },

                select: {
                  id: true,
                },
              });

            const sedesExistentes =
              new Set(
                sedes.map(
                  (sede) => sede.id,
                ),
              );

            const sedesNoExistentes =
              sedeIds.filter(
                (id) =>
                  !sedesExistentes.has(id),
              );

            if (
              sedesNoExistentes.length > 0
            ) {
              throw new NotFoundException(
                `Las siguientes sedes no existen: ${sedesNoExistentes.join(", ")}`,
              );
            }
          }

          /*
           * 4. Obtener asignaciones actuales.
           */
          const asignacionesActuales =
            await tx.asignacionMedia.findMany({
              where: {
                media_id: dto.mediaId,
              },

              select: {
                sede_id: true,
                prioridad: true,
                started_at: true,
                ended_at: true,
              },
            });

          const asignacionesMap =
            new Map(
              asignacionesActuales.map(
                (asignacion) => [
                  asignacion.sede_id,
                  asignacion,
                ],
              ),
            );

          const idsActuales =
            asignacionesActuales.map(
              (asignacion) =>
                asignacion.sede_id,
            );

          /*
           * 5. Calcular sedes nuevas,
           *    eliminadas y existentes.
           */

          const idsAgregar =
            sedeIds.filter(
              (id) =>
                !asignacionesMap.has(id),
            );

          const idsEliminar =
            idsActuales.filter(
              (id) =>
                !sedesMap.has(id),
            );

          const idsExistentes =
            sedeIds.filter(
              (id) =>
                asignacionesMap.has(id),
            );

          /*
           * 6. Actualizar duración global
           *    de la media si fue enviada.
           */
          let durationActualizada = false;

          if (
            dto.duration !== undefined &&
            dto.duration !== media.durationMs
          ) {
            await tx.media.update({
              where: {
                id: dto.mediaId,
              },

              data: {
                durationMs: dto.duration,
              },
            });

            durationActualizada = true;

            /*
             * Si cambia la duración de la media,
             * todas las sedes actualmente relacionadas
             * deben refrescarse.
             */
            for (const sedeId of sedeIds) {
              sedesAfectadas.add(
                sedeId,
              );
            }

            for (const sedeId of idsActuales) {
              sedesAfectadas.add(
                sedeId,
              );
            }
          }

          /*
           * 7. Eliminar relaciones que
           *    ya no corresponden.
           */
          if (
            idsEliminar.length > 0
          ) {
            await tx.asignacionMedia.deleteMany({
              where: {
                media_id:
                  dto.mediaId,

                sede_id: {
                  in: idsEliminar,
                },
              },
            });

            for (
              const sedeId of idsEliminar
            ) {
              sedesAfectadas.add(
                sedeId,
              );
            }
          }

          /*
           * 8. Crear nuevas asignaciones
           *    con su configuración.
           */
          if (
            idsAgregar.length > 0
          ) {
            await tx.asignacionMedia.createMany({
              data: idsAgregar.map(
                (sedeId) => {
                  const config =
                    sedesMap.get(
                      sedeId,
                    )!;

                  return {
                    media_id:
                      dto.mediaId,

                    sede_id:
                      sedeId,

                    prioridad:
                      config.prioridad ??
                      1,

                    started_at:
                      config.started_at
                        ? new Date(
                            config.started_at,
                          )
                        : null,

                    ended_at:
                      config.ended_at
                        ? new Date(
                            config.ended_at,
                          )
                        : null,
                  };
                },
              ),

              skipDuplicates: true,
            });

            for (
              const sedeId of idsAgregar
            ) {
              sedesAfectadas.add(
                sedeId,
              );
            }
          }

          /*
           * 9. Actualizar asignaciones
           *    que ya existían.
           */
          const idsActualizados: number[] =
            [];

          for (
            const sedeId of idsExistentes
          ) {
            const anterior =
              asignacionesMap.get(
                sedeId,
              )!;

            const nuevaConfig =
              sedesMap.get(
                sedeId,
              )!;

            const nuevaPrioridad =
              nuevaConfig.prioridad ??
              anterior.prioridad;

            const nuevoStartedAt =
              nuevaConfig.started_at
                ? new Date(
                    nuevaConfig.started_at,
                  )
                : null;

            const nuevoEndedAt =
              nuevaConfig.ended_at
                ? new Date(
                    nuevaConfig.ended_at,
                  )
                : null;

            const prioridadCambio =
              nuevaPrioridad !==
              anterior.prioridad;

            const startedCambio =
              (anterior.started_at
                ?.getTime() ??
                null) !==
              (nuevoStartedAt
                ?.getTime() ??
                null);

            const endedCambio =
              (anterior.ended_at
                ?.getTime() ??
                null) !==
              (nuevoEndedAt
                ?.getTime() ??
                null);

            if (
              prioridadCambio ||
              startedCambio ||
              endedCambio
            ) {
              await tx.asignacionMedia.updateMany({
                where: {
                  media_id:
                    dto.mediaId,

                  sede_id:
                    sedeId,
                },

                data: {
                  prioridad:
                    nuevaPrioridad,

                  started_at:
                    nuevoStartedAt,

                  ended_at:
                    nuevoEndedAt,
                },
              });

              idsActualizados.push(
                sedeId,
              );

              sedesAfectadas.add(
                sedeId,
              );
            }
          }

          return {
            sedeIds,
            idsAgregar,
            idsEliminar,
            idsActualizados,
            durationActualizada,
          };
        },
      );

    /*
     * 10. Emitir sockets solamente
     *     después del commit.
     */
    for (
      const sedeId of sedesAfectadas
    ) {
      this.sedeGateway.emitSyncSede(
        sedeId,
      );
    }

    return {
      message:
        "Asignaciones de la media actualizadas exitosamente.",

      statusCode: 200,

      data: {
        media: {
          id: media.id,
          nombre: media.nombre,
          durationMs:
            dto.duration ??
            media.durationMs,
        },

        sedes:
          resultado.sedeIds,

        agregadas:
          resultado.idsAgregar,

        actualizadas:
          resultado.idsActualizados,

        eliminadas:
          resultado.idsEliminar,

        durationActualizada:
          resultado.durationActualizada,
      },
    };
  }
}
