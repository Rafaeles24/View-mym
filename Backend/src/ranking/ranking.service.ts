import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RealtimeGateway } from 'src/realtime/realtime.gateway';
import * as XLSX from 'xlsx';


const SHEETS = {
  data: 'DATA',
  rankingSupervisor: 'RANKING_SUPERVISOR',
  rankingAgente: 'RANKING_AGENTE',
} as const;

@Injectable()
export class RankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeGateway
  ) {}

  async transformExcelToJson(
    file: Express.Multer.File,
  ) {
    const workbook = this.loadWorkbook(file);

    const dataRows = this.readSheet(
      workbook,
      SHEETS.data,
    );

    const supervisorRows = this.readSheet(
      workbook,
      SHEETS.rankingSupervisor,
    );

    const agenteRows = this.readSheet(
      workbook,
      SHEETS.rankingAgente,
    );

    const data = dataRows.map((row, index) =>
      this.mapDataRow(
        row,
        SHEETS.data,
        index + 2,
      ),
    );

    const rankingSupervisor =
      supervisorRows.map((row, index) =>
        this.mapRankingSupervisorRow(
          row,
          SHEETS.rankingSupervisor,
          index + 2,
        ),
      );

    const rankingAgente =
      agenteRows.map((row, index) =>
        this.mapRankingAgenteRow(
          row,
          SHEETS.rankingAgente,
          index + 2,
        ),
      );

    /*
     * Sincroniza colaboradores y reemplaza
     * completamente el ranking del día.
     */
    const resultado =
      await this.syncDatabase(data);

    this.rt.emitRankingEvent('refresh');  

    return {
      data,
      ranking_supervisor:
        rankingSupervisor,
      ranking_agente:
        rankingAgente,

      ranking_guardado: {
        fecha: resultado.fecha
          .toISOString()
          .slice(0, 10),

        registros:
          resultado.ranking.length,

        supervisores:
          resultado.ranking.filter(
            (item) =>
              item.supervisor === true,
          ).length,

        agentes:
          resultado.ranking.filter(
            (item) =>
              item.supervisor === false,
          ).length,
      },
    };
  }

  // ===================================================
  // SINCRONIZAR BASE DE DATOS
  // ===================================================

  private async syncDatabase(
    data: Array<{
      supervisor: string;
      agente: string;
      sede: string;
      tipo: string;
      asesor: string;
      cerrador: string;
      campania: string;
      hoja: string;
    }>,
  ) {
    /*
     * Aquí agrupamos los registros actuales del Excel.
     *
     * La cantidad encontrada será el nuevo valor
     * de tramitadas. No se incrementa el valor anterior.
     */
    const agrupados = new Map<
      string,
      {
        nombre: string;
        supervisor: boolean;
        variante: string | null;
        tramitadas: number;
        sede: string;
        campania: string;
      }
    >();

    const agregarColaborador = (
      nombre: string,
      supervisor: boolean,
      variante: string | null,
      sede: string,
      campania: string,
    ) => {
      const nombreNormalizado =
        this.normalizeText(nombre);

      const sedeNormalizada =
        this.normalizeText(sede);

      const campaniaNormalizada =
        this.normalizeText(campania);

      if (
        !nombreNormalizado ||
        !sedeNormalizada ||
        !campaniaNormalizada
      ) {
        return;
      }

      /*
       * Una persona es única dentro de:
       * nombre + sede + campaña
       */
      const key = [
        nombreNormalizado,
        sedeNormalizada,
        campaniaNormalizada,
      ].join('|');

      const existente =
        agrupados.get(key);

      if (existente) {
        /*
         * Cuenta las filas actuales del Excel.
         *
         * Ejemplo:
         * Si actualmente hay 5 registros,
         * tramitadas será 5.
         */
        existente.tramitadas += 1;

        /*
         * Si aparece como supervisor,
         * se prioriza dicha clasificación.
         */
        if (supervisor) {
          existente.supervisor = true;
          existente.variante = null;
        }

        return;
      }

      agrupados.set(key, {
        nombre: nombreNormalizado,
        supervisor,
        variante,
        tramitadas: 1,
        sede: sedeNormalizada,
        campania: campaniaNormalizada,
      });
    };

    for (const fila of data) {
      // -----------------------------------------------
      // SUPERVISOR
      // -----------------------------------------------

      agregarColaborador(
        fila.supervisor,
        true,
        null,
        fila.sede,
        fila.campania,
      );

      // -----------------------------------------------
      // AGENTE
      // -----------------------------------------------

      const agenteNormalizado =
        this.normalizeText(fila.agente);

      const esCapa =
        agenteNormalizado.startsWith(
          'CAPA',
        );

      /*
       * Si AGENTE comienza con CAPA:
       * - nombre = ASESOR
       * - variante = OJT
       *
       * Caso contrario:
       * - nombre = AGENTE
       * - variante = ALTA
       */
      const nombreAgente = esCapa
        ? fila.asesor
        : fila.agente;

      agregarColaborador(
        nombreAgente,
        false,
        esCapa ? 'OJT' : 'ALTA',
        fila.sede,
        fila.campania,
      );
    }

    const items = Array.from(
      agrupados.values(),
    );

    if (items.length === 0) {
      throw new BadRequestException(
        'El Excel no contiene registros para procesar.',
      );
    }

    const fecha =
      this.getCurrentLimaDate();

    return this.prisma.$transaction(
      async (tx) => {
        // =============================================
        // OBTENER SEDES
        // =============================================

        const sedes =
          await tx.sede.findMany({
            select: {
              id: true,
              nombre: true,
            },
          });

        const sedeMap = new Map(
          sedes.map((sede) => [
            this.normalizeText(
              sede.nombre,
            ),
            sede.id,
          ]),
        );

        // =============================================
        // OBTENER CAMPAÑAS
        // =============================================

        const campaigns =
          await tx.campaign.findMany({
            select: {
              id: true,
              nombre: true,
            },
          });

        const campaignMap = new Map(
          campaigns.map((campaign) => [
            this.normalizeText(
              campaign.nombre,
            ),
            campaign.id,
          ]),
        );

        // =============================================
        // VALIDAR SEDES Y CAMPAÑAS
        // =============================================

        const faltantesSede =
          new Set<string>();

        const faltantesCampaign =
          new Set<string>();

        for (const item of items) {
          if (
            !sedeMap.has(item.sede)
          ) {
            faltantesSede.add(
              item.sede,
            );
          }

          if (
            !campaignMap.has(
              item.campania,
            )
          ) {
            faltantesCampaign.add(
              item.campania,
            );
          }
        }

        if (faltantesSede.size > 0) {
          throw new BadRequestException(
            `No existen las siguientes sedes: ${Array.from(
              faltantesSede,
            ).join(', ')}`,
          );
        }

        if (
          faltantesCampaign.size > 0
        ) {
          throw new BadRequestException(
            `No existen las siguientes campañas: ${Array.from(
              faltantesCampaign,
            ).join(', ')}`,
          );
        }

        // =============================================
        // IDENTIFICAR ALCANCE DEL EXCEL
        // =============================================

        const scopesMap = new Map<
          string,
          {
            sede_id: number;
            campaign_id: number;
          }
        >();

        for (const item of items) {
          const sedeId =
            sedeMap.get(item.sede)!;

          const campaignId =
            campaignMap.get(
              item.campania,
            )!;

          const key =
            `${sedeId}|${campaignId}`;

          scopesMap.set(key, {
            sede_id: sedeId,
            campaign_id:
              campaignId,
          });
        }

        const scopes = Array.from(
          scopesMap.values(),
        );

        // =============================================
        // REINICIAR TRAMITADAS DEL ALCANCE ACTUAL
        // =============================================

        /*
         * Si un colaborador estaba en el tramo anterior
         * pero ya no aparece en el Excel actual,
         * sus tramitadas deben quedar en cero.
         *
         * Solo se reinician las campañas y sedes
         * incluidas en el archivo.
         */
        for (const scope of scopes) {
          await tx.colaborador.updateMany({
            where: {
              sede_id:
                scope.sede_id,

              campaign_id:
                scope.campaign_id,
            },

            data: {
              tramitadas: 0,
            },
          });
        }

        // =============================================
        // BUSCAR COLABORADORES EXISTENTES
        // =============================================

        const existentes =
          await tx.colaborador.findMany({
            where: {
              OR: scopes.map(
                (scope) => ({
                  sede_id:
                    scope.sede_id,

                  campaign_id:
                    scope.campaign_id,
                }),
              ),
            },

            select: {
              id: true,
              nombre: true,
              supervisor: true,
              variante: true,
              tramitadas: true,
              sede_id: true,
              campaign_id: true,
            },
          });

        const existentesMap =
          new Map(
            existentes.map(
              (colaborador) => [
                [
                  this.normalizeText(
                    colaborador.nombre,
                  ),
                  colaborador.sede_id,
                  colaborador.campaign_id,
                ].join('|'),

                colaborador,
              ],
            ),
          );

        const guardados: Array<{
          id: number;
          nombre: string;
          supervisor: boolean;
          variante: string | null;
          tramitadas: number;
          sede_id: number;
          campaign_id: number;
        }> = [];

        // =============================================
        // CREAR O ACTUALIZAR COLABORADORES
        // =============================================

        for (const item of items) {
          const sedeId =
            sedeMap.get(item.sede)!;

          const campaignId =
            campaignMap.get(
              item.campania,
            )!;

          const key = [
            item.nombre,
            sedeId,
            campaignId,
          ].join('|');

          const existente =
            existentesMap.get(key);

          let colaborador;

          if (existente) {
            colaborador =
              await tx.colaborador.update({
                where: {
                  id: existente.id,
                },

                data: {
                  supervisor:
                    item.supervisor,

                  variante:
                    item.variante,

                  /*
                   * REEMPLAZA el valor anterior.
                   *
                   * No utiliza increment.
                   */
                  tramitadas:
                    item.tramitadas,

                  activo: true,
                },

                select: {
                  id: true,
                  nombre: true,
                  supervisor: true,
                  variante: true,
                  tramitadas: true,
                  sede_id: true,
                  campaign_id: true,
                },
              });
          } else {
            colaborador =
              await tx.colaborador.create({
                data: {
                  nombre:
                    item.nombre,

                  supervisor:
                    item.supervisor,

                  variante:
                    item.variante,

                  tramitadas:
                    item.tramitadas,

                  sede_id:
                    sedeId,

                  campaign_id:
                    campaignId,

                  activo: true,
                },

                select: {
                  id: true,
                  nombre: true,
                  supervisor: true,
                  variante: true,
                  tramitadas: true,
                  sede_id: true,
                  campaign_id: true,
                },
              });
          }

          guardados.push(
            colaborador,
          );
        }

        // =============================================
        // GENERAR RANKING ACTUAL
        // =============================================

        /*
         * El snapshot diario guarda únicamente
         * el colaborador y sus tramitadas.
         *
         * El puesto no se persiste porque se
         * calcula dinámicamente en el servicio GET.
         */
        const ranking = guardados.map(
          (item) => ({
            colaborador_id: item.id,
            tramitadas: item.tramitadas,
            supervisor: item.supervisor,
          }),
        );

        // =============================================
        // REEMPLAZAR RANKING DEL DÍA
        // =============================================

        /*
         * Elimina el snapshot del tramo anterior
         * correspondiente al mismo día.
         */
        await tx.rankingDia.deleteMany({
          where: {
            fecha,
          },
        });

        /*
         * Inserta el snapshot actualizado.
         */
        if (ranking.length > 0) {
          await tx.rankingDia.createMany({
            data: ranking.map(
              (item) => ({
                colaborador_id:
                  item.colaborador_id,

                tramitadas:
                  item.tramitadas,

                fecha,
              }),
            ),
          });
        }

        return {
          fecha,
          ranking,
          colaboradores: guardados,
        };
      },
    );
  }

  // ===================================================
  // CALCULAR PUESTOS DINÁMICAMENTE
  // ===================================================

  private asignarPuestos<
    T extends {
      nombre: string;
      tramitadas: number;
    },
  >(registros: T[]): Array<T & { puesto: number }> {
    const ordenados = [...registros].sort((a, b) => {
      if (b.tramitadas !== a.tramitadas) {
        return b.tramitadas - a.tramitadas;
      }

      return a.nombre.localeCompare(
        b.nombre,
        'es',
        {
          sensitivity: 'base',
        },
      );
    });

    let puestoActual = 0;
    let tramitadasAnteriores: number | null = null;

    return ordenados.map((item) => {
      if (
        tramitadasAnteriores === null ||
        item.tramitadas !== tramitadasAnteriores
      ) {
        puestoActual += 1;
        tramitadasAnteriores = item.tramitadas;
      }

      return {
        ...item,
        puesto: puestoActual,
      };
    });
  }

  // ===================================================
  // FECHA ACTUAL DE LIMA
  // ===================================================

  private getCurrentLimaDate(): Date {
    const parts =
      new Intl.DateTimeFormat(
        'en-US',
        {
          timeZone:
            'America/Lima',

          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        },
      ).formatToParts(
        new Date(),
      );

    const year = Number(
      parts.find(
        (part) =>
          part.type === 'year',
      )?.value,
    );

    const month = Number(
      parts.find(
        (part) =>
          part.type === 'month',
      )?.value,
    );

    const day = Number(
      parts.find(
        (part) =>
          part.type === 'day',
      )?.value,
    );

    /*
     * Se guarda como fecha normalizada:
     * 2026-07-13T00:00:00.000Z
     */
    return new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );
  }

  // ===================================================
  // LEER EXCEL
  // ===================================================

  private loadWorkbook(
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Debe enviar un archivo Excel.',
      );
    }

    if (
      !file.buffer ||
      file.buffer.length === 0
    ) {
      throw new BadRequestException(
        'El archivo enviado está vacío.',
      );
    }

    try {
      return XLSX.read(
        file.buffer,
        {
          type: 'buffer',
          cellDates: true,
        },
      );
    } catch {
      throw new BadRequestException(
        'No se pudo leer el archivo Excel.',
      );
    }
  }

  private readSheet(
    workbook: XLSX.WorkBook,
    sheetName: string,
  ): Array<Record<string, unknown>> {
    const sheet =
      workbook.Sheets[sheetName];

    if (!sheet) {
      throw new BadRequestException(
        `No existe la hoja "${sheetName}".`,
      );
    }

    const rows =
      XLSX.utils.sheet_to_json<
        Record<string, unknown>
      >(sheet, {
        defval: '',
        raw: false,
      });

    return rows.map((row) => {
      const normalized: Record<
        string,
        unknown
      > = {};

      for (
        const [key, value]
        of Object.entries(row)
      ) {
        normalized[
          this.normalizeText(key)
        ] = value;
      }

      return normalized;
    });
  }

  // ===================================================
  // MAPEAR DATA
  // ===================================================

  private mapDataRow(
    row: Record<string, unknown>,
    sheet: string,
    excelRow: number,
  ) {
    const archivo =
      this.text(
        row.ARCHIVO ??
          row.CAMPANIA,
      );

    return {
      supervisor:
        this.requiredText(
          row,
          'SUPERVISOR',
          sheet,
          excelRow,
        ),

      agente:
        this.requiredText(
          row,
          'AGENTE',
          sheet,
          excelRow,
        ),

      sede:
        this.requiredText(
          row,
          'SEDE',
          sheet,
          excelRow,
        ),

      tipo:
        this.requiredText(
          row,
          'TIPO',
          sheet,
          excelRow,
        ),

      asesor:
        this.text(row.ASESOR),

      cerrador:
        this.text(row.CERRADOR),

      campania:
        this.removeExcelExtension(
          archivo,
        ),

      hoja:
        this.text(row.HOJA),
    };
  }

  private mapRankingSupervisorRow(
    row: Record<string, unknown>,
    sheet: string,
    excelRow: number,
  ) {
    return {
      puesto:
        this.requiredNumber(
          row,
          'PUESTO',
          sheet,
          excelRow,
        ),

      supervisor:
        this.requiredText(
          row,
          'SUPERVISOR',
          sheet,
          excelRow,
        ),

      sede:
        this.requiredText(
          row,
          'SEDE',
          sheet,
          excelRow,
        ),

      tramitadas:
        this.requiredNumber(
          row,
          'TRAMITADAS',
          sheet,
          excelRow,
        ),
    };
  }

  private mapRankingAgenteRow(
    row: Record<string, unknown>,
    sheet: string,
    excelRow: number,
  ) {
    return {
      puesto:
        this.requiredNumber(
          row,
          'PUESTO',
          sheet,
          excelRow,
        ),

      agente:
        this.requiredText(
          row,
          'AGENTE',
          sheet,
          excelRow,
        ),

      sede:
        this.requiredText(
          row,
          'SEDE',
          sheet,
          excelRow,
        ),

      tramitadas:
        this.requiredNumber(
          row,
          'TRAMITADAS',
          sheet,
          excelRow,
        ),
    };
  }

  // ===================================================
  // UTILIDADES
  // ===================================================

  private requiredText(
    row: Record<string, unknown>,
    field: string,
    sheet: string,
    excelRow: number,
  ): string {
    const value =
      this.text(row[field]);

    if (!value) {
      throw new BadRequestException(
        `El campo "${field}" está vacío en la hoja "${sheet}", fila ${excelRow}.`,
      );
    }

    return value;
  }

  private requiredNumber(
    row: Record<string, unknown>,
    field: string,
    sheet: string,
    excelRow: number,
  ): number {
    const raw =
      this.text(row[field]);

    const value =
      Number(raw);

    if (
      !Number.isFinite(value)
    ) {
      throw new BadRequestException(
        `El campo "${field}" no es numérico en la hoja "${sheet}", fila ${excelRow}.`,
      );
    }

    return value;
  }

  private text(
    value: unknown,
  ): string {
    if (
      value === null ||
      value === undefined
    ) {
      return '';
    }

    return String(value)
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
  }

  private normalizeText(
    value: unknown,
  ): string {
    return this.text(value);
  }

  private removeExcelExtension(
    fileName: string,
  ): string {
    return fileName
      .replace(
        /\.xlsx?$/i,
        '',
      )
      .trim();
  }

  async getRankingActual() {
    const fecha =
      this.getCurrentLimaDate();

    /*
     * La base de datos solo devuelve el snapshot
     * del día: colaborador + tramitadas.
     *
     * El puesto se calcula después y nunca se
     * lee desde rankingDia.
     */
    const ranking =
      await this.prisma.rankingDia.findMany({
        where: {
          fecha,
        },

        include: {
          colaborador: {
            select: {
              id: true,
              nombre: true,
              supervisor: true,
              variante: true,
              sede_id: true,
              campaign_id: true,

              sede: {
                select: {
                  id: true,
                  nombre: true,
                },
              },

              campaign: {
                select: {
                  id: true,
                  nombre: true,
                  logo_url: true
                },
              },
            },
          },
        },
      });

    /*
     * Supervisores y agentes se clasifican
     * de manera independiente.
     */
    const supervisoresBase = ranking
      .filter(
        (item) =>
          item.colaborador.supervisor,
      )
      .map((item) => ({
        colaborador_id:
          item.colaborador.id,

        nombre:
          item.colaborador.nombre,

        tramitadas:
          item.tramitadas,

        sede: {
          id:
            item.colaborador.sede.id,
          nombre:
            item.colaborador.sede.nombre,
        },

        campania: {
          id:
            item.colaborador.campaign.id,
          nombre:
            item.colaborador.campaign
              .nombre,
          logoUrl: this.normalizeUrl(`${process.env.BASE_URL}/${item.colaborador.campaign.logo_url}`)
        },
      }));

    const agentesBase = ranking
      .filter(
        (item) =>
          !item.colaborador.supervisor,
      )
      .map((item) => ({
        colaborador_id:
          item.colaborador.id,

        nombre:
          item.colaborador.nombre,

        variante:
          item.colaborador.variante,

        tramitadas:
          item.tramitadas,

        sede: {
          id:
            item.colaborador.sede.id,
          nombre:
            item.colaborador.sede.nombre,
        },

        campania: {
          id:
            item.colaborador.campaign.id,
          nombre:
            item.colaborador.campaign
              .nombre,
        },
      }));

    /*
     * El método devuelve los elementos ordenados
     * y agrega el puesto calculado.
     */
    const supervisores =
      this.asignarPuestos(
        supervisoresBase,
      );

    const agentes =
      this.asignarPuestos(
        agentesBase,
      );

    return {
      fecha: fecha
        .toISOString()
        .slice(0, 10),

      supervisores,
      agentes,

      resumen: {
        total_supervisores:
          supervisores.length,

        total_agentes:
          agentes.length,

        total_registros:
          ranking.length,
      },
    };
  }

  private normalizeUrl(
    url: string | null,
  ): string | null {
    if (!url) {
      return null;
    }

    return url.replace(/\\/g, '/');
  }

}