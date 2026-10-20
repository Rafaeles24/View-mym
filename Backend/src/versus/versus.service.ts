import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateVersusDto } from './dto/create-versus.dto';
import { UpdateVersusDto } from './dto/update-versus.dto';
import { TipoEmpleado } from '@prisma/client';

@Injectable()
export class VersusService {
  constructor(
    private readonly prisma: PrismaService
  ) {}

  private async validarCerradores(
    cerrador1Id: number,
    cerrador2Id: number,
  ) {
    if (cerrador1Id === cerrador2Id) {
      throw new BadRequestException( 'Un supervisor no puede enfrentarse consigo mismo' );
    }

    const cerradores =
      await this.prisma.cerrador.findMany({
        where: {
          id: {
            in: [cerrador1Id, cerrador2Id],
          },
          activo: true,
        },
        select: {
          id: true,
          nombre: true,
        },
      });

    if (cerradores.length !== 2) {
      throw new BadRequestException( 'Ambos cerradores deben existir y estar activos' );
    }
  }

  async crear(dto: CreateVersusDto) {
    await this.validarCerradores(
      dto.cerrador_1_id,
      dto.cerrador_2_id,
    );

    return this.prisma.versus.create({
      data: {
        nombre: dto.nombre.trim(),
        activo: dto.activo ?? true,
        cerrador_1_id: dto.cerrador_1_id,
        cerrador_2_id: dto.cerrador_2_id,
      },
      include: {
        cerrador_1: true,
        cerrador_2: true,
      },
    });
  }

  async listar() {
    return this.prisma.versus.findMany({
      include: {
        cerrador_1: true,
        cerrador_2: true,
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async obtenerPorId(id: number) {
    const versus =
      await this.prisma.versus.findUnique({
        where: { id },
        include: {
          cerrador_1: true,
          cerrador_2: true,
        },
      });

    if (!versus) {
      throw new NotFoundException( 'El enfrentamiento no existe' );
    }

    return versus;
  }

  async actualizar(
    id: number,
    dto: UpdateVersusDto,
  ) {
    const actual =
      await this.obtenerPorId(id);

    const cerrador1Id =
      dto.cerrador_1_id ??
      actual.cerrador_1_id;

    const cerrador2Id =
      dto.cerrador_2_id ??
      actual.cerrador_2_id;

    await this.validarCerradores(
      cerrador1Id,
      cerrador2Id,
    );

    if (
      dto.nombre !== undefined &&
      !dto.nombre.trim()
    ) {
      throw new BadRequestException(
        'El nombre no puede estar vacío',
      );
    }

    return this.prisma.versus.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined && {
          nombre: dto.nombre.trim(),
        }),
        ...(dto.activo !== undefined && {
          activo: dto.activo,
        }),
        cerrador_1_id: cerrador1Id,
        cerrador_2_id: cerrador2Id,
      },
      include: {
        cerrador_1: true,
        cerrador_2: true,
      },
    });
  }

  async eliminar(id: number) {
    await this.obtenerPorId(id);

    await this.prisma.versus.delete({
      where: { id },
    });

    return {
      message: 'Enfrentamiento eliminado',
    };
  }

  async obtenerResultado(id: number) {
    
    const versus = await this.obtenerPorId(id);

    if (!versus.activo) {
      throw new NotFoundException(
        'El enfrentamiento no está activo',
      );
    }

    const config = await this.prisma.configRanking.findUnique({
        where: { id: 1 },
      });

    if (!config) {
      throw new NotFoundException( 'No existe configuración del ranking' );
    }

    const ids = [
      versus.cerrador_1_id,
      versus.cerrador_2_id,
    ];

    const ventas =
      await this.prisma.venta.groupBy({
        by: ['cerrador_id'],

        where: {
          tipo_empleado: TipoEmpleado.CERRADOR,

          cerrador_id: {
            in: ids,
          },

          fecha_lima: {
            gte: config.fecha_inicio,
            lte: config.fecha_fin,
          },
        },

        _count: {
          id: true,
        },

        _min: {
          fecha_lima: true,
        },
      });

    const obtenerDatos = (cerradorId: number) => {
      const registro = ventas.find(
        (v) => v.cerrador_id === cerradorId,
      );

      return {
        ventas: registro?._count.id ?? 0,
        primeraVenta:
          registro?._min.fecha_lima ?? null,
      };
    };

    const datos1 =
      obtenerDatos(versus.cerrador_1_id);

    const datos2 =
      obtenerDatos(versus.cerrador_2_id);

    let ganadorId: number | null = null;

    if (datos1.ventas > datos2.ventas) {
      ganadorId = versus.cerrador_1_id;
    } else if (
      datos2.ventas > datos1.ventas
    ) {
      ganadorId = versus.cerrador_2_id;
    } else if (
      datos1.primeraVenta &&
      datos2.primeraVenta
    ) {
      const fecha1 =
        datos1.primeraVenta.getTime();

      const fecha2 =
        datos2.primeraVenta.getTime();

      if (fecha1 < fecha2) {
        ganadorId = versus.cerrador_1_id;
      } else if (fecha2 < fecha1) {
        ganadorId = versus.cerrador_2_id;
      }
    }

    const diferencia = Math.abs(
      datos1.ventas - datos2.ventas,
    );

    return {
      id: versus.id,
      nombre: versus.nombre,

      rango: {
        fecha_inicio: config.fecha_inicio,
        fecha_fin: config.fecha_fin,
        zona_horaria: config.zona_horaria,
      },

      participantes: [
        {
          id: versus.cerrador_1.id,
          nombre: versus.cerrador_1.nombre,
          posicion: 1,
          ventas: datos1.ventas,
          primera_venta: datos1.primeraVenta,
          ganador:
            ganadorId === versus.cerrador_1_id,
        },
        {
          id: versus.cerrador_2.id,
          nombre: versus.cerrador_2.nombre,
          posicion: 2,
          ventas: datos2.ventas,
          primera_venta: datos2.primeraVenta,
          ganador:
            ganadorId === versus.cerrador_2_id,
        },
      ],

      resultado: {
        estado:
          ganadorId === null
            ? 'EMPATE'
            : 'GANADOR',

        ganador_id: ganadorId,
        diferencia,
      },
    };
  }

  async listarResultados() {
    const enfrentamientos =
      await this.prisma.versus.findMany({
        where: {
          activo: true,
        },
        select: {
          id: true,
        },
        orderBy: {
          id: 'asc',
        },
      });

    return Promise.all(
      enfrentamientos.map((v) =>
        this.obtenerResultado(v.id),
      ),
    );
  }
}
