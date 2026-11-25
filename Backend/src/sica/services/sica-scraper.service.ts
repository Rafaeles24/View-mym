import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as cheerio from 'cheerio';
import { DateTime } from 'luxon';

import { SicaAuthService } from './sica-auth.service';
import { FilaSica } from '../interfaces/fila-sica.interface';
import { RangoTramitacionSica } from '../interfaces/sica-scraper.interface';

const FILTROS_TRAMITACION: Record<number, string> = {
  1: 'FieldDateFilter_25945', // VODAFONE
  4850: 'FieldDateFilter_47157', // YOIGO
  /* 3404: 'FieldDateFilter_34180',   */ // JAZZTEL
};

@Injectable()
export class SicaScraperService {
  private readonly logger = new Logger(SicaScraperService.name);
  private readonly fechaHeader = 'Fecha de Tramitación';
  private readonly fechaEdicionHeader = 'Fecha edición';

  constructor(private readonly authService: SicaAuthService) {}

  // Por defecto mantiene la ventana HOY + AYER del ranking.
  // El rango opcional permite reconciliar fechas históricas.
  async obtenerVentas(
    campaignId: number,
    campaignName: string,
    rango?: RangoTramitacionSica,
  ): Promise<FilaSica[]> {
    const targetDate = FILTROS_TRAMITACION[campaignId];
    if (!targetDate) {
      throw new InternalServerErrorException(
        `No existe un filtro de Fecha de Tramitación para la campaña ${campaignId}`,
      );
    }

    const fechas = rango ?? this.obtenerRangoHoyYAyer();
    const inicioIso = this.validarFecha(fechas.inicio);
    const finIso = this.validarFecha(fechas.fin);

    if (inicioIso > finIso) {
      throw new InternalServerErrorException(
        'El inicio del rango SICA es posterior al fin',
      );
    }

    // Dos lecturas de la misma consulta, para mitigar resultados intermitentes.
    // Cuando difieren, se hace una tercera. Se conservan los IDs de la unión.
    const lecturas: Map<string, FilaSica>[] = [];

    for (let intento = 0; intento < 2; intento++) {
      if (intento > 0) await this.pausa(600);
      const html = await this.descargarListadoAjax(
        campaignId,
        campaignName,
        targetDate,
        fechas,
        intento,
      );
      const filas = this.procesarHtml(html, campaignName, inicioIso, finIso);
      lecturas.push(new Map(filas.map((fila) => [fila.idExterno, fila])));
    }

    if (!this.mismosIds(lecturas[0], lecturas[1])) {
      this.logger.warn(
        `[SICA] ${campaignName}: las lecturas de ${fechas.inicio} a ${fechas.fin} ` +
          `difieren (${lecturas[0].size} y ${lecturas[1].size} IDs). ` +
          'Se realizará una tercera consulta.',
      );
      await this.pausa(1200);
      const html = await this.descargarListadoAjax(
        campaignId,
        campaignName,
        targetDate,
        fechas,
        2,
      );
      const filas = this.procesarHtml(html, campaignName, inicioIso, finIso);
      lecturas.push(new Map(filas.map((fila) => [fila.idExterno, fila])));
    }

    const unificadas = new Map<string, FilaSica>();
    for (const lectura of lecturas) {
      for (const [id, fila] of lectura) {
        const anterior = unificadas.get(id);
        // Preferir la edición más reciente si una venta cambió entre lecturas.
        if (!anterior || fila.fechaEdicion > anterior.fechaEdicion) {
          unificadas.set(id, fila);
        }
      }
    }

    this.logger.log(
      `[SICA] ${campaignName} ${fechas.inicio}-${fechas.fin}: ` +
        `${lecturas.map((x) => x.size).join(' / ')} IDs por consulta; ` +
        `${unificadas.size} IDs únicos consolidados.`,
    );

    return [...unificadas.values()];
  }

