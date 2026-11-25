import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCerradorDto } from './dto/create.dto';
import { FilesService } from 'src/files/files.service';
import { randomUUID } from 'crypto';
import { UpdateCerradorDto } from './dto/update.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CerradorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileService: FilesService,
  ) {}

  async getCerradores(activos: boolean) {
    const cerradores = await this.prisma.cerrador.findMany({
      where: {
        activo: activos,
      },
    });

    return cerradores.map((cerrador) => ({
      ...cerrador,
      avatar_url: cerrador.avatar_url
        ? this.normalizeUrl(`${process.env.BASE_URL}/${cerrador.avatar_url}`)
        : null,
    }));
  }

  async getCerrador(id: number) {
    return await this.prisma.cerrador.findUnique({
      where: { id },
    });
  }

  async create(dto: CreateCerradorDto) {
    const nombreCompleto = dto.nombre.trim().replace(/\s+/g, ' ');
    const nombreNormalizado = this.normalizarNombre(nombreCompleto);
    const cerradorKey = randomUUID();

    try {
      const cerrador = await this.prisma.cerrador.create({
        data: {
          nombre: this.generarNombreCorto(nombreCompleto),
          nombre_normalizado: nombreNormalizado,
          storage_key: cerradorKey,
        },
      });

      return cerrador;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya existe un cerrador registrado con ese nombre.',
        );
      }

      throw new InternalServerErrorException(
        `Ocurrio un error al crear un cerrador: ${error}`,
      );
    }
  }

  private normalizarNombre(nombre: string): string {
    return nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
  }

  private generarNombreCorto(nc: string): string {
    const partes = nc.trim().replace(/\s+/g, ' ').split(' ');

    if (partes.length >= 3) {
      const primerNombre = partes[0];
      const primerApellido = partes[2];

      return `${primerNombre} ${primerApellido}`;
    }

    if (partes.length === 2) {
      return `${partes[0]} ${partes[1]}`;
    }

    return partes[0] ?? '';
  }

  private normalizeUrl(url: string) {
    return url.replace(/\\/g, '/');
  }

  async updateCerrador(id: number, dto: UpdateCerradorDto) {
    const cerrador = await this.prisma.cerrador.findUnique({
      where: { id },
    });

    if (!cerrador) {
      throw new NotFoundException(
        'No se encuentra el cerrador para actualizar.',
      );
    }

    if (dto.activo === false) {
      const sedeAsignada = await this.prisma.sede.findFirst({
        where: {
          jefe_operaciones_id: id,
        },
        select: {
          nombre: true,
        },
      });

      if (sedeAsignada) {
        throw new ConflictException(
          `No puedes desactivar al jefe de operaciones de la sede ${sedeAsignada.nombre}.`,
        );
      }
    }

    return await this.prisma.cerrador.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        nombre_normalizado: dto.nombre_normalizado,
        activo: dto.activo,
      },
    });
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
          'El cerrador debe tener una imagen para actualizar su avatar.',
        );
      }

      if (!file.mimetype.startsWith('image/')) {
        throw new BadRequestException('El archivo debe ser una imagen válida.');
      }

      const cerrador = await this.prisma.cerrador.findUnique({
        where: { id },
      });

      if (!cerrador) {
        throw new NotFoundException(
          'No se encuentra el cerrador para actualizar.',
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
          await this.fileService.deleteFiles([{ path: oldPath }]);
        } catch (error) {
          console.error('No se pudo eliminar el avatar anterior:', error);
        }
      }

      const avatarUrl = this.normalizeUrl(
        `${process.env.BASE_URL}/${updated.avatar_url}`,
      );

      return {
        message: 'Avatar del cerrador actualizado satisfactoriamente.',
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
          await this.fileService.deleteFiles([{ path: newFilePath }]);
        } catch (cleanupError) {
          console.error('Error al limpiar el archivo:', cleanupError);
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
