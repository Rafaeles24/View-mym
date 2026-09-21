import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ConfigRanking,
  ModoRanking,
} from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from 'src/prisma/prisma.service';
import { RealtimeGateway } from 'src/realtime/realtime.gateway';

import type {
  ActualizarConfigRankingInput,
} from './types/ConfigRankingInput.type';
import { RankingCountdown } from 'src/realtime/types/ranking-countdown.type';
import { RankingConfigSync } from './types/ranking-config-sync.type';

@Injectable()
export class ConfigRankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeGateway,
  ) {}

  private readonly configId = 1;
  private readonly zona = 'America/Lima';

  private ahora(): DateTime {
    return DateTime.now().setZone(this.zona);
  }

  private fechaLimaParaBD(
    fecha: DateTime,
  ): Date {

    const local =
      fecha.setZone(this.zona);

    if (!local.isValid) {
      throw new InternalServerErrorException(
        'No se pudo convertir la fecha Lima para la base de datos',
      );
    }

    return local
      .setZone(
        'UTC',
        {
          keepLocalTime: true,
        },
      )
      .toJSDate();
  }

  private fechaBDALima(
    fecha: Date,
  ): DateTime {

    return DateTime
      .fromJSDate(
        fecha,
        {
          zone: 'UTC',
        },
      )
      .setZone(
        this.zona,
        {
          keepLocalTime: true,
        },
      );
  }

  private calcularDefault(
    referencia: DateTime,
    siguienteSiEsFinDeSemana: boolean,
  ): {
    fecha_inicio: Date;
    fecha_fin: Date;
  } {

    const referenciaLima =
      referencia.setZone(this.zona);

    let lunes =
      referenciaLima
        .startOf('day')
        .minus({
          days:
            referenciaLima.weekday - 1,
        });

    if (
      siguienteSiEsFinDeSemana &&
      referenciaLima.weekday >= 6
    ) {
      lunes =
        lunes.plus({
          weeks: 1,
        });
    }

    const corte =
      lunes.plus({
        days: 5,
      });

    return {
      fecha_inicio:
        this.fechaLimaParaBD(
          lunes,
        ),

      fecha_fin:
        this.fechaLimaParaBD(
          corte,
        ),
    };
  }

  private async leerOCrear(): Promise<ConfigRanking> {

    const existente =
      await this.prisma.configRanking.findUnique({
        where: {
          id: this.configId,
        },
      });

    if (existente) {
      return existente;
    }

    const rango =
      this.calcularDefault(
        this.ahora(),
        true,
      );

    return this.prisma.configRanking.create({
      data: {
        id:
          this.configId,

        modo:
          ModoRanking.DEFAULT,

        fecha_inicio:
          rango.fecha_inicio,

        fecha_fin:
          rango.fecha_fin,

        zona_horaria:
          this.zona,
      },
    });
  }

  private notificarCambio(config: ConfigRanking): void {
    const schedule = this.crearRespuesta(config);

    this.rt.emitSyncConfigRankingEvent(schedule);
    this.rt.emitRankingRefresh();
  }

  async renovarSiCorresponde(): Promise<ConfigRanking> {
    for (let intento = 0; intento < 5; intento++) {
      const config = await this.leerOCrear();
      const ahora = this.ahora();

      let nuevoRango:
        | {
            fecha_inicio: Date;
            fecha_fin: Date;
          }
        | undefined;

      if (config.modo === ModoRanking.PERSONALIZADO) {
        const finGuardado =
          this.fechaBDALima(
            config.fecha_fin,
          );
        
        const vencido =
          ahora.toMillis() >=
          finGuardado.toMillis();

        if (!vencido) {
          return config;
        }

        nuevoRango = this.calcularDefault(ahora, true);
      } else {
        const inicioGuardado =
          this.fechaBDALima(
            config.fecha_inicio,
          );

        const siguienteLunes = inicioGuardado
          .startOf('day')
          .minus({ days: inicioGuardado.weekday - 1 })
          .plus({ weeks: 1 });

        if (ahora.toMillis() < siguienteLunes.toMillis()) {
          return config;
        }

        nuevoRango = this.calcularDefault(ahora, false);
      }

      const resultado =
        await this.prisma.configRanking.updateMany({
          where: {
            id: this.configId,
            modo: config.modo,
            fecha_inicio: config.fecha_inicio,
            fecha_fin: config.fecha_fin,
            zona_horaria: config.zona_horaria,
            updateAt: config.updateAt,
          },
        
          data: {
            modo: ModoRanking.DEFAULT,
            ...nuevoRango,
            zona_horaria: this.zona,
          },
        });
      
      if (resultado.count === 1) {
        const configActualizada =
          await this.prisma.configRanking.findUniqueOrThrow({
            where: {
              id: this.configId,
            },
          });
        
        this.notificarCambio(
          configActualizada
        );
      
        return configActualizada;
      }
    }

    throw new ConflictException(
      'La configuración cambió simultáneamente. Reintenta la consulta.',
    );
  }

  async obtener() {
    const config = await this.renovarSiCorresponde();

    return this.crearRespuesta(config);
  }

  /**
   * Devuelve DateTime para conservar fechaParaBD()
   * en el VisorService que ya tienes.
   */
  async obtenerRangoVigente() {

    const config =
      await this.renovarSiCorresponde();

    return {
      config,

      inicio:
        this.fechaBDALima(
          config.fecha_inicio,
        ),

      fin:
        this.fechaBDALima(
          config.fecha_fin,
        ),
    };
  }

  async actualizar(input: ActualizarConfigRankingInput) {
    if (
      !input ||
      typeof input !== 'object' ||
      Array.isArray(input)
    ) {
      throw new BadRequestException(
        'Debes enviar fecha_inicio y fecha_fin',
      );
    }

    const inicio = this.convertirFechaLocal(
      input.fecha_inicio,
      'fecha_inicio',
    );

    const ultimoMinuto = this.convertirFechaLocal(
      input.fecha_fin,
      'fecha_fin',
    );

    const corte = ultimoMinuto.plus({ minutes: 1 });

    if (
      !corte.isValid ||
      corte.year > 9999 ||
      corte.toMillis() <= inicio.toMillis()
    ) {
      throw new BadRequestException(
        'El rango de fechas no es válido',
      );
    }

    if (corte.toMillis() <= this.ahora().toMillis()) {
      throw new BadRequestException(
        'El rango personalizado ya terminó',
      );
    }

    const datos = {
      modo:
        ModoRanking.PERSONALIZADO,
    
      fecha_inicio:
        this.fechaLimaParaBD(
          inicio,
        ),
      
      fecha_fin:
        this.fechaLimaParaBD(
          corte,
        ),
      
      zona_horaria:
        this.zona,
    };

    const config = await this.prisma.configRanking.upsert({
      where: { id: this.configId },
      create: {
        id: this.configId,
        ...datos,
      },
      update: datos,
    });

    this.notificarCambio(config);

    return this.crearRespuesta(config);
  }

  private convertirFechaLocal(
    valor: string,
    campo: string,
  ): DateTime {
    if (
      typeof valor !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)
    ) {
      throw new BadRequestException(
        `${campo} debe tener formato YYYY-MM-DDTHH:mm`,
      );
    }

    const fecha = DateTime.fromISO(valor, {
      zone: this.zona,
    });

    if (
      !fecha.isValid ||
      fecha.year < 1000 ||
      fecha.year > 9999 ||
      fecha.toFormat("yyyy-MM-dd'T'HH:mm") !== valor
    ) {
      throw new BadRequestException(
        `${campo} no es una fecha válida`,
      );
    }

    return fecha;
  }

  private crearRespuesta(
    config: ConfigRanking
  ): RankingConfigSync {
    const inicio =
      this.fechaBDALima(
        config.fecha_inicio,
      );
    
    const corte =
      this.fechaBDALima(
        config.fecha_fin,
      );

    if (!inicio.isValid || !corte.isValid) {
      throw new InternalServerErrorException(
        "La configuración del ranking contiene fechas inválidas"
      );
    }

    const fechaInicio = inicio.toISO();

    const fechaCorte = corte.toISO();

    const fechaFin = corte
      .minus({ milliseconds: 1 })
      .toISO();

    if (
      fechaInicio === null ||
      fechaFin === null ||
      fechaCorte === null
    ) {
      throw new InternalServerErrorException(
        "No se pudieron serializar las fechas del ranking"
      );
    }

    return {
      id: config.id,
      modo: config.modo,

      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      fecha_corte: fechaCorte,

      zona_horaria: config.zona_horaria,

      hora_inicio_actualizacion:
        config.hora_inicio_actualizacion,

      hora_fin_actualizacion:
        config.hora_fin_actualizacion,

      intervalo_actualizacion:
        config.intervalo_actualizacion,

      ultima_actualizacion:
        config.ultima_actualizacion?.toISOString() ??
        null,

      proxima_actualizacion:
        config.proxima_actualizacion?.toISOString() ??
        null,

      updateAt: config.updateAt,
    };
  }

  private validarProgramacion(config: {
    intervalo_actualizacion: number;
  }): void {

    if (
      !Number.isInteger(config.intervalo_actualizacion) ||
      config.intervalo_actualizacion < 1 ||
      config.intervalo_actualizacion > 1440
    ) {
      throw new BadRequestException(
        'intervalo_actualizacion debe ser un entero entre 1 y 1440 minutos',
      );
    }
  }

  /**
   * Calcula el siguiente punto de la secuencia diaria:
   * apertura + múltiplos del intervalo + cierre obligatorio.
   *
   * incluirReferencia:
   * true  -> permite devolver el instante consultado.
   * false -> devuelve un instante estrictamente posterior.
   */
  siguienteActualizacionRanking(
    referencia: DateTime,
    config: Pick<
      ConfigRanking,
      | 'intervalo_actualizacion'
      | 'zona_horaria'
    >,
    incluirReferencia = false,
  ): DateTime {

    const intervalo =
      config.intervalo_actualizacion;

    if (
      !Number.isInteger(intervalo) ||
      intervalo <= 0
    ) {
      throw new BadRequestException(
        'intervalo_actualizacion debe ser un entero positivo',
      );
    }

    const local =
      referencia.setZone(
        config.zona_horaria,
      );

    if (!local.isValid) {
      throw new BadRequestException(
        'Fecha o zona horaria inválida',
      );
    }

    /*
     * Todos los horarios se anclan
     * desde las 00:00 del día.
     *
     * Ejemplo con intervalo 60:
     *
     * 00:00
     * 01:00
     * 02:00
     * ...
     *
     * Ejemplo con intervalo 15:
     *
     * 00:00
     * 00:15
     * 00:30
     * 00:45
     */
    const inicioDia =
      local.startOf('day');

    const minutosDesdeMedianoche =
      local.diff(
        inicioDia,
        'minutes',
      ).minutes;

    let posicion: number;

    if (incluirReferencia) {

      posicion =
        Math.ceil(
          minutosDesdeMedianoche /
          intervalo,
        );

    } else {

      posicion =
        Math.floor(
          minutosDesdeMedianoche /
          intervalo,
        ) + 1;
    }

    let siguiente =
      inicioDia.plus({
        minutes:
          posicion * intervalo,
      });

    /*
     * Protección:
     *
     * si incluirReferencia = false,
     * nunca devolver el instante actual.
     */
    if (
      !incluirReferencia &&
      siguiente.toMillis() <=
        local.toMillis()
    ) {

      siguiente =
        siguiente.plus({
          minutes: intervalo,
        });
    }

    return siguiente;
  }

  async obtenerProgramacion(): Promise<ConfigRanking> {
    const config = await this.leerOCrear();

    if (config.proxima_actualizacion) {
      return config;
    }

    const proxima = this.siguienteActualizacionRanking(
      DateTime.now(),
      config,
      true,
    );

    await this.prisma.configRanking.updateMany({
      where: {
        id: config.id,
        proxima_actualizacion: null,
        hora_inicio_actualizacion:
          config.hora_inicio_actualizacion,
        hora_fin_actualizacion:
          config.hora_fin_actualizacion,
        intervalo_actualizacion:
          config.intervalo_actualizacion,
        zona_horaria: config.zona_horaria,
      },
      data: {
        proxima_actualizacion: proxima.toUTC().toJSDate(),
      },
    });

    return this.prisma.configRanking.findUniqueOrThrow({
      where: { id: config.id },
    });
  }

  async actualizarProgramacion(input: {
    intervalo_actualizacion: number;
  }) {
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input)
    ) {
      throw new BadRequestException(
        "Debes enviar las horas y el intervalo de actualización"
      );
    }

    this.validarProgramacion(input);

    const actual = await this.leerOCrear();

    const datos = {
      intervalo_actualizacion:
        input.intervalo_actualizacion,
    };

    const proxima =
      this.siguienteActualizacionRanking(
        DateTime.now(),
        {
          ...datos,
          zona_horaria: actual.zona_horaria,
        },
        true
      );

    const config =
      await this.prisma.configRanking.update({
        where: {
          id: this.configId,
        },
        data: {
          ...datos,
          proxima_actualizacion:
            proxima.toUTC().toJSDate(),
        },
      });

    // Envía la configuración nueva al navegador.
    this.rt.emitSyncConfigRankingEvent(
      this.crearRespuesta(config)
    );

    return this.crearRespuesta(config);
  }

  // Mantiene compatibilidad con el endpoint anterior,
  // si todavía lo utilizas para cambiar solo el intervalo.
  async actualizarIntervalo(minutos: number) {

    return this.actualizarProgramacion({
      intervalo_actualizacion: minutos,
    });
  }

  async obtenerCuentaRegresiva(): Promise<RankingCountdown> {
    const config = await this.obtenerProgramacion();
    const ahora = DateTime.now();

    const segundosRestantes = config.proxima_actualizacion
      ? Math.max(
          0,
          Math.ceil(
            (
              config.proxima_actualizacion.getTime() -
              ahora.toMillis()
            ) / 1000,
          ),
        )
      : null;

    let cuentaRegresiva: string | null = null;

    if (segundosRestantes !== null) {
      // Minutos totales: también permite contar hasta el lunes.
      const minutos = Math.floor(segundosRestantes / 60);
      const segundos = segundosRestantes % 60;

      cuentaRegresiva =
        `${String(minutos).padStart(2, '0')}:` +
        `${String(segundos).padStart(2, '0')}`;
    }

    return {
      estado: this.estadoActualizacion,
      
      hora_inicio_actualizacion:
        config.hora_inicio_actualizacion,

      hora_fin_actualizacion:
        config.hora_fin_actualizacion,

      intervalo_actualizacion:
        config.intervalo_actualizacion,

      zona_horaria: config.zona_horaria,
      hora_servidor: ahora.toUTC().toJSDate().toISOString(),

      ultima_actualizacion:
        config.ultima_actualizacion?.toISOString() ?? null,

      proxima_actualizacion:
        config.proxima_actualizacion?.toISOString() ?? null,

      segundos_restantes: segundosRestantes,

      // Minutos completos pendientes, redondeados hacia arriba.
      minutos_restantes: segundosRestantes === null
        ? null
        : Math.ceil(segundosRestantes / 60),

      cuenta_regresiva: cuentaRegresiva,
    };
  }

  private estadoActualizacion: | "EN_ESPERA" | "SINCRONIZANDO" | "ERROR" = "EN_ESPERA";

  establecerEstadoActualizacion(
    estado: "EN_ESPERA" | "SINCRONIZANDO" | "ERROR"
  ): void {
    this.estadoActualizacion = estado;
  }
} 