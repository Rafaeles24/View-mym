import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';

import { FilaSica } from '../interfaces/fila-sica.interface';
import { VentaSica } from '../interfaces/venta-sica.interface';

@Injectable()
export class SicaTransformService {

  transformar(
    fila: FilaSica,
  ): VentaSica {

    const agenteOriginal =
      this.limpiar(fila.agenteOriginal);

    const asesor =
      this.limpiar(fila.asesor);

    const esOjt =
      /\bCAPA\b/i.test(agenteOriginal);

    const fechas =
      this.convertirMadridALima(
        fila.fechaEdicion,
      );

    return {
      idExterno:
        this.limpiar(fila.idExterno),

      cerrador:
        this.limpiar(fila.cerrador),

      agente:
        esOjt
          ? asesor
          : agenteOriginal,

      varianteAgente:
        esOjt
          ? 'OJT'
          : 'ALTA',

      campaign:
        this.limpiar(fila.campaign),

      sede:
        this.limpiar(fila.sede),

      fechaTramitacion:
        fila.fechaTramitacion,

      fechaEdicionMadrid:
        fechas.madrid,

      fechaEdicionLima:
        fechas.lima,
    };
  }

  private convertirMadridALima(
    fechaHora: string,
  ): {
    madrid: string;
    lima: string;
  } {

    if (!fechaHora) {
      throw new Error(
        'Fecha de edición vacía',
      );
    }


    let fechaMadrid =
      DateTime.fromFormat(
        fechaHora,
        'yyyy-MM-dd HH:mm:ss',
        {
          zone: 'Europe/Madrid',
        },
      );


    if (!fechaMadrid.isValid) {

      fechaMadrid =
        DateTime.fromFormat(
          fechaHora,
          'yyyy-MM-dd HH:mm',
          {
            zone: 'Europe/Madrid',
          },
        );
    }

    if (!fechaMadrid.isValid) {

      throw new Error(
        `Fecha SICA inválida: ${fechaHora}. ` +
        `Motivo: ${fechaMadrid.invalidExplanation}`,
      );
    }

    const fechaLima =
      fechaMadrid.setZone(
        'America/Lima',
      );

    return {
      madrid:
        fechaMadrid.toFormat(
          'yyyy-MM-dd HH:mm:ss',
        ),

      lima:
        fechaLima.toFormat(
          'yyyy-MM-dd HH:mm:ss',
        ),
    };
  }

  private limpiar(
    valor?: string,
  ): string {

    return (valor ?? '')
      .replace(/\xa0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }
}