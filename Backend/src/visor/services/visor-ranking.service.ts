import { Injectable } from "@nestjs/common";
import { Prisma, TipoEmpleado } from "@prisma/client";
import { DateTime } from "luxon";
import { PrismaService } from "src/prisma/prisma.service";
import { fechaLimaParaBD } from "../helpers/visor-fecha.helper";
import { GrupoRanking } from "../types/ranking.type";
import { normalizeUrl } from "../helpers/normalizeUrl";
import { validarSedeId } from "../helpers/validarSede";
import { ConfigRankingService } from "src/config-ranking/config-ranking.service";
import { FilaRanking } from "../interface/ranking.interface";

@Injectable()
export class VisorRankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configRankingService: ConfigRankingService,
  ) {}

  private readonly limiteRanking = 10;

  private normalizarNombre(
    nombre: string,
  ): string {
    return nombre
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300\u0301\u0302\u0308]/g, '')
      .normalize('NFC')
      .replace(/\s+/g, ' ');
  }

  private obtenerPeriodoGlobal() {
    return this.configRankingService.obtenerRangoVigente();
  }

  private async obtenerRanking(
    tipoEmpleado: TipoEmpleado,
    inicio: DateTime,
    fin: DateTime,
    sedeId?: number,
    limite?: number,
  ): Promise<FilaRanking[]> {
    const where: Prisma.VentaWhereInput = {
      tipo_empleado: tipoEmpleado,
      fecha: {
        gte: fechaLimaParaBD(inicio),
        lt: fechaLimaParaBD(fin),
      },
    };

    if (sedeId !== undefined) {
      where.sede_id = sedeId;
    }

    const ventas = await this.prisma.venta.findMany({
      where,
      select: {
        id: true,
        nombre_empleado: true,
        variante_empleado: true,
        sede_id: true,
        campaign_id: true,
        fecha_lima: true,
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
            hex: true,
            logo_url: true,
          },
        },
      },
    });

    const grupos = new Map<string, GrupoRanking>();

    for (const venta of ventas) {
      const nombre = this.normalizarNombre(
        venta.nombre_empleado,
      );

      if (!nombre || nombre === 'DESCONOCIDO') continue;
      if (!venta.fecha_lima) continue;

      const clave = JSON.stringify([
        nombre,
        venta.variante_empleado,
        venta.sede_id,
        venta.campaign_id,
      ]);

      const fecha = venta.fecha_lima.getTime();

      const grupo = grupos.get(clave);

      if (!grupo) {
        grupos.set(clave, {
          nombre,
          variante: venta.variante_empleado,
          cantidad: 1,
          sede: venta.sede,
          campaign: venta.campaign,
          primeraVenta: fecha,
          primerId: venta.id,
        });

        continue;
      }

      grupo.cantidad++;

      if (
        fecha < grupo.primeraVenta ||
        (
          fecha === grupo.primeraVenta &&
          venta.id < grupo.primerId
        )
      ) {
        grupo.primeraVenta = fecha;
        grupo.primerId = venta.id;
      }
    }

    // Ordenar después de procesar todas las ventas
    const ordenados = [...grupos.values()].sort(
      (a, b) =>
        b.cantidad - a.cantidad ||
        a.primeraVenta - b.primeraVenta ||
        a.primerId - b.primerId,
    );

    // Aplicar límite
    const seleccionados =
      limite === undefined
        ? ordenados
        : ordenados.slice(0, limite);

    // Construir ranking
    return seleccionados.map((grupo, index) => ({
      puesto: index + 1,
      nombre: grupo.nombre,
      variante: grupo.variante,
      cantidad: grupo.cantidad,
      sede: grupo.sede,
      campaign: grupo.campaign
        ? {
            ...grupo.campaign,
            logo_url: grupo.campaign.logo_url
              ? normalizeUrl(
                  `${process.env.BASE_URL}/${grupo.campaign.logo_url}`,
                )
              : null,
          }
        : null,
    }));
  }

  //RANKING AGENTES POR SEDE

  async leaderboardAgentesPorSede( sedeId: number ) {
    validarSedeId(sedeId);

    const {inicio, fin} = await this.obtenerPeriodoGlobal();

    return this.obtenerRanking(
      TipoEmpleado.AGENTE,
      inicio,
      fin,
      sedeId,
      this.limiteRanking
    )
  }

  async leaderboardAgentes(): Promise<FilaRanking[]> {
    const {inicio, fin} = await this.obtenerPeriodoGlobal();

    return this.obtenerRanking(
      TipoEmpleado.AGENTE,
      inicio,
      fin,
      undefined,
      this.limiteRanking
    );
  }

  async leaderboardCerradores(): Promise<FilaRanking[]> {
    const {inicio, fin} = await this.obtenerPeriodoGlobal();

    return this.obtenerRanking(
      TipoEmpleado.CERRADOR,
      inicio,
      fin,
      undefined,
      this.limiteRanking,
    );
  }

  async getRangoFechas() {
    return this.configRankingService.obtener();
  }
}