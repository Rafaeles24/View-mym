import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import * as cheerio from 'cheerio';

import { SicaAuthService } from './sica-auth.service';
import { FilaSica } from '../interfaces/fila-sica.interface';

@Injectable()
export class SicaScraperService {

  private readonly fechaHeader = 'Fecha de Tramitación';
  
  private readonly fechaEdicionHeader = 'Fecha edición';

  constructor(
    private readonly authService: SicaAuthService,
  ) {}

  // ============================================================
  // MÉTODO PRINCIPAL
  // ============================================================

  async obtenerVentas(
    campaignId: number,
    campaignName: string,
  ): Promise<FilaSica[]> {

    const html =
      await this.descargarCampania(
        campaignId,
        campaignName,
      );

    return this.procesarHtml(
      html,
      campaignName,
    );
  }

  // ============================================================
  // DESCARGAR HTML DE SICA
  // ============================================================

  private async descargarCampania(
    campaignId: number,
    campaignName: string,
  ): Promise<string> {

    const client =
      this.authService.getClient();

    const response =
      await client.get(
        '/system/Sales/Sales',
        {
          params: {
            campaignId,
            generalList: 1,
          },

          timeout: 240000,

          headers: {
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',

            'Cache-Control':
              'no-cache',

            Pragma:
              'no-cache',
          },
        },
      );

    if (
      typeof response.data !== 'string'
    ) {
      throw new InternalServerErrorException(
        `SICA no devolvió HTML para ${campaignName}`,
      );
    }

    return response.data;
  }

  // ============================================================
  // PROCESAR HTML
  // ============================================================

  private procesarHtml(
    html: string,
    campaignName: string,
  ): FilaSica[] {

    const $ =
      cheerio.load(html);

    const columnasNecesarias = [
      'ID',
      'Agente',
      'Sede',
      this.fechaHeader,
      this.fechaEdicionHeader,
      'ASESOR',
      'CERRADOR',
    ];

    /*
     * Buscamos directamente el elemento HTML de la tabla.
     *
     * Usamos for...of en lugar de modificar una variable
     * dentro de .each(), evitando problemas de inferencia
     * de TypeScript.
     */
    let tablaEncontrada:
      ReturnType<typeof $> | null = null;

    let headersEncontrados:
      string[] = [];

    const tablas =
      $('table').toArray();

    for (const elemento of tablas) {

      const tabla =
        $(elemento);

      const headers:
        string[] = [];

      tabla
        .find('thead tr')
        .first()
        .find('th, td')
        .each((_, celda) => {

          headers.push(
            this.limpiarEspacios(
              $(celda).text(),
            ),
          );
        });

      if (!headers.length) {
        continue;
      }

      const tieneTodas =
        columnasNecesarias.every(
          (nombre) =>
            headers.includes(nombre),
        );

      if (tieneTodas) {

        tablaEncontrada =
          tabla;

        headersEncontrados =
          headers;

        break;
      }
    }

    if (!tablaEncontrada) {

      throw new InternalServerErrorException(
        `No se encontró la tabla de ventas de ${campaignName}`,
      );
    }

    // ==========================================================
    // ÍNDICES DE COLUMNAS
    // ==========================================================

    const indexId =
      headersEncontrados.indexOf(
        'ID',
      );

    const indexAgente =
      headersEncontrados.indexOf(
        'Agente',
      );

    const indexSede =
      headersEncontrados.indexOf(
        'Sede',
      );

    const indexFecha =
      headersEncontrados.indexOf(
        this.fechaHeader,
      );

    const indexFechaEdicion =
      headersEncontrados.indexOf(
        this.fechaEdicionHeader
      );

    const indexAsesor =
      headersEncontrados.indexOf(
        'ASESOR',
      );

    const indexCerrador =
      headersEncontrados.indexOf(
        'CERRADOR',
      );

    const fechaHoy =
      this.obtenerFechaLima();

    const resultados:
      FilaSica[] = [];

    const ids =
      new Set<string>();

    // ==========================================================
    // RECORRER FILAS
    // ==========================================================

    tablaEncontrada
      .find('tbody > tr')
      .each((numeroFila, tr) => {

        const valores:
          string[] = [];

        $(tr)
          .find('td')
          .each((_, td) => {

            valores.push(
              this.limpiarEspacios(
                $(td).text(),
              ),
            );
          });

        if (!valores.length) {
          return;
        }

        // ------------------------------------------------------
        // Fecha de Tramitación
        // ------------------------------------------------------

        const fecha =
          this.extraerFecha(
            valores[indexFecha],
          );

        if (!fecha) {
          return;
        }

        if (fecha !== fechaHoy) {
          return
        }
        
        const fechaTramitacionIso = this.fechaAFormatoIso(fecha);
        
        const fechaEdicion = this.extraerFechaHora(
          valores[indexFechaEdicion]
        );

        const fechaEdicionIso = this.fechaHoraAFormatoIso(
          valores[indexFechaEdicion]
        );

        if (!fecha) {
          return;
        }

        if (fecha !== fechaHoy) {
          return;
        }

        // ------------------------------------------------------
        // ID de SICA
        // ------------------------------------------------------

        const idExterno =
          valores[indexId] ?? '';

        /*
         * Igual que tu Python:
         * campaña + ID evita duplicados.
         *
         * Si excepcionalmente ID está vacío,
         * usamos el número de fila para no considerar
         * todas las ventas vacías como el mismo registro.
         */
        const clave =
          idExterno
            ? `${campaignName}-${idExterno}`
            : `${campaignName}-FILA-${numeroFila}`;

        if (ids.has(clave)) {
          return;
        }

        ids.add(clave);

        // ------------------------------------------------------
        // Construcción de la fila cruda
        // ------------------------------------------------------

        resultados.push({
          idExterno,

          agenteOriginal:
            valores[indexAgente] ?? '',

          asesor:
            valores[indexAsesor] ?? '',

          cerrador:
            valores[indexCerrador] ?? '',

          sede:
            valores[indexSede] ?? '',

          campaign:
            campaignName,

          fechaTramitacion: fechaTramitacionIso,
          
          fechaEdicion: fechaEdicionIso,
        });
      });

    return resultados;
  }

