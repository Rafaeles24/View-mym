
import { Injectable } from "@nestjs/common";
import { Prisma, TipoEmpleado } from "@prisma/client";
import { DateTime } from "luxon";

import { PrismaService } from "src/prisma/prisma.service";
import { ConfigRankingService } from "src/config-ranking/config-ranking.service";

import { fechaLimaParaBD } from "../helpers/visor-fecha.helper";
import { normalizeUrl } from "../helpers/normalizeUrl";
import { validarSedeId } from "../helpers/validarSede";

import {
  GrupoRanking,
  CampaignRanking,
} from "../types/ranking.type";

import { FilaRanking } from "../interface/ranking.interface";

@Injectable()
export class VisorRankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configRankingService: ConfigRankingService,
  ) {}

  private readonly limiteRanking = 10;

  /* =========================================
     NORMALIZAR NOMBRES
  ========================================= */

  private normalizarNombre(nombre: string): string {
    return nombre
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300\u0301\u0302\u0308]/g, "")
      .normalize("NFC")
      .replace(/\s+/g, " ");
  }

  /* =========================================
     OBTENER PERIODO GLOBAL
  ========================================= */

  private obtenerPeriodoGlobal() {
    return this.configRankingService.obtenerRangoVigente();
  }

  /* =========================================
     NORMALIZAR LOGOS
  ========================================= */

  private formatearCampaign(
    campaign: CampaignRanking,
  ) {
    return {
      ...campaign,
      logo_url: campaign.logo_url
        ? normalizeUrl(
            `${process.env.BASE_URL}/${campaign.logo_url}`,
          )
        : null,
    };
  }

  /* =========================================
     OBTENER CLAVE DE AGRUPACION

     CERRADORES:
       cerrador_id + sede_id

     AGENTES:
       nombre normalizado + sede_id

     NO separar por:
       campaign_id
       variante_empleado
  ========================================= */

  private obtenerClaveRanking(
    tipoEmpleado: TipoEmpleado,
    nombre: string,
    cerradorId: number | null,
    sedeId: number | null,
  ): string {

    if (tipoEmpleado === TipoEmpleado.CERRADOR) {
      const identificador =
        cerradorId !== null
          ? `ID:${cerradorId}`
          : `NOMBRE:${nombre}`;

      return JSON.stringify([
        TipoEmpleado.CERRADOR,
        identificador,
        sedeId,
      ]);
    }

    return JSON.stringify([
      TipoEmpleado.AGENTE,
      nombre,
      sedeId,
    ]);
  }

  /* =========================================
     AGREGAR CAMPAÑA AL GRUPO

     Una campaña aparece una sola vez,
     pero acumula todas sus ventas.
  ========================================= */

  private agregarCampaign(
    grupo: GrupoRanking,
    campaign: CampaignRanking | null,
  ): void {

    if (!campaign) return;

    const existente = grupo.campaigns.get(
      campaign.id,
    );

    if (existente) {
      existente.cantidad++;
      return;
    }

    grupo.campaigns.set(campaign.id, {
      campaign,
      cantidad: 1,
    });
  }

  /* =========================================
     RANKING GENERAL

     APLICABLE A:
       AGENTES
       CERRADORES

     TODAS LAS CAMPAÑAS
     TOTAL DE VENTAS CONSOLIDADO
     DESEMPATE POR PRIMERA VENTA
  ========================================= */

  private async obtenerRanking(
    tipoEmpleado: TipoEmpleado,
    inicio: DateTime,
    fin: DateTime,
    sedeId?: number,
    limite?: number,
  ): Promise<FilaRanking[]> {

    /* -----------------------------------------
       CONSTRUIR FILTRO
    ----------------------------------------- */

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

    /* -----------------------------------------
       CONSULTAR VENTAS
    ----------------------------------------- */

    const ventas = await this.prisma.venta.findMany({
      where,

      select: {
        id: true,
        cerrador_id: true,
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

    /* -----------------------------------------
       AGRUPAR PARTICIPANTES
    ----------------------------------------- */

    const grupos = new Map<string, GrupoRanking>();

    for (const venta of ventas) {

      const nombre = this.normalizarNombre(
        venta.nombre_empleado,
      );

      if (!nombre || nombre === "DESCONOCIDO") {
        continue;
      }

      if (!venta.fecha_lima) {
        continue;
      }

      /* ---------------------------------------
         CLAVE UNIFICADA POR PARTICIPANTE
      --------------------------------------- */

      const clave = this.obtenerClaveRanking(
        tipoEmpleado,
        nombre,
        venta.cerrador_id,
        venta.sede_id,
      );

      const fecha = venta.fecha_lima.getTime();

      const grupo = grupos.get(clave);

      /* ---------------------------------------
         PRIMER REGISTRO DEL PARTICIPANTE
      --------------------------------------- */

      if (!grupo) {

        const nuevoGrupo: GrupoRanking = {
          nombre,

          variante: venta.variante_empleado,

          cantidad: 1,

          sede: venta.sede,

          campaigns: new Map(),

          primeraVenta: fecha,

          primerId: venta.id,
        };

        this.agregarCampaign(
          nuevoGrupo,
          venta.campaign,
        );

        grupos.set(
          clave,
          nuevoGrupo,
        );

        continue;
      }

      /* ---------------------------------------
         ACUMULAR TODAS LAS VENTAS
      --------------------------------------- */

      grupo.cantidad++;

      /* ---------------------------------------
         AGREGAR / ACUMULAR CAMPAÑA
      --------------------------------------- */

      this.agregarCampaign(
        grupo,
        venta.campaign,
      );

      /* ---------------------------------------
         DETECTAR PRIMERA VENTA

         También actualiza los metadatos
         a los de la primera venta.
      --------------------------------------- */

      if (
        fecha < grupo.primeraVenta ||
        (
          fecha === grupo.primeraVenta &&
          venta.id < grupo.primerId
        )
      ) {

        grupo.primeraVenta = fecha;
        grupo.primerId = venta.id;

        grupo.nombre = nombre;
        grupo.variante = venta.variante_empleado;

      }
    }

    /* =========================================
       ORDENAR RANKING

       1. MAYOR TOTAL DE VENTAS
       2. PRIMERA VENTA MAS ANTIGUA
       3. MENOR ID COMO DESEMPATE
    ========================================= */

    const ordenados = [...grupos.values()].sort(
      (a, b) =>
        b.cantidad - a.cantidad ||
        a.primeraVenta - b.primeraVenta ||
        a.primerId - b.primerId,
    );

    /* =========================================
       APLICAR LIMITE
    ========================================= */

    const seleccionados =
      limite === undefined
        ? ordenados
        : ordenados.slice(0, limite);

    /* =========================================
       CONSTRUIR RESPUESTA
    ========================================= */

    return seleccionados.map(
      (grupo, index): FilaRanking => {
      
        const campaigns = [
          ...grupo.campaigns.values(),
        ]
          .sort(
            (a, b) =>
              b.cantidad - a.cantidad ||
              a.campaign.id - b.campaign.id,
          )
          .map((detalle) => ({
            ...this.formatearCampaign(
              detalle.campaign,
            ),
            cantidad: detalle.cantidad,
          }));
        
        return {
          puesto: index + 1,
          nombre: grupo.nombre,
          variante: grupo.variante,
          cantidad: grupo.cantidad,
          sede: grupo.sede,
          campaigns,
        };
      },
    );
  }

  /* =========================================
     RANKING AGENTES POR SEDE
  ========================================= */

  async leaderboardAgentesPorSede(
    sedeId: number,
  ): Promise<FilaRanking[]> {

    validarSedeId(sedeId);

    const { inicio, fin } =
      await this.obtenerPeriodoGlobal();

    return this.obtenerRanking(
      TipoEmpleado.AGENTE,
      inicio,
      fin,
      sedeId,
      this.limiteRanking,
    );
  }

  /* =========================================
     RANKING GLOBAL DE AGENTES
  ========================================= */

  async leaderboardAgentes(): Promise<FilaRanking[]> {

    const { inicio, fin } =
      await this.obtenerPeriodoGlobal();

    return this.obtenerRanking(
      TipoEmpleado.AGENTE,
      inicio,
      fin,
      undefined,
      this.limiteRanking,
    );
  }

  /* =========================================
     RANKING GLOBAL DE CERRADORES
  ========================================= */

  async leaderboardCerradores(): Promise<FilaRanking[]> {

    const { inicio, fin } =
      await this.obtenerPeriodoGlobal();

    return this.obtenerRanking(
      TipoEmpleado.CERRADOR,
      inicio,
      fin,
      undefined,
      this.limiteRanking,
    );
  }

  /* =========================================
     OBTENER RANGO DE FECHAS
  ========================================= */

  async getRangoFechas() {
    return this.configRankingService.obtener();
  }
}
