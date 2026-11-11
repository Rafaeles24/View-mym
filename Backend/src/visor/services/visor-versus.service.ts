import { Injectable, NotFoundException } from '@nestjs/common';
import { TipoEmpleado } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { VersusConfigService } from 'src/versus-config/versus-config.service';
import { normalizeUrl } from '../helpers/normalizeUrl';

@Injectable()
export class VisorVersusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configVersus: VersusConfigService,
  ) {}

  getRangoFechas() {
    return this.configVersus.obtener();
  }

  async obtenerVersusActivosGlobales() {
    const { config } = await this.configVersus.obtenerRangoVigente();

    if (!config) {
      throw new NotFoundException('No existe configuración del versus');
    }

    const versus = await this.prisma.versus.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        participantes: {
          orderBy: [{ equipo: 'asc' }, { orden: 'asc' }],
          select: {
            equipo: true,
            orden: true,
            cerrador_id: true,
            cerrador: {
              select: {
                id: true,
                nombre: true,
                avatar_url: true,
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
        },
      },
      orderBy: { id: 'asc' },
    });

    if (!versus.length) {
      return [];
    }

    const cerradorIds = [
      ...new Set(
        versus.flatMap((item) =>
          item.participantes.map((participante) => participante.cerrador_id),
        ),
      ),
    ];

    const filtroComun = {
      tipo_empleado: TipoEmpleado.CERRADOR,
      cerrador_id: { in: cerradorIds },
      fecha_tramitacion: {
        gte: config.fecha_inicio,
        lt: config.fecha_fin,
      },
    };

    const [ventas, ventasPorCampana, ventasPorSede] = await Promise.all([
      this.prisma.venta.groupBy({
        by: ['cerrador_id'],
        where: filtroComun,
        _count: { id: true },
        _min: { fecha_tramitacion: true },
      }),
      this.prisma.venta.groupBy({
        by: ['cerrador_id', 'campaign_id'],
        where: {
          ...filtroComun,
          campaign_id: { not: null },
        },
        _count: { id: true },
      }),
      this.prisma.venta.groupBy({
        by: ['cerrador_id', 'sede_id'],
        where: {
          ...filtroComun,
          sede_id: { not: null },
        },
        _count: { id: true },
      }),
    ]);

    const campaignIds = [
      ...new Set(
        ventasPorCampana
          .map((item) => item.campaign_id)
          .filter((id): id is number => id !== null),
      ),
    ];
    const sedeIds = [
      ...new Set(
        ventasPorSede
          .map((item) => item.sede_id)
          .filter((id): id is number => id !== null),
      ),
    ];

    const [campaigns, sedes] = await Promise.all([
      this.prisma.campaign.findMany({
        where: { id: { in: campaignIds } },
        select: { id: true, nombre: true, hex: true, logo_url: true },
      }),
      this.prisma.sede.findMany({
        where: { id: { in: sedeIds } },
        select: { id: true, nombre: true },
      }),
    ]);

    const mapaCampaigns = new Map(campaigns.map((item) => [item.id, item]));
    const mapaSedes = new Map(sedes.map((item) => [item.id, item]));
    const mapaVentas = new Map<
      number,
      { ventas: number; primeraVenta: Date | null }
    >();

    for (const item of ventas) {
      if (item.cerrador_id !== null) {
        mapaVentas.set(item.cerrador_id, {
          ventas: item._count.id,
          primeraVenta: item._min.fecha_tramitacion,
        });
      }
    }

    const mapaCampanas = new Map<
      number,
      {
        id: number;
        nombre: string;
        hex: string | null;
        logo_url: string | null;
        ventas: number;
      }[]
    >();

    for (const item of ventasPorCampana) {
      if (item.cerrador_id === null || item.campaign_id === null) continue;
      const campaign = mapaCampaigns.get(item.campaign_id);
      if (!campaign) continue;

      const actuales = mapaCampanas.get(item.cerrador_id) ?? [];
      actuales.push({
        id: campaign.id,
        nombre: campaign.nombre,
        hex: campaign.hex,
        logo_url: campaign.logo_url
          ? normalizeUrl(`${process.env.BASE_URL}/${campaign.logo_url}`)
          : null,
        ventas: item._count.id,
      });
      mapaCampanas.set(item.cerrador_id, actuales);
    }

    const mapaSedesPorCerrador = new Map<
      number,
      { id: number; nombre: string; ventas: number }[]
    >();

    for (const item of ventasPorSede) {
      if (item.cerrador_id === null || item.sede_id === null) continue;
      const sede = mapaSedes.get(item.sede_id);
      if (!sede) continue;

      const actuales = mapaSedesPorCerrador.get(item.cerrador_id) ?? [];
      actuales.push({ ...sede, ventas: item._count.id });
      mapaSedesPorCerrador.set(item.cerrador_id, actuales);
    }

    for (const items of mapaCampanas.values()) {
      items.sort((a, b) => b.ventas - a.ventas);
    }
    for (const items of mapaSedesPorCerrador.values()) {
      items.sort((a, b) => b.ventas - a.ventas);
    }

    return versus.map((item) => {
      const numerosEquipo = [
        ...new Set(
          item.participantes.map((participante) => participante.equipo),
        ),
      ].sort((a, b) => a - b);
      const equipos = numerosEquipo.map((numero) => {
        const miembros = item.participantes
          .filter((participante) => participante.equipo === numero)
          .map((participante) => {
            const datos = mapaVentas.get(participante.cerrador_id) ?? {
              ventas: 0,
              primeraVenta: null,
            };

            return {
              id: participante.cerrador.id,
              nombre: participante.cerrador.nombre,
              avatar_url: participante.cerrador.avatar_url
                ? normalizeUrl(
                    `${process.env.BASE_URL}/${participante.cerrador.avatar_url}`,
                  )
                : null,
              grupo: participante.cerrador.grupo,
              equipo: participante.equipo,
              orden: participante.orden,
              ventas: datos.ventas,
              primera_venta: datos.primeraVenta,
              campaigns: mapaCampanas.get(participante.cerrador_id) ?? [],
              sedes: mapaSedesPorCerrador.get(participante.cerrador_id) ?? [],
            };
          });

        const fechas = miembros
          .map((miembro) => miembro.primera_venta)
          .filter((fecha): fecha is Date => fecha !== null)
          .sort((a, b) => a.getTime() - b.getTime());

        return {
          numero,
          ventas: miembros.reduce(
            (total, miembro) => total + miembro.ventas,
            0,
          ),
          primera_venta: fechas[0] ?? null,
          participantes: miembros,
        };
      });

      let equipoLider: number | null = null;
      const ventasMaximas = Math.max(...equipos.map((equipo) => equipo.ventas));
      let candidatos = equipos.filter(
        (equipo) => equipo.ventas === ventasMaximas,
      );

      if (candidatos.length === 1) {
        equipoLider = candidatos[0].numero;
      } else if (candidatos.every((equipo) => equipo.primera_venta !== null)) {
        const primeraFecha = Math.min(
          ...candidatos.map((equipo) => equipo.primera_venta.getTime()),
        );
        candidatos = candidatos.filter(
          (equipo) => equipo.primera_venta.getTime() === primeraFecha,
        );
        equipoLider = candidatos.length === 1 ? candidatos[0].numero : null;
      }

      const ventasOrdenadas = equipos
        .map((equipo) => equipo.ventas)
        .sort((a, b) => b - a);

      return {
        id: item.id,
        nombre: item.nombre,
        equipos: equipos.map((equipo) => ({
          ...equipo,
          lider: equipo.numero === equipoLider,
        })),
        resultado: {
          estado:
            equipoLider === null ? ('EMPATE' as const) : ('LIDER' as const),
          equipo_lider: equipoLider,
          diferencia: ventasOrdenadas[0] - ventasOrdenadas[1],
        },
      };
    });
  }
}
