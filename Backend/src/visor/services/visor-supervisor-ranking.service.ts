
import { Injectable } from '@nestjs/common';
import { TipoEmpleado } from '@prisma/client';
import { DateTime } from 'luxon';

import { ConfigRankingService } from 'src/config-ranking/config-ranking.service';
import { PrismaService } from 'src/prisma/prisma.service';

import {
  fechaBDComoLima,
  fechaLimaParaBD,
} from '../helpers/visor-fecha.helper';

import { normalizeUrl } from '../helpers/normalizeUrl';

type ConteoNombre = {
  id: number;
  nombre: string;
  cantidad: number;
  logo_url?: string | null;
};

type GrupoSupervisor = {
  id: number;
  nombre: string;

  // Género registrado en Cerrador
  genero: string | null;

  avatar_url: string | null;
  ventas: number;
  primeraVenta: number;
  primerId: number;

  sedes: Map<number, ConteoNombre>;
  campaigns: Map<number, ConteoNombre>;
  ventasPorDia: Map<string, number>;
};

@Injectable()
export class VisorSupervisorRankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configRanking: ConfigRankingService,
  ) {}

  private readonly limite = 10;

  private incrementarConteo(
    mapa: Map<number, ConteoNombre>,
    valor: {
      id: number;
      nombre: string;
      logo_url?: string | null;
    } | null,
  ): void {
    if (!valor) return;

    const existente = mapa.get(valor.id);

    if (existente) {
      existente.cantidad++;
      return;
    }

    mapa.set(valor.id, {
      ...valor,
      cantidad: 1,
    });
  }

  private ordenarConteos(
    valores: Map<number, ConteoNombre>,
  ): ConteoNombre[] {
    return [...valores.values()].sort(
      (a, b) =>
        b.cantidad - a.cantidad ||
        a.id - b.id,
    );
  }

  private resolverUrlArchivo(
    ruta: string | null | undefined,
  ): string | null {
    if (!ruta) return null;

    if (/^https?:\/\//i.test(ruta)) {
      return normalizeUrl(ruta);
    }

    const baseUrl =
      process.env.BASE_URL?.replace(/\/+$/, '');

    const rutaNormalizada =
      ruta.replace(/^\/+/, '');

    return baseUrl
      ? normalizeUrl(
          `${baseUrl}/${rutaNormalizada}`,
        )
      : normalizeUrl(rutaNormalizada);
  }

  private crearDiasLaborables(
    inicio: DateTime,
    fin: DateTime,
    ventasPorDia: Map<string, number>,
  ) {
    const dias: {
      fecha: string;
      dia: string;
      etiqueta: string;
      semana: string;
      ventas: number;
    }[] = [];

    let cursor = inicio.startOf('day');

    while (cursor.toMillis() < fin.toMillis()) {
      if (cursor.weekday <= 5) {
        const fecha = cursor.toISODate();

        if (fecha) {
          dias.push({
            fecha,
            dia: cursor
              .setLocale('es')
              .toFormat('ccc')
              .replace('.', ''),
            etiqueta: cursor
              .setLocale('es')
              .toFormat('dd LLL'),
            semana:
              cursor.startOf('week').toISODate() ??
              fecha,
            ventas:
              ventasPorDia.get(fecha) ?? 0,
          });
        }
      }

      cursor = cursor.plus({ days: 1 });
    }

    return dias;
  }

  async obtenerLeaderboard() {
    const { inicio, fin, config } =
      await this.configRanking.obtenerRangoVigente();

    const ventas = await this.prisma.venta.findMany({
      where: {
        tipo_empleado: TipoEmpleado.CERRADOR,

        cerrador_id: {
          not: null,
        },

        fecha: {
          gte: fechaLimaParaBD(inicio),
          lt: fechaLimaParaBD(fin),
        },

        fecha_lima: {
          not: null,
        },

        cerrador: {
          is: {
            activo: true,
          },
        },
      },

      select: {
        id: true,
        cerrador_id: true,
        fecha_lima: true,

        cerrador: {
          select: {
            id: true,
            nombre: true,

            // Ya se consultaba, ahora se devuelve
            genero: true,

            avatar_url: true,
          },
        },

        sede: {
          select: {
            id: true,
            nombre: true,
          },
        },

        campaign: {
          select: {
            id: true,
            nombre: true,
            logo_url: true,
          },
        },
      },
    });

    const grupos =
      new Map<number, GrupoSupervisor>();

    for (const venta of ventas) {
      if (
        venta.cerrador_id === null ||
        venta.cerrador === null ||
        venta.fecha_lima === null
      ) {
        continue;
      }

      const fechaLima =
        fechaBDComoLima(venta.fecha_lima);

      const fechaDia = fechaLima.toISODate();

      if (!fechaDia) continue;

      const existente =
        grupos.get(venta.cerrador_id);

      if (!existente) {
        const grupo: GrupoSupervisor = {
          id: venta.cerrador.id,
          nombre: venta.cerrador.nombre,

          // NUEVO: conservar género
          genero: venta.cerrador.genero ?? null,

          avatar_url:
            venta.cerrador.avatar_url,

          ventas: 1,

          primeraVenta:
            venta.fecha_lima.getTime(),

          primerId: venta.id,

          sedes: new Map(),
          campaigns: new Map(),

          ventasPorDia: new Map([
            [fechaDia, 1],
          ]),
        };

        this.incrementarConteo(
          grupo.sedes,
          venta.sede,
        );

        this.incrementarConteo(
          grupo.campaigns,
          venta.campaign,
        );

        grupos.set(
          venta.cerrador_id,
          grupo,
        );

        continue;
      }

      existente.ventas++;

      existente.ventasPorDia.set(
        fechaDia,
        (existente.ventasPorDia.get(
          fechaDia,
        ) ?? 0) + 1,
      );

      this.incrementarConteo(
        existente.sedes,
        venta.sede,
      );

      this.incrementarConteo(
        existente.campaigns,
        venta.campaign,
      );

      const fechaVenta =
        venta.fecha_lima.getTime();

      if (
        fechaVenta < existente.primeraVenta ||
        (
          fechaVenta === existente.primeraVenta &&
          venta.id < existente.primerId
        )
      ) {
        existente.primeraVenta = fechaVenta;
        existente.primerId = venta.id;
      }
    }

    const gruposOrdenados = [
      ...grupos.values(),
    ]
      .sort(
        (a, b) =>
          b.ventas - a.ventas ||
          a.primeraVenta - b.primeraVenta ||
          a.primerId - b.primerId,
      )
      .slice(0, this.limite);

    const totalVentasGlobales = [
      ...grupos.values(),
    ].reduce(
      (total, grupo) =>
        total + grupo.ventas,
      0,
    );

    const participantes =
      gruposOrdenados.map((grupo, index) => {
        const campaigns = this.ordenarConteos(
          grupo.campaigns,
        ).map((campaign) => ({
          ...campaign,

          logo_url:
            this.resolverUrlArchivo(
              campaign.logo_url,
            ),
        }));

        return {
          puesto: index + 1,

          id: grupo.id,
          nombre: grupo.nombre,

          // NUEVO: género en cada participante
          genero: grupo.genero,

          avatar_url:
            this.resolverUrlArchivo(
              grupo.avatar_url,
            ),

          ventas: grupo.ventas,

          sedes:
            this.ordenarConteos(
              grupo.sedes,
            ),

          campaigns,
        };
      });

    const grupoDestacado =
      gruposOrdenados[0];

    const participanteDestacado =
      participantes[0];

    if (
      !grupoDestacado ||
      !participanteDestacado
    ) {
      return {
        participantes: [],
        destacado: null,

        rango: {
          fecha_inicio:
            config.fecha_inicio,

          fecha_fin:
            config.fecha_fin,

          zona_horaria:
            config.zona_horaria,
        },
      };
    }

    const historial =
      this.crearDiasLaborables(
        inicio,
        fin,
        grupoDestacado.ventasPorDia,
      );

    const mejorDia =
      [...historial].sort(
        (a, b) =>
          b.ventas - a.ventas ||
          a.fecha.localeCompare(
            b.fecha,
          ),
      )[0] ?? null;

    return {
      participantes,

      destacado: {
        ...participanteDestacado,

        // genero ya está incluido mediante
        // ...participanteDestacado

        mejor_dia:
          mejorDia && mejorDia.ventas > 0
            ? mejorDia
            : null,

        promedio_ventas:
          historial.length > 0
            ? Number(
                (
                  grupoDestacado.ventas /
                  historial.length
                ).toFixed(1),
              )
            : 0,

        porcentaje_ventas_globales:
          totalVentasGlobales > 0
            ? Number(
                (
                  (
                    grupoDestacado.ventas /
                    totalVentasGlobales
                  ) * 100
                ).toFixed(1),
              )
            : 0,
      },

      rango: {
        fecha_inicio:
          config.fecha_inicio,

        fecha_fin:
          config.fecha_fin,

        zona_horaria:
          config.zona_horaria,
      },
    };
  }
}