  // ============================================================
  // LIMPIAR ESPACIOS
  // ============================================================

  private limpiarEspacios(
    texto?: string,
  ): string {

    return (texto ?? '')
      .replace(/\xa0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ============================================================
  // EXTRAER FECHA DD/MM/YYYY
  // ============================================================

  private extraerFecha(
    texto?: string,
  ): string | null {

    const match =
      (texto ?? '').match(
        /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/,
      );

    if (!match) {
      return null;
    }

    const [
      dia,
      mes,
      anio,
    ] = match[1].split('/');

    return [
      dia.padStart(2, '0'),
      mes.padStart(2, '0'),
      anio,
    ].join('/');
  }

  private extraerFechaHora(
    texto?: string,
  ): string {

    const valor =
      this.limpiarEspacios(texto);

    if (!valor) {
      return '';
    }

    const match =
      valor.match(
        /\b(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2}(?::\d{2})?)\b/,
      );

    if (!match) {
      return valor;
    }

    const [
      dia,
      mes,
      anio,
    ] = match[1].split('/');

    const fecha =
      `${dia.padStart(2, '0')}/` +
      `${mes.padStart(2, '0')}/` +
      `${anio}`;

    return `${fecha} ${match[2]}`;
  }

  private fechaAFormatoIso(
    fecha: string,
  ): string {

    const [
      dia,
      mes,
      anio,
    ] = fecha.split('/');

    return `${anio}-${mes}-${dia}`;
  }

  private fechaHoraAFormatoIso(
    texto?: string,
  ): string {

    const valor =
      this.limpiarEspacios(texto);

    if (!valor) {
      return '';
    }

    const match =
      valor.match(
        /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}:\d{2}(?::\d{2})?)\b/,
      );

    if (!match) {
      return valor;
    }

    const dia =
      match[1].padStart(2, '0');

    const mes =
      match[2].padStart(2, '0');

    const anio =
      match[3];

    const hora =
      match[4];

    return `${anio}-${mes}-${dia} ${hora}`;
  }



  // ============================================================
  // FECHA ACTUAL LIMA
  // ============================================================

  private obtenerFechaLima(): string {

    const parts =
      new Intl.DateTimeFormat(
        'en-GB',
        {
          timeZone:
            'America/Lima',

          day:
            '2-digit',

          month:
            '2-digit',

          year:
            'numeric',
        },
      ).formatToParts(
        new Date(),
      );

    const valores =
      Object.fromEntries(
        parts.map(
          (parte) => [
            parte.type,
            parte.value,
          ],
        ),
      );

    return (
      `${valores.day}/` +
      `${valores.month}/` +
      `${valores.year}`
    );
  }
}