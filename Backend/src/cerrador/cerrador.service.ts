import { BadRequestException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCerradorDto } from './dto/create.dto';
import { FilesService } from 'src/files/files.service';
import { randomUUID } from 'crypto';

@Injectable()
export class CerradorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileService: FilesService
  ) {}

  async getCerrador(id: number) {
    return await this.prisma.cerrador.findUnique({
      where: { id }
    });
  }

  async create(dto: CreateCerradorDto) {

    const cerradorKey = randomUUID();

    try {
      const cerrador = await this.prisma.cerrador.create({
        data: {
          nombre: this.generarNombreCorto(dto.nombre),
          nombre_normalizado: dto.nombre,
          storage_key: cerradorKey
        }
      });

      return cerrador;
    } catch (error) {
      throw new InternalServerErrorException(`Ocurrio un error al crear un cerrador: ${error}`)
    }
  }

  private generarNombreCorto(nc: string): string {
    const partes = nc
      .trim()
      .replace(/\s+/g, " ")
      .split(" ");

    if (partes.length >= 3) {
      const primerNombre = partes[0];
      const primerApellido = partes[2];

      return `${primerNombre} ${primerApellido}`;
    }

    if (partes.length === 2) {
      return `${partes[0]} ${partes[1]}`;
    }

    return partes[0] ?? "";
  }

  private normalizeUrl(url: string) {
    return url.replace(/\\/g, "/");
  }


  async updateAvatar(
    id: number,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
  ) {
    let newFilePath: string | null = null;

    try {
      if (!file) {
        throw new BadRequestException(
          "El cerrador debe tener una imagen para actualizar su avatar.",
        );
      }

      if (!file.mimetype.startsWith("image/")) {
        throw new BadRequestException(
          "El archivo debe ser una imagen válida.",
        );
      }

      const cerrador = await this.prisma.cerrador.findUnique({
        where: { id },
      });

      if (!cerrador) {
        throw new NotFoundException(
          "No se encuentra el cerrador para actualizar.",
        );
      }

      const oldPath = cerrador.avatar_url;

      const storageKey = cerrador.storage_key || randomUUID();

      // Crear directorio cuando el cerrador aún no tiene uno.
      const pathDir = await this.fileService.createDir(
        `cerrador/${storageKey}`,
      );

      const uploadedFiles = await this.fileService.createFiles([
        {
          buffer: file.buffer,
          filename: file.originalname,
          pathDir: pathDir.path,
          mimetype: file.mimetype,
        },
      ]);

      newFilePath = uploadedFiles[0].path;

      // Actualizar avatar en la base de datos.
      const updated = await this.prisma.cerrador.update({
        where: { id },
        data: {
          avatar_url: newFilePath,
          storage_key: storageKey,
        },
      });

      // Eliminar el avatar anterior solo cuando la BD ya se actualizó.
      if (oldPath && oldPath !== newFilePath) {
        try {
          await this.fileService.deleteFiles([
            { path: oldPath },
          ]);
        } catch (error) {
          console.error(
            "No se pudo eliminar el avatar anterior:",
            error,
          );
        }
      }

      const avatarUrl = this.normalizeUrl(
        `${process.env.BASE_URL}/${updated.avatar_url}`,
      );

      return {
        message: "Avatar del cerrador actualizado satisfactoriamente.",
        status: 200,
        data: {
          id: updated.id,
          avatar_url: avatarUrl,
        },
      };
    } catch (error) {
      // Eliminar el archivo nuevo si falló la actualización.
      if (newFilePath) {
        try {
          await this.fileService.deleteFiles([
            { path: newFilePath },
          ]);
        } catch (cleanupError) {
          console.error(
            "Error al limpiar el archivo:",
            cleanupError,
          );
        }
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Ocurrió un error inesperado al actualizar el avatar del cerrador: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

}
