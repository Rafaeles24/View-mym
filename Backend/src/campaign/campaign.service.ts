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

      const campaign = await this.prisma.campaign.create({
        data: {
          nombre: dto.nombre,
          hex: dto.hex ?? '#000',
          storage_key: campaignKey,
          logo_url: pathFile[0].path,
        
          ...(dto.sedes && dto.sedes.length > 0
            ? {
                sedes: {
                  create: dto.sedes.map((sede) => ({
                    sede: {
                      connect: {
                        id: sede.id,
                      },
                    },
                  })),
                },
              }
            : {}),
        },
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
  
}
