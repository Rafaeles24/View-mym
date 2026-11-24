
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DateTime } from 'luxon';

import { VentaImportService } from './venta/import.service';
import { SicaAuditService } from './services/sica-audit.service';
import { SicaScraperService } from './services/sica-scraper.service';
import { SicaAuthService } from './services/sica-auth.service';
import { SicaTransformService } from './services/sica-transform.service';
import { VentaSica } from './interfaces/venta-sica.interface';
import { SICA_CAMPAIGNS } from './constants/campaign.constant';
import { RankingGateway } from 'src/realtime/gateways/ranking.gateway';

export type OrigenReconciliacion = 'API' | 'CRON';

export type EstadoReconciliacion =
  | 'SIN_EJECUCIONES'
  | 'EN_PROCESO'
  | 'COMPLETADO'
  | 'ERROR';

export interface ResumenReconciliacion {
  diasConsultados: number;
  ventasSicaProcesadas: number;
  registrosVentasProcesadas: number;
  ventaCerradorNoRegistrado: number;
  omitidos: number;
}

export interface SeguimientoReconciliacion {
  id: string | null;
  estado: EstadoReconciliacion;
  origen: OrigenReconciliacion | null;
  inicio: string | null;
  fin: string | null;
  iniciadoEn: string | null;
  finalizadoEn: string | null;
  diasTotales: number;
  diasCompletados: number;
  fechaActual: string | null;
  resumen: ResumenReconciliacion | null;
  error: string | null;
}

@Injectable()
export class SicaService {
  private readonly logger = new Logger(SicaService.name);

  private trabajoActivo:
    | 'SINCRONIZACION'
    | 'RECONCILIACION'
    | null = null;

  private seguimiento: SeguimientoReconciliacion = {
    id: null,
    estado: 'SIN_EJECUCIONES',
    origen: null,
    inicio: null,
    fin: null,
    iniciadoEn: null,
    finalizadoEn: null,
    diasTotales: 0,
    diasCompletados: 0,
    fechaActual: null,
    resumen: null,
    error: null,
  };

  constructor(
    private readonly authService: SicaAuthService,
    private readonly scraperService: SicaScraperService,
    private readonly transformService: SicaTransformService,
    private readonly auditService: SicaAuditService,
    private readonly ventaImportService: VentaImportService,
    private readonly rankingGateway: RankingGateway,
  ) {}

  async sincronizar(notificar = true) {
    this.reservar('SINCRONIZACION');

    try {
      await this.authService.asegurarSesion();

      const ventas: VentaSica[] = [];

      for (const campaign of SICA_CAMPAIGNS) {
        const filas = await this.scraperService.obtenerVentas(
          campaign.id,
          campaign.name,
        );

        for (const fila of filas) {
          ventas.push(this.transformService.transformar(fila));
        }
      }

      if (!ventas.length) {
        return {
          estado: 'SIN_VENTAS' as const,
          mensaje: 'SICA no devolvió ventas. No hay ventas por actualizar.',
          ventasSicaProcesadas: 0,
          registrosVentasProcesadas: 0,
          ventaCerradorNoRegistrado: 0,
          omitidos: 0,
        };
      }

      await this.auditService.guardarExcel(ventas);

      const resultado = await this.ventaImportService.importar(ventas);

      if (notificar) {
        this.rankingGateway.emitRankingRefresh();
      }

      return {
        estado: 'ACTUALIZADO' as const,
        mensaje: 'Sincronización de ventas completada.',
        ...resultado,
      };
    } finally {
      this.liberar('SINCRONIZACION');
    }
  }

  iniciarReconciliacion(inicio: string, fin: string) {
    this.validarRango(inicio, fin);

    if (this.trabajoActivo) {
      throw new ConflictException(
        `[SICA] Otro proceso está activo: ${this.trabajoActivo}.`,
      );
    }

    const id = randomUUID();

    const tarea = this.reconciliarPeriodo(
      inicio,
      fin,
      true,
      'API',
      id,
    );

    void tarea.catch((error: unknown) => {
      this.logger.error(
        `[SICA] Reconciliación API ${id} falló`,
        error instanceof Error ? error.stack : String(error),
      );
    });

    return {
      id,
      estado: 'EN_PROCESO' as const,
      inicio,
      fin,
      consultarEstado: '/system/api/sica/reconciliar/estado',
    };
  }

  obtenerEstadoReconciliacion(): SeguimientoReconciliacion {
    return {
      ...this.seguimiento,
      resumen: this.seguimiento.resumen
        ? { ...this.seguimiento.resumen }
        : null,
    };
  }

