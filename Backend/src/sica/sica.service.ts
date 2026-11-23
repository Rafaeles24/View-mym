import { Injectable } from '@nestjs/common';
import { VentaImportService } from './venta/import.service';
import { SicaAuditService } from './services/sica-audit.service';
import { SicaScraperService } from './services/sica-scraper.service';
import { SicaAuthService } from './services/sica-auth.service';
import { SicaTransformService } from './services/sica-transform.service';
import { VentaSica } from './interfaces/venta-sica.interface';
import { SICA_CAMPAIGNS } from './constants/campaign.constant';
import { RankingGateway } from 'src/realtime/gateways/ranking.gateway';

@Injectable()
export class SicaService {
  constructor(
    private readonly authService: SicaAuthService,
    private readonly scraperService: SicaScraperService,
    private readonly transformService: SicaTransformService,
    private readonly auditService: SicaAuditService,
    private readonly ventaImportService: VentaImportService,
    private readonly rankingGateway: RankingGateway,
  ) {}

  async sincronizar(notificar = true) {
    await this.authService.asegurarSesion();

    const ventas: VentaSica[] = [];

    for (const campaign of SICA_CAMPAIGNS) {
      const filas = await this.scraperService.obtenerVentas(
        campaign.id,
        campaign.name,
      );

      for (const fila of filas) {
        const venta = this.transformService.transformar(fila);

        ventas.push(venta);
      }
    }

    if (ventas.length === 0) {
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
  }
}
