// visor-versus.service.ts

import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  TipoEmpleado,
} from '@prisma/client';

import {
  PrismaService,
} from 'src/prisma/prisma.service';
import { normalizeUrl } from '../helpers/normalizeUrl';
import { VersusConfigService } from 'src/versus-config/versus-config.service';

@Injectable()
export class VisorVersusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configVersus: VersusConfigService
  ) {}

  async getRangoFechas() {
    return this.configVersus.obtener();
  }

  async obtenerVersusActivosGlobales() {
    // ==========================================
    // 1. OBTENER CONFIGURACIÓN DEL RANKING
    // ==========================================

    const { config }=
      await this.configVersus.obtenerRangoVigente();

    if (!config) {
      throw new NotFoundException(
        'No existe configuración del ranking',
      );
    }

    // ==========================================
    // 2. OBTENER TODOS LOS VS ACTIVOS
    // ==========================================

    const versus =
      await this.prisma.versus.findMany({
        where: {
          activo: true,
        },

        select: {
          id: true,
          nombre: true,

          cerrador_1_id: true,
          cerrador_2_id: true,

          cerrador_1: {
            select: {
              id: true,
              nombre: true,
              activo: true,

              grupo: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
            },
          },

          cerrador_2: {
            select: {
              id: true,
              nombre: true,
              activo: true,

              grupo: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
            },
          },
        },

        orderBy: {
          id: 'asc',
        },
      });

    if (!versus.length) {
      return [];
    }

    // ==========================================
    // 3. OBTENER IDS ÚNICOS DE CERRADORES
    // ==========================================

    const cerradorIds = [
      ...new Set(
        versus.flatMap((item) => [
          item.cerrador_1_id,
          item.cerrador_2_id,
        ]),
      ),
    ];

    // ==========================================
    // 4. CONSULTAR VENTAS
    // ==========================================
    //
    // Ejecutamos en paralelo:
    //
    // - ventas totales
    // - ventas por campaña
    // - ventas por sede
    //
    // ==========================================

    const [
      ventas,
      ventasPorCampana,
      ventasPorSede,
    ] = await Promise.all([
      // ------------------------------------------
      // TOTAL DE VENTAS POR CERRADOR
      // ------------------------------------------

      this.prisma.venta.groupBy({
        by: [
          'cerrador_id',
        ],

        where: {
          tipo_empleado:
            TipoEmpleado.CERRADOR,

          cerrador_id: {
            in: cerradorIds,
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
      }),

      // ------------------------------------------
      // VENTAS POR CAMPAÑA
      // ------------------------------------------

      this.prisma.venta.groupBy({
        by: [
          'cerrador_id',
          'campaign_id',
        ],

        where: {
          tipo_empleado:
            TipoEmpleado.CERRADOR,

          cerrador_id: {
            in: cerradorIds,
          },

          campaign_id: {
            not: null,
          },

          fecha_lima: {
            gte: config.fecha_inicio,
            lte: config.fecha_fin,
          },
        },

        _count: {
          id: true,
        },
      }),

      // ------------------------------------------
      // VENTAS POR SEDE
      // ------------------------------------------

      this.prisma.venta.groupBy({
        by: [
          'cerrador_id',
          'sede_id',
        ],

        where: {
          tipo_empleado:
            TipoEmpleado.CERRADOR,

          cerrador_id: {
            in: cerradorIds,
          },

          sede_id: {
            not: null,
          },

          fecha_lima: {
            gte: config.fecha_inicio,
            lte: config.fecha_fin,
          },
        },

        _count: {
          id: true,
        },
      }),
    ]);

    // ==========================================
    // 5. OBTENER IDS DE CAMPAÑAS
    // ==========================================

    const campaignIds = [
      ...new Set(
        ventasPorCampana
          .map(
            (item) =>
              item.campaign_id,
          )
          .filter(
            (
              id,
            ): id is number =>
              id !== null,
          ),
      ),
    ];

    // ==========================================
    // 6. OBTENER IDS DE SEDES
    // ==========================================

    const sedeIds = [
      ...new Set(
        ventasPorSede
          .map(
            (item) =>
              item.sede_id,
          )
          .filter(
            (
              id,
            ): id is number =>
              id !== null,
          ),
      ),
    ];

    // ==========================================
    // 7. OBTENER INFORMACIÓN DE CAMPAÑAS Y SEDES
    // ==========================================

    const [
      campaigns,
      sedes,
    ] = await Promise.all([
      campaignIds.length
        ? this.prisma.campaign.findMany({
            where: {
              id: {
                in: campaignIds,
              },
            },

            select: {
              id: true,
              nombre: true,
              hex: true,
              logo_url: true,
            },
          })
        : Promise.resolve([]),

      sedeIds.length
        ? this.prisma.sede.findMany({
            where: {
              id: {
                in: sedeIds,
              },
            },

            select: {
              id: true,
              nombre: true,
            },
          })
        : Promise.resolve([]),
    ]);

    // ==========================================
    // 8. MAPA DE CAMPAÑAS
    // ==========================================

    const mapaCampaigns = new Map<
      number,
      {
        id: number;
        nombre: string;
        hex: string | null;
        logo_url: string | null;
      }
    >(
      campaigns.map(
        (campaign) =>
          [
            campaign.id,
            campaign,
          ] as const,
      ),
    );

    // ==========================================
    // 9. MAPA DE SEDES
    // ==========================================

    const mapaSedes = new Map<
      number,
      {
        id: number;
        nombre: string;
      }
    >(
      sedes.map(
        (sede) =>
          [
            sede.id,
            sede,
          ] as const,
      ),
    );

    // ==========================================
    // 10. MAPA DE VENTAS TOTALES
    // ==========================================

    const mapaVentas = new Map<
      number,
      {
        ventas: number;
        primeraVenta: Date | null;
      }
    >();

    for (const item of ventas) {
      if (
        item.cerrador_id === null
      ) {
        continue;
      }

      mapaVentas.set(
        item.cerrador_id,
        {
          ventas:
            item._count.id,

          primeraVenta:
            item._min
              .fecha_lima,
        },
      );
    }

    // ==========================================
    // 11. MAPA CAMPAÑAS POR CERRADOR
    // ==========================================

    const mapaCampanasPorCerrador =
      new Map<
        number,
        {
          id: number;
          nombre: string;
          hex: string | null;
          logo_url: string | null;
          ventas: number;
        }[]
      >();

    for (
      const item
      of ventasPorCampana
    ) {
      if (
        item.cerrador_id === null ||
        item.campaign_id === null
      ) {
        continue;
      }

      const campaign =
        mapaCampaigns.get(
          item.campaign_id,
        );

      if (!campaign) {
        continue;
      }

      const actuales =
        mapaCampanasPorCerrador.get(
          item.cerrador_id,
        ) ?? [];

      actuales.push({
        id: campaign.id,
        nombre:
          campaign.nombre,
        hex:
          campaign.hex,
        logo_url:
          normalizeUrl(`${process.env.BASE_URL}/${campaign.logo_url}`),
        ventas:
          item._count.id,
      });

      mapaCampanasPorCerrador.set(
        item.cerrador_id,
        actuales,
      );
    }

    // ==========================================
    // 12. MAPA SEDES POR CERRADOR
    // ==========================================

    const mapaSedesPorCerrador =
      new Map<
        number,
        {
          id: number;
          nombre: string;
          ventas: number;
        }[]
      >();

    for (
      const item
      of ventasPorSede
    ) {
      if (
        item.cerrador_id === null ||
        item.sede_id === null
      ) {
        continue;
      }

      const sede =
        mapaSedes.get(
          item.sede_id,
        );

      if (!sede) {
        continue;
      }

      const actuales =
        mapaSedesPorCerrador.get(
          item.cerrador_id,
        ) ?? [];

      actuales.push({
        id: sede.id,
        nombre:
          sede.nombre,
        ventas:
          item._count.id,
      });

      mapaSedesPorCerrador.set(
        item.cerrador_id,
        actuales,
      );
    }

    // ==========================================
    // 13. ORDENAR CAMPAÑAS POR VENTAS
    // ==========================================

    for (
      const campanas
      of mapaCampanasPorCerrador.values()
    ) {
      campanas.sort(
        (a, b) =>
          b.ventas -
          a.ventas,
      );
    }

    // ==========================================
    // 14. ORDENAR SEDES POR VENTAS
    // ==========================================

    for (
      const sedesCerrador
      of mapaSedesPorCerrador.values()
    ) {
      sedesCerrador.sort(
        (a, b) =>
          b.ventas -
          a.ventas,
      );
    }

    // ==========================================
    // 15. ARMAR RESPUESTA FINAL
    // ==========================================

    return versus.map(
      (item) => {
        // --------------------------------------
        // CERRADOR 1
        // --------------------------------------

        const datos1 =
          mapaVentas.get(
            item.cerrador_1_id,
          ) ?? {
            ventas: 0,
            primeraVenta:
              null,
          };

        // --------------------------------------
        // CERRADOR 2
        // --------------------------------------

        const datos2 =
          mapaVentas.get(
            item.cerrador_2_id,
          ) ?? {
            ventas: 0,
            primeraVenta:
              null,
          };

        // --------------------------------------
        // CAMPAÑAS
        // --------------------------------------

        const campanas1 =
          mapaCampanasPorCerrador.get(
            item.cerrador_1_id,
          ) ?? [];

        const campanas2 =
          mapaCampanasPorCerrador.get(
            item.cerrador_2_id,
          ) ?? [];

        // --------------------------------------
        // SEDES
        // --------------------------------------

        const sedes1 =
          mapaSedesPorCerrador.get(
            item.cerrador_1_id,
          ) ?? [];

        const sedes2 =
          mapaSedesPorCerrador.get(
            item.cerrador_2_id,
          ) ?? [];

        // ======================================
        // DETERMINAR LÍDER
        // ======================================

        let liderId:
          | number
          | null = null;

        if (
          datos1.ventas >
          datos2.ventas
        ) {
          liderId =
            item.cerrador_1_id;
        } else if (
          datos2.ventas >
          datos1.ventas
        ) {
          liderId =
            item.cerrador_2_id;
        } else if (
          datos1.primeraVenta &&
          datos2.primeraVenta
        ) {
          const fecha1 =
            datos1
              .primeraVenta
              .getTime();

          const fecha2 =
            datos2
              .primeraVenta
              .getTime();

          if (
            fecha1 <
            fecha2
          ) {
            liderId =
              item.cerrador_1_id;
          } else if (
            fecha2 <
            fecha1
          ) {
            liderId =
              item.cerrador_2_id;
          }
        }

        // ======================================
        // RESPUESTA
        // ======================================

        return {
          id:
            item.id,

          nombre:
            item.nombre,

          cerrador_1: {
            id:
              item
                .cerrador_1
                .id,

            nombre:
              item
                .cerrador_1
                .nombre,

            grupo:
              item
                .cerrador_1
                .grupo,

            ventas:
              datos1.ventas,

            primera_venta:
              datos1
                .primeraVenta,

            lider:
              liderId ===
              item
                .cerrador_1_id,

            campaigns:
              campanas1,

            sedes:
              sedes1,
          },

          cerrador_2: {
            id:
              item
                .cerrador_2
                .id,

            nombre:
              item
                .cerrador_2
                .nombre,

            grupo:
              item
                .cerrador_2
                .grupo,

            ventas:
              datos2.ventas,

            primera_venta:
              datos2
                .primeraVenta,

            lider:
              liderId ===
              item
                .cerrador_2_id,

            campaigns:
              campanas2,

            sedes:
              sedes2,
          },

          resultado: {
            estado:
              liderId ===
              null
                ? 'EMPATE'
                : 'LIDER',

            lider_id:
              liderId,

            diferencia:
              Math.abs(
                datos1
                  .ventas -
                datos2
                  .ventas,
              ),
          },
        };
      },
    );
  }
}