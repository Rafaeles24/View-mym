"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  socket,
} from "@/lib/socket";

import type {
  VersusRangoFecha,
} from "@/types/versus";

import styles from "./ui.module.css";
import { RankingCountdown } from "@/types/countdown";

export default function VersusRango({
  schedule,
}: {
  schedule: VersusRangoFecha;
}) {
  /*
   * ==========================================
   * ESTADOS
   * ==========================================
   */

  const [
    ahora,
    setAhora,
  ] =
    useState<number | null>(
      null,
    );

  const [
    conectado,
    setConectado,
  ] =
    useState(false);

  const [
    contador,
    setContador,
  ] =
    useState<RankingCountdown | null>(
      null,
    );

  const [
    hidratado,
    setHidratado,
  ] =
    useState(false);

  /*
   * Copia local de la configuración.
   *
   * Se inicializa desde el Server Component.
   *
   * Luego puede actualizarse mediante:
   *
   * versus-config:sync
   */
  const [
    scheduleActual,
    setScheduleActual,
  ] =
    useState<VersusRangoFecha>(
      schedule,
    );

  /*
   * ==========================================
   * HIDRATACIÓN
   * ==========================================
   */

  useEffect(() => {
    setHidratado(true);

    setConectado(
      socket.connected,
    );
  }, []);

  /*
   * ==========================================
   * SINCRONIZAR PROP
   * ==========================================
   */

  useEffect(() => {
    setScheduleActual(
      schedule,
    );
  }, [schedule]);

  /*
   * ==========================================
   * RELOJ LOCAL
   * ==========================================
   */

  useEffect(() => {
    function actualizarHora() {
      setAhora(
        Date.now(),
      );
    }

    actualizarHora();

    const timer =
      window.setInterval(
        actualizarHora,
        1000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, []);

  /*
   * ==========================================
   * SOCKET
   * ==========================================
   */

  useEffect(() => {
    function recibirContador(
      datos: RankingCountdown,
    ) {
      setContador(
        datos,
      );

      setConectado(
        true,
      );
    }

    function recibirConfig(
      nuevaConfig:
        VersusRangoFecha,
    ) {
      console.log(
        "[SOCKET] versus-config:sync recibido",
        nuevaConfig,
      );

      setScheduleActual(
        nuevaConfig,
      );
    }

    function onConnect() {
      setConectado(
        true,
      );
    }

    function onDisconnect() {
      setConectado(
        false,
      );

      setContador(
        null,
      );
    }

    socket.on(
      "ranking:countdown",
      recibirContador,
    );

    socket.on(
      "versus-config:sync",
      recibirConfig,
    );

    socket.on(
      "connect",
      onConnect,
    );

    socket.on(
      "disconnect",
      onDisconnect,
    );

    /*
     * Si el socket ya estaba conectado
     * antes de montar el componente.
     */
    setConectado(
      socket.connected,
    );

    return () => {
      socket.off(
        "ranking:countdown",
        recibirContador,
      );

      socket.off(
        "versus-config:sync",
        recibirConfig,
      );

      socket.off(
        "connect",
        onConnect,
      );

      socket.off(
        "disconnect",
        onDisconnect,
      );
    };
  }, []);

  /*
   * ==========================================
   * FECHAS
   * ==========================================
   */

  const inicio =
    Date.parse(
      scheduleActual
        .fecha_inicio,
    );

  const fin =
    Date.parse(
      scheduleActual
        .fecha_fin,
    );

  if (
    !Number.isFinite(
      inicio,
    ) ||
    !Number.isFinite(
      fin,
    ) ||
    fin <= inicio
  ) {
    return (
      <section
        className={
          styles.rango
        }
      >
        <p
          className={
            styles.error
          }
        >
          El rango de fechas VS
          no es válido.
        </p>
      </section>
    );
  }

  /*
   * ==========================================
   * PROGRESO
   * ==========================================
   */

  const progreso =
    ahora === null
      ? 0
      : Math.min(
          100,
          Math.max(
            0,
            (
              (ahora -
                inicio) /
              (fin -
                inicio)
            ) *
              100,
          ),
        );

  /*
   * ==========================================
   * FORMATEADOR FECHA
   * ==========================================
   */

  const formateador =
    new Intl.DateTimeFormat(
      "es-PE",
      {
        timeZone:
          scheduleActual
            .zona_horaria,

        day:
          "2-digit",

        month:
          "short",

        year:
          "numeric",
      },
    );

  function formatoFechaYHora(
    fecha: string,
  ): string {
    const fechaDate =
      new Date(
        fecha,
      );

    if (
      !Number.isFinite(
        fechaDate.getTime(),
      )
    ) {
      return "Fecha inválida";
    }

    return new Intl.DateTimeFormat(
      "es-PE",
      {
        timeZone:
          scheduleActual
            .zona_horaria,

        day:
          "2-digit",

        month:
          "short",

        year:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit",

        hour12:
          true,
      },
    )
      .format(
        fechaDate,
      )
      .replace(
        /[\s\u00A0\u202F]+/g,
        " ",
      )
      .trim();
  }

  /*
   * ==========================================
   * ESTADO DE ACTUALIZACIÓN
   * ==========================================
   */

  const actualizando =
    contador?.estado ===
    "SINCRONIZANDO";

  const textoContador =
    !conectado
      ? "Sin conexión"

      : !contador
        ? "Esperando programación…"

        : actualizando
          ? "Actualizando…"

          : contador.estado ===
              "ERROR"
            ? `Falló la actualización · Próximo intento: ${
                contador
                  .cuenta_regresiva ??
                "—"
              }`

            : contador
                  .segundos_restantes ===
                null
              ? "Sin próxima actualización"

              : contador
                    .segundos_restantes ===
                  0
                ? "Actualización pendiente…"

                : contador
                    .cuenta_regresiva ??
                  "—";

  /*
   * ==========================================
   * RENDER
   * ==========================================
   */

  return (
    <div
      className={
        styles.contenedor
      }
    >
      <section
        className={
          styles.rango
        }
        aria-label="Progreso del período del versus"
      >
        <time
          className={
            styles.fecha
          }
          dateTime={
            scheduleActual
              .fecha_inicio
          }
        >
          {formateador.format(
            inicio,
          )}
        </time>

        <div
          className={
            styles.barra
          }
          role="progressbar"
          aria-label="Tiempo transcurrido del período VS"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={
            ahora === null
              ? undefined
              : Number(
                  progreso.toFixed(
                    1,
                  ),
                )
          }
          aria-valuetext={
            ahora === null
              ? "Cargando"
              : `${progreso.toFixed(
                  1,
                )}% transcurrido`
          }
        >
          <div
            className={
              styles.progreso
            }
            style={{
              width:
                `${progreso}%`,
            }}
          />
        </div>

        <time
          className={`${styles.fecha} ${styles.fechaFin}`}
          dateTime={
            scheduleActual
              .fecha_fin
          }
        >
          {formateador.format(
            fin,
          )}
        </time>
      </section>

      <section
        className={
          styles.actualizacion
        }
        aria-label="Estado de actualización del versus"
      >
        <span
          className={
            styles.ultimaActualizacion
          }
        >
          Última actualización:{" "}
          {hidratado &&
          contador
            ?.ultima_actualizacion
            ? formatoFechaYHora(
                contador
                  .ultima_actualizacion,
              )
            : "—"}
        </span>

        <span
          className={
            styles.estadoActualizacion
          }
        >
          Actualizando en:{" "}

          <strong
            className={
              styles.contador
            }
          >
            {textoContador}
          </strong>
        </span>
      </section>
    </div>
  );
}