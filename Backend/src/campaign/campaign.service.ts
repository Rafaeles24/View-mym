import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto, UpdateFullCampaignDto } from './dto/update-campaign.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RealtimeGateway } from 'src/realtime/realtime.gateway';
import { FilesService } from 'src/files/files.service';
import { TimeService } from 'src/time/time.service';
import { randomUUID } from 'crypto';
import { AddSedeDto } from './dto/add-sede.dto';
import { AddMediaDto } from './dto/add-media.dto';

@Injectable()
export class CampaignService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileService: FilesService,
    private readonly timeService: TimeService,
    private readonly rt: RealtimeGateway
  ) {}

  private normalizeUrl(url: string) {
    return url.replace(/\\/g, "/");
  }
  
  async create(
    dto: CreateCampaignDto,
    file: {
      buffer: Buffer,
      originalname: string,
      mimetype: string,
      size: number
    }
  ) {

    let pathDir: { path: string } | null = null;

    try {
      
      if (!file) throw new BadRequestException(
        `La campana debe tener una imagen que sirva como logo.`
      );

      const campaignKey = randomUUID();
      
      const pathDirResult = await this.fileService.createDir(
        `campaign/${campaignKey}`
      );

      pathDir = pathDirResult;

      const filePayload = [
        {
          buffer: file.buffer,
          filename: file.originalname,
          pathDir: pathDirResult.path,
          mimetype: file.mimetype
        }
      ];

      const pathFile = await this.fileService.createFiles(filePayload);

      const campaign = await this.prisma.$transaction( async (tx) => {
        const created = await tx.campaign.create({
          data: {
            nombre: dto.nombre,
            hex: dto.hex ?? "#000",
            storage_key: campaignKey,
            logo_url: pathFile[0].path,
            asset_id: 1, //ASSET POR DEFECTO
            ...(dto.sedes && dto.sedes.length > 0 && {
              sedes: {
                create: dto.sedes.map(sede => ({
                  sede: {
                    connect: { id: sede.id }
                  }
                }))
              }
            })
          }
        });

        return created;
      });

      const payload = {
        ...campaign,
        logoUrl: this.normalizeUrl(`${process.env.BASE_URL}/${campaign.logo_url}`)
      }

      this.rt.emitGlobalCampaignEvent('created', payload);

      return {
        message: `Campaña creado satisfactoriamente.`,
        status: 201
      }

    } catch (error) {

      //ROLLBACK
      if (pathDir) await this.fileService.deleteFolder(pathDir.path);

      throw new InternalServerErrorException(
        `Ocurrio un error inesperado al intentar crear una campaña: ${error}`
      )
    }
  }

  async update(
    id: number,
    dto: UpdateCampaignDto,
    file?: {
      buffer: Buffer,
      originalname: string,
      mimetype: string,
      size: number
    }
  ) {
      let pathDir: { path: string } = { path: '' };
    try {
      
      const campaign = await this.prisma.campaign.findUnique({
        where: { id }
      });
      if (!campaign) throw new NotFoundException(
        `No se encuentra la campana para actualizar`
      );

      const oldPath = campaign.logo_url || "";

      pathDir.path = campaign.storage_key;

      const updated = await this.prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          ...(dto.nombre && { nombre: dto.nombre }),
          ...(dto.hex && { hex: dto.hex }),
          ...(dto.sedes && dto.sedes.length > 0 && {
            sedes: {
              deleteMany: {},
              create: dto.sedes.map((sede) => ({
                sede: {
                  connect: { id: sede.id }
                }
              }))
            }
          })
        }
      });

      let fileFullPath = this.normalizeUrl(`${process.env.BASE_URL}/${updated.logo_url}`);

      if (file) {
        const newFile = await this.fileService.createFiles([{
          buffer: file.buffer,
          filename: file.originalname,
          pathDir: `uploads/campaign/${campaign.storage_key}`,
          mimetype: file.mimetype
        }]);

        const newFileData = await this.prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            logo_url: newFile[0].path
          },
          select: {
            logo_url: true
          }
        });

        await this.fileService.deleteFiles([
          { path: oldPath }
        ]);

        fileFullPath = this.normalizeUrl(`${process.env.BASE_URL}/${newFileData.logo_url}`);
      }

      this.rt.emitGlobalCampaignEvent('updated', {
        ...updated,
        logo_url: fileFullPath
      })

      return {
        message: `Campaña actualizado satifactoriamente.`,
        status: 200
      }
      
    } catch (error) {
      throw new InternalServerErrorException(
        `Ocurrio un error inesperado al actualizar una campaña: ${error}`
      );
    }
  }

  async syncCampaign(campaignId: number) {
    const fullCampaign = await this.prisma.campaign.findUnique({
      where: { 
        id: campaignId
      },
      include: {
        sedes: {
          include: {
            sede: true
          }
        },
        asignaciones: {
          include: {
            media: true
          },
          orderBy: {
            prioridad: 'asc'
          }
        }
      }
    });

    if (!fullCampaign) throw new NotFoundException(`No se encontro la campana`);

    const sede = fullCampaign.sedes?.[0]?.sede;

    return {
      id: fullCampaign.id,
      nombre: fullCampaign.nombre,
      hex: fullCampaign.hex,
      logoUrl: this.normalizeUrl(`${process.env.BASE_URL}/${fullCampaign.logo_url}`),

      sede: sede && {
        id: sede.id,
        nombre: sede.nombre,
      },

      medias: fullCampaign.asignaciones.map(a => ({
        id: a.media.id,
        url: this.normalizeUrl(`${process.env.BASE_URL}/${a.media.url}`),
        duration: a.media.durationMs ?? 10000,
        mimetype: a.media.mimeType
      }))
    }
  }

  async addSedesToCampaign(dto: AddSedeDto) {
    try {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: Number(dto.campaign_id)}
      });
      if (!campaign) throw new NotFoundException(`No se encontró la campaña`);

      return this.prisma.$transaction(async (tx) => {

        const ids = dto.sedes.map(s => s.id);

        const sedes = await tx.sede.findMany({
          where: {
            id: { in: ids }
          }
        });

        if (sedes.length !== dto.sedes.length) {
          throw new NotFoundException(`No todas las sedes existen.`);
        }

        await tx.campaignSede.createMany({
          data: dto.sedes.map((sede) => ({
            campaign_id: Number(dto.campaign_id),
            sede_id: sede.id
          })),
          skipDuplicates: true
        });

        return {
          message: `Sedes agregados exitosamente.`,
          status: 201,
        }
      });

    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Ocurrio un error inesperado mientras se intentaba agregar sedes a una campaña ${error}`
      );
    }
  }

  async addMediasToCampaign(dto: AddMediaDto) {
    try {
      
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: Number(dto.campaignId)}
      });

      if (!campaign) throw new NotFoundException(`No se encontró la campaña`);

      const fullCampaign = await this.prisma.$transaction(async (tx) => {
        const ids = dto.asignaciones.map(s => s.id);

        const medias = await tx.media.findMany({
          where: {
            id: { in: ids }
          }
        });

        if (medias.length !== dto.asignaciones.length) {
          throw new NotFoundException(`No todas las medias existen.`);
        }

        return await tx.asignacionMedia.createMany({
          data: dto.asignaciones.map((media) => ({
            campaign_id: Number(dto.campaignId),
            media_id: media.id
          })),
          skipDuplicates: true
        });
        
      });

      if (fullCampaign) {
        const payload = await this.syncCampaign(Number(dto.campaignId));
        this.rt.emitSyncCampaign(payload.id, payload);
      }

      return {
        message: `Medias agregados exitosamente.`,
        status: 201,
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Ocurrio un error inesperado mientras se intentaba agregar medias a una campaña ${error}`
      );
    }
  }

  async deleteMediasToCampaign(dto: AddMediaDto) {
    try {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: Number(dto.campaignId) }
      })

      if (!campaign) throw new NotFoundException("Esta campania no existe.");

      const ids = dto.asignaciones.map(s => s.id);

      const medias = await this.prisma.media.findMany({
        where: {
          id: { in: ids }
        }
      });

      if (medias.length !== dto.asignaciones.length) {
        throw new NotFoundException(`No todas las medias existen.`);
      }

      const fullDelete = await this.prisma.$transaction(async (tx) => {
        for (const media of dto.asignaciones) {
          const campaignInMedia = await tx.asignacionMedia.findUnique({
            where: {
              campaign_id_media_id: {
                campaign_id: Number(dto.campaignId),
                media_id: media.id
              }
            }
          });

          if (campaignInMedia) {
            await tx.asignacionMedia.delete({
              where: { 
                campaign_id_media_id: {
                  campaign_id: Number(dto.campaignId),
                  media_id: media.id
                }
              }
            })
          }
        }

        return "OK";
      });
  
      if (fullDelete) {
        const payload = await this.syncCampaign(Number(dto.campaignId));
        this.rt.emitSyncCampaign(payload.id, payload);
      }

      return {
        message: `Vinculos eliminados exitosamente.`,
        status: 200
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Ocurrio un error inesperado mientras se intentaba agregar medias a una campaña ${error}`
      );
    }
  }
  
  async remove(id: number) {
    try {

      const campaign = await this.prisma.campaign.findUnique({
        where: { id },
        select: {
          id: true,
          storage_key: true,
        }
      });

      if (!campaign) throw new NotFoundException(`No se encontro esta campana`);

      const deleted = await this.prisma.campaign.delete({
        where: { id: campaign.id }
      });

      if (deleted.storage_key) {
        await this.fileService.deleteFolder(`uploads/campaign/${deleted.storage_key}`);
      }

      this.rt.emitGlobalCampaignEvent('deleted', deleted.id);

      return {
        message: `Campana eliminado satisfactoriamente.`,
        status: 200
      }

    } catch (error) {

      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        `Ocurrio un error inesperado al intentar eliminar la campana: ${error}`
      );
    }
  }

  async findAll() {
    const campaigns = await this.prisma.campaign.findMany();

    return campaigns.map((campaign) => ({
      ...campaign,
      logo_url: this.normalizeUrl(`${process.env.BASE_URL}/${campaign.logo_url}`)
    }))
  }

  
}
