import { Injectable } from '@nestjs/common';

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

    return {
      idExterno:
        this.limpiar(fila.idExterno),

      cerrador:
        this.limpiar(fila.cerrador),

      agente: esOjt
        ? asesor
        : agenteOriginal,

      varianteAgente: esOjt
        ? 'OJT'
        : 'ALTA',

      campaign:
        this.limpiar(fila.campaign),

      sede:
        this.limpiar(fila.sede),

      fechaTramitacion: fila.fechaTramitacion,

      fechaEdicion: fila.fechaEdicion
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