  async reconciliarPeriodo(
    inicio: string,
    fin: string,
    notificar = true,
    origen: OrigenReconciliacion = 'CRON',
    id = randomUUID(),
  ) {
    const {
      fechaInicio,
      fechaFin,
      diasTotales,
    } = this.validarRango(inicio, fin);

    this.reservar('RECONCILIACION');

    const resumen: ResumenReconciliacion = {
      diasConsultados: 0,
      ventasSicaProcesadas: 0,
      registrosVentasProcesadas: 0,
      ventaCerradorNoRegistrado: 0,
      omitidos: 0,
    };

    this.seguimiento = {
      id,
      estado: 'EN_PROCESO',
      origen,
      inicio,
      fin,
      iniciadoEn: new Date().toISOString(),
      finalizadoEn: null,
      diasTotales,
      diasCompletados: 0,
      fechaActual: null,
      resumen: { ...resumen },
      error: null,
    };

    try {
      await this.authService.asegurarSesion();

      for (
        let dia = fechaInicio;
        dia.toMillis() <= fechaFin.toMillis();
        dia = dia.plus({ days: 1 })
      ) {
        const fecha = dia.toFormat('dd/MM/yyyy');

        this.seguimiento.fechaActual = fecha;

        const ventasDia: VentaSica[] = [];

        for (const campaign of SICA_CAMPAIGNS) {
          const filas = await this.scraperService.obtenerVentas(
            campaign.id,
            campaign.name,
            {
              inicio: fecha,
              fin: fecha,
            },
          );

          for (const fila of filas) {
            ventasDia.push(
              this.transformService.transformar(fila),
            );
          }
        }

        if (ventasDia.length) {
          const resultado = await this.ventaImportService.importar(
            ventasDia,
          );

          resumen.ventasSicaProcesadas +=
            resultado.ventasSicaProcesadas;

          resumen.registrosVentasProcesadas +=
            resultado.registrosVentasProcesadas;

          resumen.ventaCerradorNoRegistrado +=
            resultado.ventaCerradorNoRegistrado;

          resumen.omitidos += resultado.omitidos;
        }

        resumen.diasConsultados++;

        this.seguimiento.diasCompletados =
          resumen.diasConsultados;

        this.seguimiento.resumen = { ...resumen };

        this.logger.log(
          `[SICA] ${fecha}: ${ventasDia.length} ventas extraídas`,
        );
      }

      if (notificar && resumen.registrosVentasProcesadas > 0) {
        this.rankingGateway.emitRankingRefresh();
      }

      this.seguimiento.estado = 'COMPLETADO';
      this.seguimiento.fechaActual = null;
      this.seguimiento.finalizadoEn =
        new Date().toISOString();

      return {
        estado: 'RECONCILIADO' as const,
        id,
        inicio,
        fin,
        ...resumen,
      };
    } catch (error: unknown) {
      this.seguimiento.estado = 'ERROR';
      this.seguimiento.finalizadoEn =
        new Date().toISOString();

      this.seguimiento.resumen = { ...resumen };

      this.seguimiento.error =
        error instanceof Error ? error.message : String(error);

      throw error;
    } finally {
      this.liberar('RECONCILIACION');
    }
  }

  private validarRango(inicio: string, fin: string) {
    const fechaInicio = DateTime.fromFormat(
      inicio,
      'dd/MM/yyyy',
      { zone: 'America/Lima' },
    );

    const fechaFin = DateTime.fromFormat(
      fin,
      'dd/MM/yyyy',
      { zone: 'America/Lima' },
    );

    if (
      !fechaInicio.isValid ||
      !fechaFin.isValid ||
      fechaInicio.toFormat('dd/MM/yyyy') !== inicio ||
      fechaFin.toFormat('dd/MM/yyyy') !== fin ||
      fechaInicio.toMillis() > fechaFin.toMillis()
    ) {
      throw new BadRequestException(
        'Rango inválido. Usa dd/MM/yyyy con inicio menor o igual que fin.',
      );
    }

    const diasTotales =
      Math.round(fechaFin.diff(fechaInicio, 'days').days) + 1;

    if (diasTotales > 31) {
      throw new BadRequestException(
        'Máximo 31 días completos por reconciliación.',
      );
    }

    return { fechaInicio, fechaFin, diasTotales };
  }

  private reservar(
    tipo: 'SINCRONIZACION' | 'RECONCILIACION',
  ) {
    if (this.trabajoActivo) {
      throw new ConflictException(
        `[SICA] Otro proceso está activo: ${this.trabajoActivo}. Reintenta más tarde.`,
      );
    }

    this.trabajoActivo = tipo;
  }

  private liberar(
    tipo: 'SINCRONIZACION' | 'RECONCILIACION',
  ) {
    if (this.trabajoActivo === tipo) {
      this.trabajoActivo = null;
    }
  }
}
