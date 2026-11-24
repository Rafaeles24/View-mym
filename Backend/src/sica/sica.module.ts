
import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { SicaService } from './sica.service';
import { SicaController } from './sica.controller';
import { SicaAuditService } from './services/sica-audit.service';
import { SicaScraperService } from './services/sica-scraper.service';
import { SicaTransformService } from './services/sica-transform.service';
import { VentaImportService } from './venta/import.service';
import { SicaAuthService } from './services/sica-auth.service';

@Module({
  imports: [AuthModule],
  controllers: [SicaController],
  providers: [
    SicaService,
    SicaAuthService,
    SicaScraperService,
    SicaTransformService,
    SicaAuditService,
    VentaImportService,
  ],
  exports: [SicaService],
})
export class SicaModule {}
