import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { TipoEmpleado } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from 'src/prisma/prisma.service';

import {
  fechaBDComoLima,
  fechaLimaParaBD,
  obtenerDiaLima,
  obtenerDiferenciaMadridLima,
  ZONA_LIMA,
} from '../helpers/visor-fecha.helper';

import { validarSedeId } from '../helpers/validarSede';
import { TramoBase } from '../types/resumen-ventas.type';

type AcumuladorResumen = {
  total_ventas: number;
  ventas_en_tramos: number;
  ventas_fuera_de_horario: number;
  ventas_sin_fecha_lima: number;
  tramos: (TramoBase & { cantidad: number })[];
};

@Injectable()
export class VisorResumenVentasService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private crearAcumulador(
    tramosBase: TramoBase[],
  ): AcumuladorResumen {
    return {
      total_ventas: 0,
      ventas_en_tramos: 0,
      ventas_fuera_de_horario: 0,
      ventas_sin_fecha_lima: 0,

      tramos: tramosBase.map((tramo) => ({
        ...tramo,
        cantidad: 0,
      })),
    };
  }

  private registrarVenta(
    acumulador: AcumuladorResumen,
    fechaLima: Date | null,
  ) {
    acumulador.total_ventas++;

    if (!fechaLima) {
      acumulador.ventas_sin_fecha_lima++;
      return;
    }

    const fechaVenta = fechaBDComoLima(fechaLima);

    if (!fechaVenta.isValid) {
      acumulador.ventas_sin_fecha_lima++;
      return;
    }

    const minutosVenta =
      fechaVenta.hour * 60 +
      fechaVenta.minute +
      fechaVenta.second / 60;

    const tramo = acumulador.tramos.find(
      (item) =>
        minutosVenta >= item.hora_inicio * 60 &&
        minutosVenta < item.hora_fin * 60,
    );

    if (!tramo) {
      acumulador.ventas_fuera_de_horario++;
      return;
    }

    tramo.cantidad++;
    acumulador.ventas_en_tramos++;
  }

  private formatearResumen(
    acumulador: AcumuladorResumen,
  ) {
    const total = acumulador.total_ventas;

    return {
      totales: {
        ventas: total,
        ventas_en_tramos:
          acumulador.ventas_en_tramos,
        ventas_fuera_de_horario:
          acumulador.ventas_fuera_de_horario,
        ventas_sin_fecha_lima:
          acumulador.ventas_sin_fecha_lima,
      },

      tramos: acumulador.tramos.map((tramo) => ({
        clave: tramo.clave,

        hora_inicio: this.formatearHora(
          tramo.hora_inicio,
        ),

        hora_fin: this.formatearHora(
          tramo.hora_fin,
        ),

        cantidad: tramo.cantidad,

        porcentaje:
          total > 0
            ? Number(
                (
                  (tramo.cantidad / total) * 100
                ).toFixed(2),
              )
            : 0,
      })),
    };
  }

  // ============================================================
  // RESUMEN GLOBAL Y POR SEDE
  // ============================================================

  async obtenerResumenDiario(
    sedeId: number,
    fecha?: string,
  ) {
    validarSedeId(sedeId);

    const inicio = obtenerDiaLima(fecha);

    if (!inicio.isValid) {
      throw new InternalServerErrorException(
        'Fecha de consulta inválida',
      );
    }

    const fin = inicio.plus({
      days: 1,
    });

    const diferenciaHoraria =
      obtenerDiferenciaMadridLima(inicio);

    const horaCierre = 22 - diferenciaHoraria;

    if (
      horaCierre !== 15 &&
      horaCierre !== 16
    ) {
      throw new InternalServerErrorException(
        `Diferencia inesperada entre Madrid y Lima: ${diferenciaHoraria}`,
      );
    }

    // ----------------------------------------------------------
    // CONSULTAS
    // ----------------------------------------------------------

    const [sede, ventas] = await Promise.all([
      this.prisma.sede.findUnique({
        where: {
          id: sedeId,
        },
        select: {
          id: true,
          nombre: true,
        },
      }),

      this.prisma.venta.findMany({
        where: {
          tipo_empleado: TipoEmpleado.AGENTE,

          fecha_tramitacion: {
            gte: fechaLimaParaBD(inicio),
            lt: fechaLimaParaBD(fin),
          },
        },

        select: {
          sede_id: true,
          fecha_lima: true,
        },
      }),
    ]);

    if (!sede) {
      throw new NotFoundException(
        `No se encontró la sede ${sedeId}`,
      );
    }

    // ----------------------------------------------------------
    // TRAMOS
    // ----------------------------------------------------------

    const tramosBase: TramoBase[] = [
      {
        clave: 'TRAMO_1',
        hora_inicio: 7,
        hora_fin: 9,
      },
      {
        clave: 'TRAMO_2',
        hora_inicio: 9,
        hora_fin: 11,
      },
      {
        clave: 'TRAMO_3',
        hora_inicio: 11,
        hora_fin: 13,
      },
      {
        clave: 'TRAMO_4',
        hora_inicio: 13,
        hora_fin: horaCierre,
      },
    ];

    // ----------------------------------------------------------
    // ACUMULADORES INDEPENDIENTES
    // ----------------------------------------------------------

    const global = this.crearAcumulador(tramosBase);

    const porSede = this.crearAcumulador(tramosBase);

    // ----------------------------------------------------------
    // CLASIFICACIÓN DE VENTAS
    // ----------------------------------------------------------

    for (const venta of ventas) {
      // Todas las ventas AGENTE cuentan para el global,
      // incluidas las que no tienen sede.
      this.registrarVenta(
        global,
        venta.fecha_lima,
      );

      // Solo las ventas de la sede seleccionada.
      if (venta.sede_id === sedeId) {
        this.registrarVenta(
          porSede,
          venta.fecha_lima,
        );
      }
    }

    // ----------------------------------------------------------
    // NORMALIZAR NOMBRE DE SEDE
    // ----------------------------------------------------------

    const nombreSede =
      sede.nombre === 'TOMAS VALLE'
        ? 'TOMAS V.'
        : sede.nombre === 'BACKOFFICE'
          ? 'BO'
          : sede.nombre;

    // ----------------------------------------------------------
    // RESPUESTA
    // ----------------------------------------------------------

    return {
      fecha: inicio.toISODate(),

      zona_horaria: ZONA_LIMA,

      diferencia_madrid_lima:
        diferenciaHoraria,

      horario: {
        inicio: '07:00',
        fin: this.formatearHora(horaCierre),
      },

      global: this.formatearResumen(global),

      sede: {
        sede_id: sede.id,
        nombre: nombreSede,

        ...this.formatearResumen(porSede),
      },
    };
  }

  // ============================================================
  // RESUMEN DE AYER
  // ============================================================

  async obtenerResumenAyer(
    sedeId: number,
  ) {
    const ayer = DateTime.now()
      .setZone(ZONA_LIMA)
      .minus({ days: 1 })
      .toISODate();

    if (!ayer) {
      throw new InternalServerErrorException(
        'No se pudo calcular la fecha de ayer',
      );
    }

    return this.obtenerResumenDiario(
      sedeId,
      ayer,
    );
  }

  // ============================================================
  // FORMATO DE HORA
  // ============================================================

  private formatearHora(
    hora: number,
  ): string {
    return `${String(hora).padStart(2, '0')}:00`;
  }

  // ============================================================
  // RESUMEN MENSUAL NO ACUMULATIVO
  // ============================================================

  async obtenerResumenMensual(
    fecha?: string,
  ) {
    // ----------------------------------------------------------
    // FECHA DE REFERENCIA
    // ----------------------------------------------------------

    const referencia = fecha
      ? DateTime.fromISO(fecha, {
          zone: ZONA_LIMA,
        })
      : DateTime.now().setZone(ZONA_LIMA);

    if (!referencia.isValid) {
      throw new InternalServerErrorException(
        'Fecha de consulta inválida',
      );
    }

    const inicioMes = referencia.startOf('month');

    const finMes = inicioMes.plus({
      months: 1,
    });

    const hoy = DateTime.now()
      .setZone(ZONA_LIMA)
      .startOf('day');

    // ----------------------------------------------------------
    // DETERMINAR HASTA QUÉ DÍA SE ANALIZA
    // ----------------------------------------------------------

    const esMesActual =
      inicioMes.year === hoy.year &&
      inicioMes.month === hoy.month;

    const esMesFuturo =
      inicioMes.toMillis() >
      hoy.startOf('month').toMillis();

    let ultimoDiaAnalizar: DateTime | null;

    if (esMesFuturo) {
      ultimoDiaAnalizar = null;
    } else if (esMesActual) {
      ultimoDiaAnalizar = hoy;
    } else {
      ultimoDiaAnalizar = finMes.minus({
        days: 1,
      });
    }

    // ----------------------------------------------------------
    // CONSULTAR VENTAS DEL MES
    // ----------------------------------------------------------

    const ventas = await this.prisma.venta.findMany({
      where: {
        tipo_empleado: TipoEmpleado.AGENTE,

        fecha_tramitacion: {
          gte: fechaLimaParaBD(inicioMes),
          lt: fechaLimaParaBD(finMes),
        },
      },

      select: {
        fecha_lima: true,
      },
    });

    // ----------------------------------------------------------
    // CREAR DÍAS HÁBILES DEL MES
    // ----------------------------------------------------------

    const ventasPorDia = new Map<string, number>();

    const detalleBase: {
      fecha: string;
      dia: string;
      cantidad: number;
    }[] = [];

    if (ultimoDiaAnalizar) {
      let cursor = inicioMes.startOf('day');

      while (
        cursor.toMillis() <=
        ultimoDiaAnalizar.toMillis()
      ) {
        // Luxon:
        // 1 = lunes
        // 2 = martes
        // ...
        // 6 = sábado
        // 7 = domingo

        const esDiaHabil =
          cursor.weekday >= 1 &&
          cursor.weekday <= 5;

        if (esDiaHabil) {
          const fechaDia = cursor.toISODate();

          if (fechaDia) {
            ventasPorDia.set(
              fechaDia,
              0,
            );

            detalleBase.push({
              fecha: fechaDia,

              dia: this.capitalizar(
                cursor
                  .setLocale('es')
                  .toFormat('cccc'),
              ),

              cantidad: 0,
            });
          }
        }

        cursor = cursor.plus({
          days: 1,
        });
      }
    }

    // ----------------------------------------------------------
    // CLASIFICAR VENTAS POR DÍA
    // ----------------------------------------------------------

    for (const venta of ventas) {
      if (!venta.fecha_lima) {
        continue;
      }

      const fechaVenta =
        fechaBDComoLima(
          venta.fecha_lima,
        );

      if (!fechaVenta.isValid) {
        continue;
      }

      // Ignorar sábado y domingo
      if (
        fechaVenta.weekday === 6 ||
        fechaVenta.weekday === 7
      ) {
        continue;
      }

      const fechaDia =
        fechaVenta.toISODate();

      if (!fechaDia) {
        continue;
      }

      // Evita contar fechas futuras
      // cuando se consulta el mes actual.
      if (!ventasPorDia.has(fechaDia)) {
        continue;
      }

      ventasPorDia.set(
        fechaDia,
        (ventasPorDia.get(fechaDia) ?? 0) + 1,
      );
    }

    // ----------------------------------------------------------
    // ARMAR DETALLE
    // ----------------------------------------------------------

    const detalle = detalleBase.map(
      (dia) => ({
        ...dia,

        cantidad:
          ventasPorDia.get(
            dia.fecha,
          ) ?? 0,
      }),
    );

    // ----------------------------------------------------------
    // TOTAL DE VENTAS
    // ----------------------------------------------------------

    const totalVentas = detalle.reduce(
      (total, dia) =>
        total + dia.cantidad,
      0,
    );

    // ----------------------------------------------------------
    // DÍAS HÁBILES
    // ----------------------------------------------------------

    const totalDiasHabiles =
      detalle.length;

    const diasConVentas =
      detalle.filter(
        (dia) =>
          dia.cantidad > 0,
      ).length;

    const diasSinVentas =
      detalle.filter(
        (dia) =>
          dia.cantidad === 0,
      ).length;

    // ----------------------------------------------------------
    // PROMEDIO
    // ----------------------------------------------------------

    const promedio =
      totalDiasHabiles > 0
        ? Number(
            (
              totalVentas /
              totalDiasHabiles
            ).toFixed(2),
          )
        : 0;

    // ----------------------------------------------------------
    // DÍA CON MÁS VENTAS
    // ----------------------------------------------------------

    let diaMasVentas:
      | (typeof detalle)[number]
      | null = null;

    // ----------------------------------------------------------
    // DÍA CON MENOS VENTAS
    // ----------------------------------------------------------

    let diaMenosVentas:
      | (typeof detalle)[number]
      | null = null;

    for (const dia of detalle) {
      if (
        !diaMasVentas ||
        dia.cantidad >
          diaMasVentas.cantidad
      ) {
        diaMasVentas = dia;
      }

      if (
        !diaMenosVentas ||
        dia.cantidad <
          diaMenosVentas.cantidad
      ) {
        diaMenosVentas = dia;
      }
    }

    // ----------------------------------------------------------
    // RESPUESTA
    // ----------------------------------------------------------

    return {
      periodo: {
        anio: inicioMes.year,
        mes: inicioMes.month,

        nombre_mes: this.capitalizar(
          inicioMes
            .setLocale('es')
            .toFormat('LLLL'),
        ),

        fecha_inicio:
          inicioMes.toISODate(),

        fecha_fin:
          ultimoDiaAnalizar?.toISODate() ??
          null,

        zona_horaria: ZONA_LIMA,
      },

      resumen: {
        total_ventas:
          totalVentas,

        promedio_diario:
          promedio,

        dias_habiles:
          totalDiasHabiles,

        dias_con_ventas:
          diasConVentas,

        dias_sin_ventas:
          diasSinVentas,

        dia_mas_ventas:
          diaMasVentas,

        dia_menos_ventas:
          diaMenosVentas,
      },

      detalle,
    };
  }

  private capitalizar(
    texto: string,
  ): string {
    if (!texto) {
      return texto;
    }
  
    return (
      texto.charAt(0).toUpperCase() +
      texto.slice(1)
    );
  }
}