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
}