import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import {
  ConfigVersus,
  ModoRanking,
} from '@prisma/client';

import {
  DateTime,
} from 'luxon';

import {
  PrismaService,
} from 'src/prisma/prisma.service';

import {
  VersusGateway,
} from 'src/realtime/gateways/versus.gateway';

import {
  VersusConfigSync,
} from './types/versus-config-sync.type';

import {
  VersusCountdown,
} from './types/versus-countdown.type';
import { ActualizarConfigVersusInput } from './types/config-versus-input.type';

@Injectable()
export class VersusConfigService {
  constructor(
    private readonly prisma:
      PrismaService,

    private readonly versusGateway:
      VersusGateway,
  ) {}

  private readonly configId = 1;

  private readonly zona =
    'America/Lima';

  private estadoActualizacion:
    | 'EN_ESPERA'
    | 'SINCRONIZANDO'
    | 'ERROR' =
    'EN_ESPERA';

  // ==========================================
  // FECHA ACTUAL
  // ==========================================

  private ahora(): DateTime {
    return DateTime
      .now()
      .setZone(this.zona);
  }

  // ==========================================
  // LIMA -> BD
  // ==========================================

  private fechaLimaParaBD(
    fecha: DateTime,
  ): Date {
    const local =
      fecha.setZone(
        this.zona,
      );

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

  // ==========================================
  // BD -> LIMA
  // ==========================================

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

  // ==========================================
  // RANGO DEFAULT SEMANAL
  // ==========================================
  //
  // Lunes 00:00
  // ->
  // Sábado 00:00 exclusivo
  //
  // Visualmente:
  // Lunes 00:00
  // ->
  // Viernes 23:59:59.999
  //
  // ==========================================

  private calcularDefault(
    referencia: DateTime,
    siguienteSiEsFinDeSemana:
      boolean,
  ): {
    fecha_inicio: Date;
    fecha_fin: Date;
  } {
    const referenciaLima =
      referencia.setZone(
        this.zona,
      );

    let lunes =
      referenciaLima
        .startOf('day')
        .minus({
          days:
            referenciaLima.weekday -
            1,
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

  // ==========================================
  // LEER O CREAR
  // ==========================================

  private async leerOCrear():
    Promise<ConfigVersus> {
    const existente =
      await this.prisma
        .configVersus
        .findUnique({
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

    return this.prisma
      .configVersus
      .create({
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

  // ==========================================
  // NOTIFICAR CAMBIO
  // ==========================================

  private notificarCambio(
    config: ConfigVersus,
  ): void {
    const schedule =
      this.crearRespuesta(
        config,
      );

    console.log(
      '[CONFIG-VERSUS SERVICE] Notificando cambio en configuración VS',
      schedule,
    );

    this.versusGateway
      .emitSyncConfigVersusEvent(
        schedule,
      );

    this.versusGateway
      .emitVersusRefresh();
  }

  // ==========================================
  // RENOVAR RANGO
  // ==========================================

  async renovarSiCorresponde():
    Promise<ConfigVersus> {
    for (
      let intento = 0;
      intento < 5;
      intento++
    ) {
      const config =
        await this.leerOCrear();

      const ahora =
        this.ahora();

      let nuevoRango:
        | {
            fecha_inicio: Date;
            fecha_fin: Date;
          }
        | undefined;

      // --------------------------------------
      // PERSONALIZADO
      // --------------------------------------

      if (
        config.modo ===
        ModoRanking.PERSONALIZADO
      ) {
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

        nuevoRango =
          this.calcularDefault(
            ahora,
            true,
          );
      }

      // --------------------------------------
      // DEFAULT
      // --------------------------------------

      else {
        const inicioGuardado =
          this.fechaBDALima(
            config.fecha_inicio,
          );

        const siguienteLunes =
          inicioGuardado
            .startOf('day')
            .minus({
              days:
                inicioGuardado
                  .weekday - 1,
            })
            .plus({
              weeks: 1,
            });

        if (
          ahora.toMillis() <
          siguienteLunes.toMillis()
        ) {
          return config;
        }

        nuevoRango =
          this.calcularDefault(
            ahora,
            false,
          );
      }

      // --------------------------------------
      // UPDATE OPTIMISTA
      // --------------------------------------

      const resultado =
        await this.prisma
          .configVersus
          .updateMany({
            where: {
              id:
                this.configId,

              modo:
                config.modo,

              fecha_inicio:
                config.fecha_inicio,

              fecha_fin:
                config.fecha_fin,

              zona_horaria:
                config.zona_horaria,

              updateAt:
                config.updateAt,
            },

            data: {
              modo:
                ModoRanking.DEFAULT,

              ...nuevoRango,

              zona_horaria:
                this.zona,
            },
          });

      if (
        resultado.count === 1
      ) {
        const actualizado =
          await this.prisma
            .configVersus
            .findUniqueOrThrow({
              where: {
                id:
                  this.configId,
              },
            });

        this.notificarCambio(
          actualizado,
        );

        return actualizado;
      }
    }

    throw new ConflictException(
      'La configuración VS cambió simultáneamente. Reintenta la consulta.',
    );
  }

  // ==========================================
  // OBTENER
  // ==========================================

  async obtener() {
    const config =
      await this
        .renovarSiCorresponde();

    return this.crearRespuesta(
      config,
    );
  }

  // ==========================================
  // RANGO VIGENTE
  // ==========================================

  async obtenerRangoVigente() {
    const config =
      await this
        .renovarSiCorresponde();

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

  // ==========================================
  // ACTUALIZAR RANGO
  // ==========================================

  async actualizar(
    input:
      ActualizarConfigVersusInput,
  ) {
    if (
      !input ||
      typeof input !==
        'object' ||
      Array.isArray(input)
    ) {
      throw new BadRequestException(
        'Debes enviar fecha_inicio y fecha_fin',
      );
    }

    const inicio =
      this.convertirFechaLocal(
        input.fecha_inicio,
        'fecha_inicio',
      );

    const ultimoMinuto =
      this.convertirFechaLocal(
        input.fecha_fin,
        'fecha_fin',
      );

    /*
     * Fecha fin se guarda
     * como corte exclusivo.
     *
     * Si mandas:
     * 2026-10-30T23:59
     *
     * se guarda:
     * 2026-10-31T00:00
     */
    const corte =
      ultimoMinuto.plus({
        minutes: 1,
      });

    if (
      !corte.isValid ||
      corte.year > 9999 ||
      corte.toMillis() <=
        inicio.toMillis()
    ) {
      throw new BadRequestException(
        'El rango de fechas VS no es válido',
      );
    }

    if (
      corte.toMillis() <=
      this.ahora().toMillis()
    ) {
      throw new BadRequestException(
        'El rango personalizado VS ya terminó',
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

    const config =
      await this.prisma
        .configVersus
        .upsert({
          where: {
            id:
              this.configId,
          },

          create: {
            id:
              this.configId,

            ...datos,
          },

          update:
            datos,
        });

    this.notificarCambio(
      config,
    );

    return this.crearRespuesta(
      config,
    );
  }

  // ==========================================
  // CONVERTIR FECHA INPUT
  // ==========================================

  private convertirFechaLocal(
    valor: string,
    campo: string,
  ): DateTime {
    if (
      typeof valor !==
        'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(
        valor,
      )
    ) {
      throw new BadRequestException(
        `${campo} debe tener formato YYYY-MM-DDTHH:mm`,
      );
    }

    const fecha =
      DateTime.fromISO(
        valor,
        {
          zone:
            this.zona,
        },
      );

    if (
      !fecha.isValid ||
      fecha.year < 1000 ||
      fecha.year > 9999 ||
      fecha.toFormat(
        "yyyy-MM-dd'T'HH:mm",
      ) !== valor
    ) {
      throw new BadRequestException(
        `${campo} no es una fecha válida`,
      );
    }

    return fecha;
  }

  // ==========================================
  // CREAR RESPUESTA
  // ==========================================

  private crearRespuesta(
    config: ConfigVersus,
  ): VersusConfigSync {
    const inicio =
      this.fechaBDALima(
        config.fecha_inicio,
      );

    const corte =
      this.fechaBDALima(
        config.fecha_fin,
      );

    if (
      !inicio.isValid ||
      !corte.isValid
    ) {
      throw new InternalServerErrorException(
        'La configuración VS contiene fechas inválidas',
      );
    }

    const fechaInicio =
      inicio.toISO();

    const fechaCorte =
      corte.toISO();

    const fechaFin =
      corte
        .minus({
          milliseconds: 1,
        })
        .toISO();

    if (
      fechaInicio === null ||
      fechaFin === null ||
      fechaCorte === null
    ) {
      throw new InternalServerErrorException(
        'No se pudieron serializar las fechas VS',
      );
    }

    return {
      id:
        config.id,

      modo:
        config.modo,

      fecha_inicio:
        fechaInicio,

      fecha_fin:
        fechaFin,

      fecha_corte:
        fechaCorte,

      zona_horaria:
        config.zona_horaria,

      hora_inicio_actualizacion:
        config
          .hora_inicio_actualizacion,

      hora_fin_actualizacion:
        config
          .hora_fin_actualizacion,

      intervalo_actualizacion:
        config
          .intervalo_actualizacion,

      ultima_actualizacion:
        config
          .ultima_actualizacion
          ?.toISOString() ??
        null,

      proxima_actualizacion:
        config
          .proxima_actualizacion
          ?.toISOString() ??
        null,

      updateAt:
        config.updateAt,
    };
  }

  // ==========================================
  // VALIDAR PROGRAMACION
  // ==========================================

  private validarProgramacion(
    config: {
      intervalo_actualizacion:
        number;
    },
  ): void {
    if (
      !Number.isInteger(
        config
          .intervalo_actualizacion,
      ) ||
      config
        .intervalo_actualizacion <
        1 ||
      config
        .intervalo_actualizacion >
        1440
    ) {
      throw new BadRequestException(
        'intervalo_actualizacion debe ser un entero entre 1 y 1440 minutos',
      );
    }
  }

  // ==========================================
  // SIGUIENTE ACTUALIZACION
  // ==========================================

  siguienteActualizacionVersus(
    referencia: DateTime,

    config: Pick<
      ConfigVersus,
      | 'intervalo_actualizacion'
      | 'zona_horaria'
    >,

    incluirReferencia =
      false,
  ): DateTime {
    const intervalo =
      config
        .intervalo_actualizacion;

    if (
      !Number.isInteger(
        intervalo,
      ) ||
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

    const inicioDia =
      local.startOf(
        'day',
      );

    const minutosDesdeMedianoche =
      local.diff(
        inicioDia,
        'minutes',
      ).minutes;

    let posicion:
      number;

    if (
      incluirReferencia
    ) {
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
          posicion *
          intervalo,
      });

    if (
      !incluirReferencia &&
      siguiente.toMillis() <=
        local.toMillis()
    ) {
      siguiente =
        siguiente.plus({
          minutes:
            intervalo,
        });
    }

    return siguiente;
  }

  // ==========================================
  // OBTENER PROGRAMACION
  // ==========================================

  async obtenerProgramacion():
    Promise<ConfigVersus> {
    const config =
      await this.leerOCrear();

    if (
      config
        .proxima_actualizacion
    ) {
      return config;
    }

    const proxima =
      this.siguienteActualizacionVersus(
        DateTime.now(),
        config,
        true,
      );

    await this.prisma
      .configVersus
      .updateMany({
        where: {
          id:
            config.id,

          proxima_actualizacion:
            null,

          hora_inicio_actualizacion:
            config
              .hora_inicio_actualizacion,

          hora_fin_actualizacion:
            config
              .hora_fin_actualizacion,

          intervalo_actualizacion:
            config
              .intervalo_actualizacion,

          zona_horaria:
            config
              .zona_horaria,
        },

        data: {
          proxima_actualizacion:
            proxima
              .toUTC()
              .toJSDate(),
        },
      });

    return this.prisma
      .configVersus
      .findUniqueOrThrow({
        where: {
          id:
            config.id,
        },
      });
  }

  // ==========================================
  // ACTUALIZAR PROGRAMACION
  // ==========================================

  async actualizarProgramacion(
    input: {
      intervalo_actualizacion:
        number;
    },
  ) {
    if (
      !input ||
      typeof input !==
        'object' ||
      Array.isArray(
        input,
      )
    ) {
      throw new BadRequestException(
        'Debes enviar el intervalo de actualización VS',
      );
    }

    this.validarProgramacion(
      input,
    );

    const actual =
      await this.leerOCrear();

    const proxima =
      this.siguienteActualizacionVersus(
        DateTime.now(),

        {
          intervalo_actualizacion:
            input
              .intervalo_actualizacion,

          zona_horaria:
            actual
              .zona_horaria,
        },

        true,
      );

    const config =
      await this.prisma
        .configVersus
        .update({
          where: {
            id:
              this.configId,
          },

          data: {
            intervalo_actualizacion:
              input
                .intervalo_actualizacion,

            proxima_actualizacion:
              proxima
                .toUTC()
                .toJSDate(),
          },
        });

    this.notificarCambio(
      config,
    );

    return this.crearRespuesta(
      config,
    );
  }

  // ==========================================
  // ACTUALIZAR INTERVALO
  // ==========================================

  async actualizarIntervalo(
    minutos: number,
  ) {
    return this
      .actualizarProgramacion({
        intervalo_actualizacion:
          minutos,
      });
  }

  async registrarActualizacion():
    Promise<ConfigVersus> {
    
    const config =
      await this.obtenerProgramacion();
    
    const ahora =
      DateTime.now()
        .setZone(
          config.zona_horaria,
        );
      
    const siguiente =
      this.siguienteActualizacionVersus(
        ahora,
        config,
        false,
      );
    
    const actualizado =
      await this.prisma
        .configVersus
        .update({
          where: {
            id: config.id,
          },
        
          data: {
            ultima_actualizacion:
              ahora
                .toUTC()
                .toJSDate(),
          
            proxima_actualizacion:
              siguiente
                .toUTC()
                .toJSDate(),
          },
        });
      
    /*
     * Actualizamos inmediatamente
     * la configuración del frontend.
     */
    this.versusGateway
      .emitSyncConfigVersusEvent(
        this.crearRespuesta(
          actualizado,
        ),
      );
    
    return actualizado;
  } 

  // ==========================================
  // COUNTDOWN
  // ==========================================

  async obtenerCuentaRegresiva():
    Promise<VersusCountdown> {
    const config =
      await this
        .obtenerProgramacion();

    const ahora =
      DateTime.now();

    const segundosRestantes =
      config
        .proxima_actualizacion
        ? Math.max(
            0,
            Math.ceil(
              (
                config
                  .proxima_actualizacion
                  .getTime() -
                ahora.toMillis()
              ) /
                1000,
            ),
          )
        : null;

    let cuentaRegresiva:
      | string
      | null =
      null;

    if (
      segundosRestantes !==
      null
    ) {
      const minutos =
        Math.floor(
          segundosRestantes /
            60,
        );

      const segundos =
        segundosRestantes %
        60;

      cuentaRegresiva =
        `${String(
          minutos,
        ).padStart(
          2,
          '0',
        )}:` +
        `${String(
          segundos,
        ).padStart(
          2,
          '0',
        )}`;
    }

    return {
      estado:
        this.estadoActualizacion,

      hora_inicio_actualizacion:
        config
          .hora_inicio_actualizacion,

      hora_fin_actualizacion:
        config
          .hora_fin_actualizacion,

      intervalo_actualizacion:
        config
          .intervalo_actualizacion,

      zona_horaria:
        config
          .zona_horaria,

      hora_servidor:
        ahora
          .toUTC()
          .toJSDate()
          .toISOString(),

      ultima_actualizacion:
        config
          .ultima_actualizacion
          ?.toISOString() ??
        null,

      proxima_actualizacion:
        config
          .proxima_actualizacion
          ?.toISOString() ??
        null,

      segundos_restantes:
        segundosRestantes,

      minutos_restantes:
        segundosRestantes ===
        null
          ? null
          : Math.ceil(
              segundosRestantes /
                60,
            ),

      cuenta_regresiva:
        cuentaRegresiva,
    };
  }

  // ==========================================
  // ESTADO ACTUALIZACION
  // ==========================================

  establecerEstadoActualizacion(
    estado:
      | 'EN_ESPERA'
      | 'SINCRONIZANDO'
      | 'ERROR',
  ): void {
    this.estadoActualizacion =
      estado;
  }
}