  private async descargarListadoAjax(
    campaignId: number,
    campaignName: string,
    targetDate: string,
    rango: RangoTramitacionSica,
    intento: number,
  ): Promise<string> {
    const client = this.authService.getClient();

    const response = await client.get('/system/Sales/Sales', {
      params: {
        CampaignId: campaignId,
        StatusTabId: 0, // Listado general, no solo la pestaña Inicio.
        CanViewWhoOpenedSale: '',
        TargetDate: targetDate,
        StartDate: rango.inicio,
        EndDate: rango.fin,
        BranchId: '',
        SupervisorId: '',
        CustomFilterValues: '',
        CustomFilterOperator: '',
        'X-Requested-With': 'XMLHttpRequest',
        _: Date.now() + intento, // Evita reutilizar una URL cacheada.
      },
      headers: {
        Accept: '*/*',
        'X-Requested-With': 'XMLHttpRequest',
        Referer: `https://sicacentercrm.com/system/Sales/Sales?campaignId=${campaignId}&generalList=1`,
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      responseType: 'text',
      timeout: 60_000,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    if (response.status !== 200) {
      if (response.status >= 300 && response.status < 400) {
        throw new UnauthorizedException(
          `[SICA] Redirección HTTP ${response.status} al consultar ${campaignName}. Verifica la sesión.`,
        );
      }
      throw new InternalServerErrorException(
        `[SICA] HTTP ${response.status} al consultar ${campaignName}`,
      );
    }

    if (typeof response.data !== 'string') {
      throw new InternalServerErrorException(
        `[SICA] Respuesta no HTML para ${campaignName}`,
      );
    }

    const html = response.data;
    if (!html.trim()) {
      throw new InternalServerErrorException(
        `[SICA] HTML vacío para ${campaignName}`,
      );
    }

    // SICA puede responder el formulario de acceso con HTTP 200.
    const formularioLogin =
      /<form\b[^>]*\baction\s*=\s*["'][^"']*\/account\/login/i.test(html) ||
      (/<input\b[^>]*\btype\s*=\s*["']password["']/i.test(html) &&
        /<input\b[^>]*\bname\s*=\s*["']username["']/i.test(html));
    if (formularioLogin) {
      throw new UnauthorizedException(
        `[SICA] Sesión expirada para ${campaignName}`,
      );
    }

    const $ = cheerio.load(html);

    const ids = $('tr[id^="item_"]')
      .toArray()
      .map((tr) => $(tr).attr('id')?.replace('item_', ''))
      .filter(Boolean);

    const columnas = $('table thead tr').first().find('th').length;

    this.logger.log(
      `[SICA DEBUG] ${campaignName} ` +
        `${rango.inicio}-${rango.fin} | ` +
        `columnas=${columnas} | ` +
        `ventas=${ids.length} | ` +
        `ids=${ids.join(',')}`,
    );

    return html;
  }

  private esRespuestaSinVentas(
    $: ReturnType<typeof cheerio.load>,
    html: string,
  ): boolean {
    // Nunca considerar vacía una respuesta
    // que contiene referencias a ventas.
    if (
      $('[id^="item_"]').length > 0 ||
      $('a[href*="/Sales/Edit/"], ' + 'a[href*="/Sales/Sales/Edit/"]').length >
        0
    ) {
      return false;
    }

    const tablas = $('table');

    if (tablas.length > 0) {
      for (const elemento of tablas.toArray()) {
        const tabla = $(elemento);

        const cabeceras = tabla
          .find('thead tr')
          .first()
          .find('th, td')
          .toArray()
          .map((celda) => this.limpiarEspacios($(celda).text()));

        // Columnas base que SICA conserva
        // incluso cuando no hay ventas.
        const estructuraSica =
          cabeceras.includes('ID') &&
          cabeceras.includes('Fecha creación') &&
          cabeceras.includes(this.fechaEdicionHeader) &&
          cabeceras.includes('Agente');

        if (!estructuraSica) continue;

        const filas = tabla.find('tbody > tr');

        if (filas.length === 0) {
          return true;
        }

        if (
          filas.length === 1 &&
          $(filas[0]).children('td[colspan]').length > 0 &&
          this.contieneMensajeSinResultados($(filas[0]).text())
        ) {
          return true;
        }
      }

      return false;
    }

    const texto = this.limpiarEspacios($('body').text() || $.root().text());

    // Respuesta con mensaje explícito de cero ventas.
    if (this.contieneMensajeSinResultados(texto)) {
      return true;
    }

    // Algunos fragmentos AJAX contienen únicamente
    // un contenedor vacío. Se aceptan solo bajo
    // condiciones restringidas.
    const sinContenido =
      texto.length === 0 &&
      html.trim().length <= 2048 &&
      $('form, input, script, iframe, ' + 'a, table, tr, td').length === 0 &&
      $('div, section, span, p').length > 0;

    if (sinContenido) {
      this.logger.warn(
        '[SICA] Fragmento AJAX vacío reconocido. ' +
          `bytesHTML=${Buffer.byteLength(html, 'utf8')}`,
      );

      return true;
    }

    // HTML desconocido: no asumir cero ventas.
    return false;
  }

  private contieneMensajeSinResultados(texto: string): boolean {
    const normalizado = this.limpiarEspacios(texto)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    return [
      /no se (?:ha[n]? encontrado|encontraron|encontro) (?:ningun[ao]s? )?(?:registros?|resultados?|ventas?|datos?|elementos?|informacion)/,
      /no (?:hay|existen) (?:registros?|resultados?|ventas?|datos?|elementos?|informacion)/,
      /sin (?:registros?|resultados?|ventas?|datos?|elementos?|informacion)/,
      /ningun[ao]s? (?:registro|venta|resultado|dato|elemento)/,
      /\b0 (?:registros?|resultados?|ventas?|datos?)\b/,
      /no (?:data|records|results) (?:available|found)/,
      /no matching records/,
      /empty (?:result|list)/,
      /no se dispone de (?:datos|informacion)/,
    ].some((patron) => patron.test(normalizado));
  }

  private diagnosticarEstructuraHtml(
    $: ReturnType<typeof cheerio.load>,
    html: string,
  ): string {
    const tablas = $('table');
    const detallesTablas: string[] = [];

    tablas.each((indice, elemento) => {
      const tabla = $(elemento);

      const cabeceras = tabla
        .find('thead tr')
        .first()
        .find('th, td')
        .toArray()
        .map((celda) => this.limpiarEspacios($(celda).text()));

      const filas = tabla.find('tbody > tr');
      const filasConCeldas = filas.filter(
        (_, tr) => $(tr).children('td').length > 0,
      );

      detallesTablas.push(
        `tabla${indice + 1}={` +
          `cabeceras:[${cabeceras
            .slice(0, 20)
            .map((header) => header.slice(0, 60))
            .join(' | ')}], ` +
          `filas:${filas.length}, ` +
          `filasConCeldas:${filasConCeldas.length}` +
          `}`,
      );
    });

    const referenciasVentas = $(
      '[id^="item_"], ' +
        'a[href*="/Sales/Edit/"], ' +
        'a[href*="/Sales/Sales/Edit/"]',
    ).length;

    const texto = this.limpiarEspacios($('body').text() || $.root().text());

    const posibleLogin =
      $('input[type="password"]').length > 0 ||
      $('form[action*="/Account/Login"]').length > 0;

    const tieneMensajeSinResultados = this.contieneMensajeSinResultados(texto);

    return [
      `bytesHTML=${Buffer.byteLength(html, 'utf8')}`,
      `tablas=${tablas.length}`,
      `filasConId=${referenciasVentas}`,
      `formularios=${$('form').length}`,
      `textoCaracteres=${texto.length}`,
      `posibleLogin=${posibleLogin}`,
      `mensajeSinResultados=${tieneMensajeSinResultados}`,
      `detalles=${detallesTablas.slice(0, 5).join('; ') || 'sin tablas'}`,
    ].join(' | ');
  }

  private normalizarCabezeraSica(texto: string): string {
    return (texto ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private procesarHtml(
    html: string,
    campaignName: string,
    inicioIso: string,
    finIso: string,
  ): FilaSica[] {
    const $ = cheerio.load(html);

    const requeridas = [
      'ID',
      'Agente',
      'Sede',
      this.fechaHeader,
      this.fechaEdicionHeader,
      'ASESOR',
      'CERRADOR',
    ];

    let tablaEncontrada: ReturnType<typeof $> | null = null;
    let headersEncontrados: string[] = [];

    const requeridasNormalizadas = requeridas.map((nombre) =>
      this.normalizarCabezeraSica(nombre),
    );

    for (const elemento of $('table').toArray()) {
      const tabla = $(elemento);

      const headers = tabla
        .find('thead tr')
        .first()
        .find('th, td')
        .toArray()
        .map((celda) => this.limpiarEspacios($(celda).text()));

      const normalizados = headers.map((nombre) =>
        this.normalizarCabezeraSica(nombre),
      );

      const faltantes = requeridasNormalizadas.filter(
        (nombre) => !normalizados.includes(nombre),
      );

      if (faltantes.length === 0) {
        tablaEncontrada = tabla;
        headersEncontrados = headers;
        break;
      }

      this.logger.warn(
        `[SICA] ${campaignName}: ` +
          `Columnas no identificadas: ${faltantes.join(', ')}. ` +
          `Columnas totales: ${headers.length}`,
      );

      if (requeridas.every((nombre) => headers.includes(nombre))) {
        tablaEncontrada = tabla;
        headersEncontrados = headers;
        break;
      }
    }

    // Respuesta legítima sin ventas
    if (!tablaEncontrada) {
      if (this.esRespuestaSinVentas($, html)) {
        this.logger.log(
          `[SICA] ${campaignName} ` + `${inicioIso}-${finIso}: SIN VENTAS`,
        );

        return [];
      }

      const diagnostico = this.diagnosticarEstructuraHtml($, html);

      throw new InternalServerErrorException(
        `[SICA] Tabla de ventas no reconocida ` +
          `en ${campaignName} ${inicioIso}-${finIso}. ` +
          diagnostico,
      );
    }

    const filas = tablaEncontrada.find('tbody > tr');

    if (filas.length === 0) {
      this.logger.log(
        `[SICA] ${campaignName}: SIN VENTAS ` + `(${inicioIso}-${finIso})`,
      );

      return [];
    }

    if (
      filas.length === 1 &&
      $(filas[0]).children('td[colspan]').length > 0 &&
      this.contieneMensajeSinResultados($(filas[0]).text())
    ) {
      return [];
    }

    const indice = (nombre: string) => {
      const buscado = this.normalizarCabezeraSica(nombre);

      return headersEncontrados.findIndex(
        (header) => this.normalizarCabezeraSica(header) === buscado,
      );
    };

    // Validar que la columna Sede exista
    const indiceSede = indice('Sede');

    if (indiceSede === -1) {
      throw new InternalServerErrorException(
        `[SICA] No se encontró la columna Sede ` + `en ${campaignName}`,
      );
    }

    const resultados: FilaSica[] = [];
    const ids = new Set<string>();

    filas.each((numeroFila, tr) => {
      const celdas = $(tr).children('td');

      if (!celdas.length) return;

      const valores = celdas
        .toArray()
        .map((td) => this.limpiarEspacios($(td).text()));

      const fecha = this.extraerFecha(valores[indice(this.fechaHeader)]);

      if (!fecha) return;

      const fechaIso = this.fechaAFormatoIso(fecha);

      if (fechaIso < inicioIso || fechaIso > finIso) {
        return;
      }

      const celdaId = celdas.eq(indice('ID'));

      const idExterno =
        valores[indice('ID')] ||
        celdaId
          .find('a[href*="/Sales/Edit/"]')
          .attr('href')
          ?.match(/\/Edit\/(\d+)/)?.[1] ||
        '';

      if (!/^\d+$/.test(idExterno)) {
        throw new InternalServerErrorException(
          `[SICA] ID inválido en ${campaignName}, ` + `fila ${numeroFila + 1}`,
        );
      }

      if (ids.has(idExterno)) return;

      // =========================================
      // VALIDACIÓN DE SEDE
      // =========================================

      // La columna existe, pero también verificamos
      // que la fila tenga físicamente esa celda.
      if (celdas.eq(indiceSede).length === 0) {
        throw new InternalServerErrorException(
          `[SICA] Venta ${idExterno} de ${campaignName}: ` +
            `falta la celda Sede en la fila ` +
            `${numeroFila + 1}.`,
        );
      }

      const sede = (valores[indiceSede] ?? '').trim();

      // Una celda de sede vacía es válida.
      // BACKOFFICE se asignará en el importador.
      if (!sede) {
        this.logger.warn(
          `[SICA] Venta ${idExterno} ` +
            `de ${campaignName} ` +
            `con fecha ${fechaIso} SIN SEDE. ` +
            `Se derivará a BACKOFFICE.`,
        );
      }

      // =========================================
      // REGISTRAR VENTA
      // =========================================

      ids.add(idExterno);

      resultados.push({
        idExterno,

        agenteOriginal: valores[indice('Agente')] ?? '',

        asesor: valores[indice('ASESOR')] ?? '',

        cerrador: valores[indice('CERRADOR')] ?? '',

        sede,

        campaign: campaignName,

        fechaTramitacion: fechaIso,

        fechaEdicion: this.fechaHoraAFormatoIso(
          valores[indice(this.fechaEdicionHeader)],
        ),
      });
    });

    return resultados;
  }

  private obtenerRangoHoyYAyer(): RangoTramitacionSica {
    const hoy = DateTime.now().setZone('America/Lima');
    return {
      inicio: hoy.minus({ days: 1 }).toFormat('dd/MM/yyyy'),
      fin: hoy.toFormat('dd/MM/yyyy'),
    };
  }

  private validarFecha(fecha: string): string {
    const valor = DateTime.fromFormat(fecha, 'dd/MM/yyyy', {
      zone: 'America/Lima',
    });
    if (!valor.isValid || valor.toFormat('dd/MM/yyyy') !== fecha) {
      throw new InternalServerErrorException(`Fecha SICA inválida: ${fecha}`);
    }
    return valor.toFormat('yyyy-MM-dd');
  }

  private mismosIds(
    a: Map<string, FilaSica>,
    b: Map<string, FilaSica>,
  ): boolean {
    return a.size === b.size && [...a.keys()].every((id) => b.has(id));
  }

  private pausa(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private limpiarEspacios(texto?: string): string {
    return (texto ?? '').replace(/\xa0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private extraerFecha(texto?: string): string | null {
    const match = (texto ?? '').match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    if (!match) return null;
    return `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}/${match[3]}`;
  }

  private fechaAFormatoIso(fecha: string): string {
    const [dia, mes, anio] = fecha.split('/');
    return `${anio}-${mes}-${dia}`;
  }

  private fechaHoraAFormatoIso(texto?: string): string {
    const valor = this.limpiarEspacios(texto);
    if (!valor) return '';

    const match = valor.match(
      /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}:\d{2}(?::\d{2})?)\b/,
    );
    if (!match) return valor;
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')} ${match[4]}`;
  }
}
