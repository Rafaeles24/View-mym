import { Injectable, NotFoundException } from '@nestjs/common';
import { TipoEmpleado } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { VersusConfigService } from 'src/versus-config/versus-config.service';
import { normalizeUrl } from '../helpers/normalizeUrl';

type ResultadoSede = {
  id: number;
  nombre: string;
  jefe_operaciones: {
    id: number;
    nombre: string;
    avatar_url: string | null;
    activo: boolean;
  } | null;
  ventas: number;
  primera_venta: Date | null;
};

@Injectable()
export class VisorSedeVersusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configVersus: VersusConfigService,
  ) {}

  async obtenerVersusSedes() {
    const { config } = await this.configVersus.obtenerRangoVigente();

    if (!config) {
      throw new NotFoundException(
        'No existe configuración vigente para el versus.',
      );
    }

    const sedes = (
      await this.prisma.sede.findMany({
        select: {
          id: true,
          nombre: true,
          jefe_operaciones: {
            select: {
              id: true,
              nombre: true,
              avatar_url: true,
              activo: true,
            },
          },
        },
        orderBy: {
          nombre: 'asc',
        },
      })
    ).filter(
      (sede) => sede.nombre.trim().toLocaleUpperCase('es-PE') !== 'BACKOFFICE',
    );

    if (!sedes.length) {
      return {
        participantes: [],
        resultado: {
          estado: 'SIN_PARTICIPANTES' as const,
          lideres_sede_ids: [],
          ventas_lider: 0,
          diferencia_primero_segundo: 0,
        },
      };
    }

    const ventas = await this.prisma.venta.groupBy({
      by: ['sede_id'],
      where: {
        tipo_empleado: TipoEmpleado.AGENTE,
        sede_id: {
          in: sedes.map((sede) => sede.id),
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

    const ventasPorSede = new Map<
      number,
      {
        ventas: number;
        primera_venta: Date | null;
      }
    >();

    for (const venta of ventas) {
      if (venta.sede_id === null) {
        continue;
      }

      ventasPorSede.set(venta.sede_id, {
        ventas: venta._count.id,
        primera_venta: venta._min.fecha_lima,
      });
    }

    const resultados: ResultadoSede[] = sedes.map((sede) => {
      const resultado = ventasPorSede.get(sede.id);

      return {
        id: sede.id,
        nombre: sede.nombre,
        jefe_operaciones: sede.jefe_operaciones
          ? {
              ...sede.jefe_operaciones,
              avatar_url: sede.jefe_operaciones.avatar_url
                ? normalizeUrl(
                    `${process.env.BASE_URL}/${sede.jefe_operaciones.avatar_url}`,
                  )
                : null,
            }
          : null,
        ventas: resultado?.ventas ?? 0,
        primera_venta: resultado?.primera_venta ?? null,
      };
    });

    resultados.sort((a, b) => {
      if (a.ventas !== b.ventas) {
        return b.ventas - a.ventas;
      }

      if (a.primera_venta && b.primera_venta) {
        return a.primera_venta.getTime() - b.primera_venta.getTime();
      }

      if (a.primera_venta) {
        return -1;
      }

      if (b.primera_venta) {
        return 1;
      }

      return a.nombre.localeCompare(b.nombre, 'es');
    });

    const primero = resultados[0];
    const segundo = resultados[1];
    const lideres = resultados.filter(
      (sede) =>
        sede.ventas === primero.ventas &&
        (sede.primera_venta?.getTime() ?? null) ===
          (primero.primera_venta?.getTime() ?? null),
    );
    const lideresIds = new Set(lideres.map((sede) => sede.id));

    return {
      participantes: resultados.map((sede, index) => ({
        ...sede,
        posicion: index + 1,
        lider: lideresIds.has(sede.id),
        diferencia_lider: primero.ventas - sede.ventas,
      })),
      resultado: {
        estado: lideres.length > 1 ? ('EMPATE' as const) : ('LIDER' as const),
        lideres_sede_ids: [...lideresIds],
        ventas_lider: primero.ventas,
        diferencia_primero_segundo: segundo
          ? primero.ventas - segundo.ventas
          : primero.ventas,
      },
    };
  }
}
