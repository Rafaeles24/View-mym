import { Injectable } from '@nestjs/common';
import { VentaImportService } from './venta/import.service';
import { SicaAuditService } from './services/sica-audit.service';
import { SicaScraperService } from './services/sica-scraper.service';
import { SicaAuthService } from './services/sica-auth.service';
import { SicaTransformService } from './services/sica-transform.service';
import { VentaSica } from './interfaces/venta-sica.interface';
import { SICA_CAMPAIGNS } from './constants/campaign.constant';
import { RealtimeGateway } from 'src/realtime/realtime.gateway';

@Injectable()
export class SicaService {
  constructor(
    private readonly authService: SicaAuthService,
    private readonly scraperService: SicaScraperService,
    private readonly transformService: SicaTransformService,
    private readonly auditService: SicaAuditService,
    private readonly ventaImportService: VentaImportService,
    private readonly rt: RealtimeGateway
  ) {}

  async sincronizar() {
    await this.authService.asegurarSesion();

    const ventas: VentaSica[] = [];

    for (const campaign of SICA_CAMPAIGNS) {
      const filas = await this.scraperService.obtenerVentas(campaign.id, campaign.name);

      for (const fila of filas) {
        const venta = this.transformService.transformar(fila);

        ventas.push(venta);
      }
    }

    await this.auditService.guardarExcel(ventas);

    const resultado = await this.ventaImportService.importar(ventas);

    this.rt.emitSyncRankingEvent('refresh');

    return resultado;
  }
}
