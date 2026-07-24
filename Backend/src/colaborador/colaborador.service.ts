import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomUUID } from 'crypto';
import { FilesService } from 'src/files/files.service';

@Injectable()
export class ColaboradorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileService: FilesService
  ) {}

  private normalizeUrl(url: string) {
    return url.replace(/\\/g, "/");
  }

        /*async updateAvatar(
    id: number,
    file: {
      buffer: Buffer,
      originalName: string,
      mimeType: string,
      size: number
    }
  ) {
    let pathDir: { path: string } = { path: '' };

    try {
      if (!file) throw new BadRequestException(`Es necesario una imagen que sirva como avatar`);

      const colaborador = await this.prisma.colaborador.findUnique({
        where: { id }
      });

      if (!colaborador) throw new NotFoundException(`No se encuentra el colaborador para actualizar.`)

      const colaboradorKey = randomUUID();

      if (!colaborador.avatar_url) {
        const pathDirResult = await this.fileService.createDir(
          `colaborador/${colaboradorKey}`
        );
      } else {
        const oldPath = colaborador.avatar_url || "";
      }



 pathDir = pathDirResult;

      const filePayload = [
        {
          buffer: file.buffer,
          filename: file.originalName,
          pathDir: pathDirResult.path,
          mimetype: file.mimeType
        }
      ];

      const pathFile = await this.fileService.createFiles(filePayload);

      const campaign = await this.prisma.$transaction( async (tx) => {
        const created = await tx.colaborador.update({
          where: { id: colaborador.id },
          data: {

          }
        })
      }) 
    } catch (error) {
      
    }
  }*/
}
