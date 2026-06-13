import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { FilesService } from 'src/files/files.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomUUID } from "crypto";
import { RealtimeGateway } from 'src/realtime/realtime.gateway';
import { MediaPagination } from './pagination/mediaPagination.dto';
import { DeleteMediaDto } from './dto/delete-media.dto';
import path from 'path';
import { OptimizeService } from 'src/optimize/optimize.service';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileService: FilesService,
    private readonly rt: RealtimeGateway,
    private readonly optimizeService: OptimizeService
  ) {}
  
  private normalizeUrl(url: string) {
    return url.replace(/\\/g, "/");
  }

  private duration(duration: number) {
    const total = Math.floor(duration/ 1000);

    const minutes = Math.floor(total / 60);
    const seconds = total % 60;

    return { total, minutes, seconds }
  }

  async getMedias({
    page = 1,
    limit = 50,
    mimetype,
    campaignId,
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

        ...(campaignId || startDate || endDate 
          ? {
            asignaciones: {
              some: {
                ...(campaignId && {
                  campaign_id: campaignId
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
                campaign: true
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
          const durationParsed = media.durationMs ? this.duration(media.durationMs) : null;

          return {
            id: media.id,
            url: this.normalizeUrl(`${process.env.BASE_URL}/${media.url}`),
            mimetype: media.mimeType,
            duration: durationParsed ?
              durationParsed.minutes ?
              `${durationParsed.minutes}m ${durationParsed.seconds}s` :
              `${durationParsed.seconds}` :
              0,
            createdat: media.createdAt,

            campanias:
              media.asignaciones?.map(a => ({
                id: a.campaign.id,
                nombre: a.campaign.nombre,
                url: this.normalizeUrl(`${process.env.BASE_URL}/${a.campaign.logo_url}`),
                hex: a.campaign.hex,
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

  async delete(dto: DeleteMediaDto[]) {
      try {
          await this.prisma.$transaction(async (tx) => {
            for (const i of dto) {
              const media = await tx.media.findUnique({
                where: { id: i.id }
              });

              if (!media) throw new NotFoundException(`No se encontro la media con id: ${i.id}`);

              const folderPath = path.dirname(media.url);
              await this.fileService.deleteFolder(folderPath);

              await tx.media.delete({
                where: { id: media.id }
              });
            }
          })

          return {
            message: `Medias eliminados exitosamente.`,
            state: 200
          }
      } catch (error) {
          throw new InternalServerErrorException(
              `Error eliminando el media: ${error}`
          );
      }
  }
}
