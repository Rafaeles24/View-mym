import {
  Injectable,
} from '@nestjs/common';

import * as ExcelJS from 'exceljs';

import {
  mkdir,
  writeFile,
} from 'fs/promises';

import {
  join,
} from 'path';

import {
  VentaSica,
} from '../interfaces/venta-sica.interface';

@Injectable()
export class SicaAuditService {

  constructor() {}

  async guardarExcel(
    ventas: VentaSica[],
  ): Promise<string | null> {

    const habilitado = process.env.SICA_AUDIT_EXCEL;

    if (
      habilitado?.toLowerCase() !==
      'true'
    ) {
      return null;
    }

    const workbook =
      new ExcelJS.Workbook();

    const sheet =
      workbook.addWorksheet(
        'DATA',
      );

    sheet.columns = [
      {
        header:
          'CERRADOR',

        key:
          'cerrador',

        width:
          35,
      },
      {
        header:
          'AGENTE',

        key:
          'agente',

        width:
          35,
      },
      {
        header:
          'VARIANTE AGENTE',

        key:
          'varianteAgente',

        width:
          22,
      },
      {
        header:
          'CAMPAIGN',

        key:
          'campaign',

        width:
          20,
      },
      {
        header:
          'SEDE',

        key:
          'sede',

        width:
          20,
      },
      {
        header: 'FECHA TRAMITACION',
        key: 'fechaTramitacionExcel',
        width: 24,
      }
    ];

    for (const venta of ventas) {

      sheet.addRow({
        cerrador:
          venta.cerrador,

        agente:
          venta.agente,

        varianteAgente:
          venta.varianteAgente,

        campaign:
          venta.campaign,

        sede:
          venta.sede,
        
        fechaTramitacionExcel: 
          venta.fechaEdicion,
      });
    }

    sheet.getRow(1).font = {
      bold: true,
    };

    sheet.views = [
      {
        state: 'frozen',
        ySplit: 1,
      },
    ];

    sheet.autoFilter = {
      from: 'A1',
      to: 'E1',
    };

    const buffer =
      await workbook.xlsx.writeBuffer();

      const rutaBase = process.env.SICA_AUDIT_PATH || './uploads/sica/audits/';

    const fecha =
      this.obtenerFechaArchivo();

    const carpeta =
      join(
        rutaBase,
        fecha.anio,
        fecha.mes,
      );

    await mkdir(
      carpeta,
      {
        recursive: true,
      },
    );

    const nombre =
      `SICA_${fecha.fecha}.xlsx`;

    const ruta =
      join(
        carpeta,
        nombre,
      );

    await writeFile(
      ruta,
      Buffer.from(buffer),
    );

    return ruta;
  }

  private obtenerFechaArchivo() {

    const formatter =
      new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone:
            'America/Lima',

          year:
            'numeric',

          month:
            '2-digit',

          day:
            '2-digit',

          hour:
            '2-digit',

          minute:
            '2-digit',

          second:
            '2-digit',

          hourCycle:
            'h23',
        },
      );

    const parts =
      Object.fromEntries(
        formatter
          .formatToParts(
            new Date(),
          )
          .map((p) => [
            p.type,
            p.value,
          ]),
      );

    return {
      anio:
        parts.year,

      mes:
        parts.month,

      fecha:
        `${parts.year}-${parts.month}-${parts.day}`,

      hora:
        `${parts.hour}${parts.minute}${parts.second}`,
    };
  }
}