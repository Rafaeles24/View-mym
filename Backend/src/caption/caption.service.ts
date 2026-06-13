import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateCaptionDto } from './dto/create-caption.dto';
import { UpdateCaptionDto } from './dto/update-caption.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as XLSX from 'xlsx';

@Injectable()
export class CaptionService {
  
  constructor(
    private readonly prisma: PrismaService
  ) {}

  async getCaptions() {
    return await this.prisma.caption.findMany();
  }

  async create(dto: CreateCaptionDto[]) {
    try {
      for (const caption of dto) {

        if (!caption.title || !caption.text) {
          throw new BadRequestException('Cada caption debe tener un título y un texto');
        }

        if (caption.hex && !/^#([0-9A-F]{3}){1,2}$/i.test(caption.hex)) {
          throw new BadRequestException(`El valor hex "${caption.hex}" no es válido para el caption con título "${caption.title}"`);
        }
      }

      const captions = await this.prisma.caption.createMany({
        data: dto.map(caption => ({
          title: caption.title,
          text: caption.text,
          hex: caption.hex || "#000000"
        }))
      });

      return {
        message: `${captions.count} captions creadas exitosamente`,
        count: captions.count,
        statusCode: 201
      };
    } catch (error) {
      throw new InternalServerErrorException(`Error al crear captions: ${error}`);
    }
  }

  async remove(id: number) {
    try {
      const caption = await this.prisma.caption.findUnique({
        where: { id }
      });
      if (!caption) throw new NotFoundException(`Caption no encontrado con id ${id}`);

      await this.prisma.caption.delete({
        where: { id }
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(`Error al eliminar caption con id ${id}`);
    }
  }
}
