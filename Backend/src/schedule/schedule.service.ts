import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DateTime } from "luxon";

import { PrismaService } from "src/prisma/prisma.service";
import { SicaService } from "src/sica/sica.service";
import { ConfigRankingService } from
  "src/config-ranking/config-ranking.service";
import { SedeGateway } from "src/realtime/gateways/sede.gateway";
import { TimeGateway } from "src/realtime/gateways/time.gateway";
import { MediaGateway } from "src/realtime/gateways/media.gateway";
import { RankingGateway } from "src/realtime/gateways/ranking.gateway";

@Injectable()
export class ScheduleService {
  private readonly logger =
    new Logger(ScheduleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sicaService: SicaService,
    private readonly configRankingService: ConfigRankingService,

    private readonly rankingGateway: RankingGateway,
    private readonly mediaGateway: MediaGateway,
    private readonly timeGateway: TimeGateway,
    private readonly sedeGateway: SedeGateway,
  ) {}

  /*
   * ========================================
   * HORA ACTUAL
   * ========================================
   */

  @Cron(CronExpression.EVERY_MINUTE)
  emitCurrentTime() {
    this.timeGateway.emitCurrentTime();
  }

  /*
   * ========================================
   * RENOVAR RANGO
   * ========================================
   */

  @Cron("0 * * * * *", {
    timeZone: "America/Lima",
    waitForCompletion: true,
  })
  async renovarRangoRanking() {
    try {
      /*
       * renovarSiCorresponde() ya se encarga
       * internamente de emitir:
       *
       * ranking-config:sync
       * ranking:refresh
       *
       * solamente cuando realmente cambia
       * el rango.
       */
      await this.configRankingService
        .renovarSiCorresponde();
    } catch (error: unknown) {
      this.logger.error(
        "No se pudo renovar el rango del ranking",
        error instanceof Error
          ? error.stack
          : String(error),
      );
    }
  }

  /*
   * ========================================
   * EJECUTAR ACTUALIZACIÓN DEL RANKING
   * ========================================
   */

  @Cron("* * * * * *", {
    timeZone: "America/Lima",
    waitForCompletion: true,
  })
  async revisarActualizacionRanking() {
    try {
      const config =
        await this.configRankingService
          .obtenerProgramacion();

      if (!config.proxima_actualizacion) {
        return;
      }

      const ahora =
        DateTime.now().setZone(
          config.zona_horaria,
        );

      const programada =
        DateTime.fromJSDate(
          config.proxima_actualizacion,
          {
            zone: config.zona_horaria,
          },
        );

      /*
       * Todavía no llegó la hora.
       */
      if (
        ahora.toMillis() <
        programada.toMillis()
      ) {
        return;
      }

      /*
       * Verificamos que la fecha programada
       * siga perteneciendo a la programación
       * actualmente configurada.
       */
      const puntoValido =
        this.configRankingService
          .siguienteActualizacionRanking(
            programada,
            config,
            true,
          );

      const perteneceAlHorario =
        puntoValido.toMillis() ===
        programada.toMillis();

      const retrasoMs =
        ahora.toMillis() -
        programada.toMillis();

      /*
       * Permitimos hasta 60 segundos
       * de retraso para ejecutar el batch.
       */
      const debeEjecutar =
        perteneceAlHorario &&
        retrasoMs < 60_000;

      /*
       * Calculamos desde ahora cuál será
       * la siguiente ejecución.
       */
      const proxima =
        this.configRankingService
          .siguienteActualizacionRanking(
            ahora,
            config,
          );

      /*
       * Reserva optimista.
       *
       * Si otra ejecución ya modificó
       * proxima_actualizacion, count será 0
       * y esta ejecución abandona.
       */
      const reservado =
        await this.prisma
          .configRanking
          .updateMany({
            where: {
              id: config.id,

              proxima_actualizacion:
                config.proxima_actualizacion,

              hora_inicio_actualizacion:
                config.hora_inicio_actualizacion,

              hora_fin_actualizacion:
                config.hora_fin_actualizacion,

              intervalo_actualizacion:
                config.intervalo_actualizacion,

              zona_horaria:
                config.zona_horaria,
            },

            data: {
              proxima_actualizacion:
                proxima
                  .toUTC()
                  .toJSDate(),
            },
          });

      /*
       * Otra ejecución ganó la reserva.
       */
      if (reservado.count === 0) {
        return;
      }

      /*
       * El punto antiguo ya no corresponde
       * a la programación actual.
       *
       * La siguiente ejecución ya quedó
       * corregida en BD, así que no hacemos
       * sincronización SICA.
       */
      if (!debeEjecutar) {
        return;
      }

      /*
       * ====================================
       * INICIO DEL BATCH
       * ====================================
       */

      this.configRankingService
        .establecerEstadoActualizacion(
          "SINCRONIZANDO",
        );

      this.logger.log(
        `Iniciando batch programado para ${programada.toISO()}`,
      );

      try {
        /*
         * Sincronización principal.
         */
        await this.sicaService
          .sincronizar(false);

        /*
         * Registrar una única vez la última
         * actualización exitosa.
         */
        await this.prisma
          .configRanking
          .update({
            where: {
              id: config.id,
            },

            data: {
              ultima_actualizacion:
                new Date(),
            },
          });

        /*
         * El batch terminó correctamente.
         */
        this.configRankingService
          .establecerEstadoActualizacion(
            "EN_ESPERA",
          );

        /*
         * ÚNICA señal que obliga al visor
         * a volver a consultar /all/:sede.
         */
        this.rankingGateway.emitRankingRefresh();

        this.logger.log(
          "Batch del ranking completado.",
        );
      } catch (error) {
        this.configRankingService
          .establecerEstadoActualizacion(
            "ERROR",
          );

        throw error;
      }
    } catch (error: unknown) {
      this.logger.error(
        "Falló la actualización del ranking",
        error instanceof Error
          ? error.stack
          : String(error),
      );
    }
  }

  /*
   * ========================================
   * CUENTA REGRESIVA
   * ========================================
   */

  @Cron("* * * * * *", {
    timeZone: "America/Lima",
    waitForCompletion: true,
  })
  async emitirCuentaRegresivaRanking() {
    try {
      const cuentaRegresiva =
        await this.configRankingService
          .obtenerCuentaRegresiva();

      this.rankingGateway.emitRankingCountdown(
        cuentaRegresiva,
      );
    } catch (error: unknown) {
      this.logger.error(
        "No se pudo emitir la cuenta regresiva del ranking",
        error instanceof Error
          ? error.stack
          : String(error),
      );
    }
  }
}