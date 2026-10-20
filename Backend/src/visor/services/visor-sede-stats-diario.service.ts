import { Injectable } from "@nestjs/common";
import { TipoEmpleado } from "@prisma/client";
import { DateTime } from "luxon";
import { PrismaService } from "src/prisma/prisma.service";
import { fechaLimaParaBD } from "../helpers/visor-fecha.helper";

@Injectable()
export class VisorSedeStatsDiarioService {
  constructor(
    private readonly prisma: PrismaService
  ) {}

  private obtenerPeriodoDiario(): {
    inicio: DateTime;
    fin: DateTime;
  } {
    const inicio = DateTime.now().setZone('America/Lima').startOf('day');

    return {
      inicio,
      fin: inicio.plus({ days: 1 })
    }
  }

  private async obtenerStatsDiarioPorSede(
    tipoEmpleado: TipoEmpleado,
    inicio: DateTime,
    fin: DateTime
  ) {
    const [ ventas, sedes ] = await Promise.all([
      this.prisma.venta.findMany({
        where: {
          tipo_empleado: tipoEmpleado,
          fecha_tramitacion: {
            gte: fechaLimaParaBD(inicio),
            lt: fechaLimaParaBD(fin)
          }
        },
        select: {
          id: true,
          sede_id: true,
          fecha_lima: true
        }
      }),

      this.prisma.sede.findMany({
        select: {
          id: true,
          nombre: true,
        }
      }),
    ]);
  
    const nombres = new Map(sedes.map((sede) => [
      sede.id,
      sede.nombre
    ]));

    const resultados = new Map< number | null, {
      sede_id: number | null;
      sede: string;
      cantidad: number;
      primeraVenta: number;
      primerId: number
    }>();

    let totalVentas = 0;

    for ( const venta of ventas) {
      const nombre = venta.sede_id === null ? undefined : nombres.get(venta.sede_id);
      
      const sinSede = !nombre?.trim() || nombre.trim().toUpperCase() === 'BACKOFFICE';

      const sedeId = sinSede ? null : venta.sede_id;

      const sedeNombre = sinSede ? 'VENTA SIN SEDE' : nombre!;

      const fechaVenta = venta.fecha_lima ? venta.fecha_lima.getTime() : Number.MAX_SAFE_INTEGER;
    
      totalVentas++;

      const acumulado = resultados.get(sedeId);

      if (!acumulado) {
        resultados.set(
          sedeId,
          {
            sede_id: sedeId,
            sede: sedeNombre,
            cantidad: 1,
            primeraVenta: fechaVenta,
            primerId: venta.id
          }
        );

        continue;
      }

      acumulado.cantidad++;

      if (fechaVenta < acumulado.primeraVenta || 
        (fechaVenta === acumulado.primeraVenta && venta.id < acumulado.primerId)
      ) {
        acumulado.primeraVenta = fechaVenta;
        acumulado.primerId = venta.id;
      } 
    }

    const ordenados = [
      ...resultados.values(),
    ].sort((a, b) => b.cantidad - a.cantidad || 
      a.primeraVenta - b.primeraVenta ||
      a.primerId - b.primerId ||
      a.sede.localeCompare(b.sede, 'es')
    )

    return {
      periodo: 'DIARIO',
      total_ventas: totalVentas,
      sedes: ordenados.map(({
        primeraVenta,
        primerId,
        ...sede
      }, index) => ({
        puesto: index + 1,
        ...sede,
        sede: sede.sede === 'TOMAS VALLE' ? 'TOMAS V.': sede.sede
      }))
    }
  }

  async statDiarioPorSede(
    tipoEmpleado: TipoEmpleado = TipoEmpleado.AGENTE
  ) {
    const {inicio, fin} = this.obtenerPeriodoDiario();

    return this.obtenerStatsDiarioPorSede(
      tipoEmpleado,
      inicio,
      fin
    );
  }
}