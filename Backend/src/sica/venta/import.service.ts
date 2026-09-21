import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { DateTime } from 'luxon';

import { VentaSica } from '../interfaces/venta-sica.interface';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class VentaImportService {

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async importar(
    ventas: VentaSica[],
  ) {

    let ventasSicaProcesadas = 0;
    let registrosVentasProcesadas = 0;
    let omitidos = 0;

    for (const venta of ventas) {

      try {

        if (!venta.idExterno) {

          console.warn(
            '[SICA] Venta sin ID. Se omite.',
          );

          omitidos++;

          continue;
        }

        if (
          !venta.cerrador ||
          !venta.agente
        ) {

          console.warn(
            `[SICA] Venta ${venta.idExterno} sin cerrador o agente`,
          );

          omitidos++;

          continue;
        }

        const campaign =
          await this.prisma.campaign.findFirst({
            where: {
              nombre: venta.campaign,
            },
          });

        if (!campaign) {

          throw new NotFoundException(
            `[SICA] Campaign no encontrado: ${venta.campaign}`,
          );
        }

        const sede =
          await this.prisma.sede.findFirst({
            where: {
              nombre: venta.sede,
            },
          });

        if (!sede) {

          throw new NotFoundException(
            `[SICA] Sede no encontrado: ${venta.sede}`,
          );
        }

        /*
         * Los ISO contienen su timezone:
         *
         * Madrid:
         * 2026-09-19T15:00:00+02:00
         *
         * Lima:
         * 2026-09-19T08:00:00-05:00
         */

        const fechaMadrid =
          this.convertirFechaLocal(
            venta.fechaEdicionMadrid,
          );
        
        const fechaLima =
          this.convertirFechaLocal(
            venta.fechaEdicionLima,
          );

        await this.prisma.$transaction(
          async (tx) => {

            // ================================================
            // CERRADOR / SUPERVISOR
            // ================================================

            await tx.venta.upsert({

              where: {
                venta_sica_participante: {
                  sica_id:
                    venta.idExterno,

                  campaign_id:
                    campaign.id,

                  tipo_empleado:
                    'CERRADOR',
                },
              },

              create: {
                sica_id:
                  venta.idExterno,

                tipo_empleado:
                  'CERRADOR',

                nombre_empleado:
                  venta.cerrador,

                variante_empleado:
                  'SUP',

                campaign_id:
                  campaign.id,

                sede_id:
                  sede.id,

                fecha:
                  fechaMadrid,

                fecha_lima:
                  fechaLima,
              },

              update: {
                nombre_empleado:
                  venta.cerrador,

                variante_empleado:
                  'SUP',

                sede_id:
                  sede.id,

                fecha:
                  fechaMadrid,

                fecha_lima:
                  fechaLima,
              },
            });

            // ================================================
            // AGENTE
            // ================================================

            await tx.venta.upsert({

              where: {
                venta_sica_participante: {
                  sica_id:
                    venta.idExterno,

                  campaign_id:
                    campaign.id,

                  tipo_empleado:
                    'AGENTE',
                },
              },

              create: {
                sica_id:
                  venta.idExterno,

                tipo_empleado:
                  'AGENTE',

                nombre_empleado:
                  venta.agente,

                variante_empleado:
                  venta.varianteAgente,

                campaign_id:
                  campaign.id,

                sede_id:
                  sede.id,

                fecha:
                  fechaMadrid,

                fecha_lima:
                  fechaLima,
              },

              update: {
                nombre_empleado:
                  venta.agente,

                variante_empleado:
                  venta.varianteAgente,

                sede_id:
                  sede.id,

                fecha:
                  fechaMadrid,

                fecha_lima:
                  fechaLima,
              },
            });
          },
        );

        ventasSicaProcesadas++;
        registrosVentasProcesadas += 2;

      } catch (error) {

        if (
          error instanceof NotFoundException
        ) {
          throw error;
        }

        throw new InternalServerErrorException(
          `[SICA] Error procesando venta ${venta.idExterno}: ${error}`,
        );
      }
    }

    return {
      ventasSicaProcesadas,
      registrosVentasProcesadas,
      omitidos,
    };
  }

  private convertirFechaLocal(
    fecha: string,
  ): Date {

    let resultado =
      DateTime.fromFormat(
        fecha,
        'yyyy-MM-dd HH:mm:ss',
        {
          zone: 'UTC',
        },
      );

    if (!resultado.isValid) {

      resultado =
        DateTime.fromFormat(
          fecha,
          'yyyy-MM-dd HH:mm',
          {
            zone: 'UTC',
          },
        );
    }

    if (!resultado.isValid) {

      throw new Error(
        `Fecha local inválida: ${fecha}`,
      );
    }

    return resultado.toJSDate();
  }
}