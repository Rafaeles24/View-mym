"use client";

import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import type { RankingRangoFecha } from "@/types/ranking";
import type { RankingCountdown } from "@/types/countdown";
import styles from "./ui.module.css";

export default function RankingRango({
  schedule,
}: {
  schedule: RankingRangoFecha;
}) {
  /*
   * ==========================================
   * ESTADOS
   * ==========================================
   */

  const [ahora, setAhora] =
    useState<number | null>(null);

  const [conectado, setConectado] =
    useState(socket.connected);

  const [contador, setContador] =
    useState<RankingCountdown | null>(null);

  /*
   * Copia local de la configuración.
   *
   * Se inicializa con los datos provenientes
   * del Server Component y luego puede
   * actualizarse directamente mediante
   * ranking-config:sync.
   */
  const [scheduleActual, setScheduleActual] =
    useState<RankingRangoFecha>(schedule);

  /*
   * ==========================================
   * SINCRONIZAR PROP
   * ==========================================
   *
   * Si SedePage vuelve a renderizarse por
   * router.refresh(), sincronizamos la nueva
   * prop con el estado local.
   */

  useEffect(() => {
    setScheduleActual(schedule);
  }, [schedule]);

  /*
   * ==========================================
   * RELOJ LOCAL
   * ==========================================
   */

  useEffect(() => {
    function actualizarHora() {
      setAhora(Date.now());
    }

    actualizarHora();

    const timer = window.setInterval(
      actualizarHora,
      1000
    );

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  /*
   * ==========================================
   * EVENTOS SOCKET.IO
   * ==========================================
   *
   * Importante:
   *
   * Este componente NO administra rooms.
   * El join-ranking/leave-ranking pertenece
   * a SedeViews.
   */

  useEffect(() => {
    /*
     * ------------------------------
     * Cuenta regresiva
     * ------------------------------
     */

    function recibirContador(
      datos: RankingCountdown
    ) {
      setContador(datos);
      setConectado(true);
    }

    function recibirConfig(
      nuevaConfig: RankingRangoFecha
    ) {
      console.log(
        "[SOCKET] ranking-config:sync recibido",
        nuevaConfig
      );

      setScheduleActual(nuevaConfig);
    }

    function onConnect() {
      setConectado(true);
    }

    function onDisconnect() {
      setConectado(false);
      setContador(null);
    }

    socket.on(
      "ranking:countdown",
      recibirContador
    );

    socket.on(
      "ranking-config:sync",
      recibirConfig
    );

    socket.on(
      "connect",
      onConnect
    );

    socket.on(
      "disconnect",
      onDisconnect
    );

    /*
     * Si la conexión ya estaba abierta
     * cuando monta este componente.
     */
    setConectado(socket.connected);

    return () => {
      socket.off(
        "ranking:countdown",
        recibirContador
      );

      socket.off(
        "ranking-config:sync",
        recibirConfig
      );

      socket.off(
        "connect",
        onConnect
      );

      socket.off(
        "disconnect",
        onDisconnect
      );
    };
  }, []);

  /*
   * ==========================================
   * FECHAS
   * ==========================================
   */

  const inicio = Date.parse(
    scheduleActual.fecha_inicio
  );

  const fin = Date.parse(
    scheduleActual.fecha_fin
  );

  if (
    !Number.isFinite(inicio) ||
    !Number.isFinite(fin) ||
    fin <= inicio
  ) {
    return (
      <section className={styles.rango}>
        <p className={styles.error}>
          El rango de fechas no es válido.
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
            ((ahora - inicio) /
              (fin - inicio)) *
              100
          )
        );

  /*
   * ==========================================
   * FORMATO DE FECHA
   * ==========================================
   */

  const formateador =
    new Intl.DateTimeFormat(
      "es-PE",
      {
        timeZone:
          scheduleActual.zona_horaria,

        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );

  /*
   * ==========================================
   * ESTADO ACTUALIZACIÓN
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

          : contador.estado === "ERROR"
            ? `Falló la actualización · Próximo intento: ${
                contador.cuenta_regresiva ??
                "—"
              }`

            : contador.segundos_restantes === null
              ? "Sin próxima actualización"

              : contador.segundos_restantes === 0
                ? "Actualización pendiente…"

                : contador.cuenta_regresiva ??
                  "—";

  /*
   * ==========================================
   * RENDER
   * ==========================================
   */

  return (
    <div className={styles.contenedor}>
      <section
        className={styles.rango}
        aria-label="Progreso del período del ranking"
      >
        <time
          className={styles.fecha}
          dateTime={
            scheduleActual.fecha_inicio
          }
        >
          {formateador.format(inicio)}
        </time>

        <div
          className={styles.barra}
          role="progressbar"
          aria-label="Tiempo transcurrido del período"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={
            ahora === null
              ? undefined
              : Number(
                  progreso.toFixed(1)
                )
          }
          aria-valuetext={
            ahora === null
              ? "Cargando"
              : `${progreso.toFixed(
                  1
                )}% transcurrido`
          }
        >
          <div
            className={
              styles.progreso
            }
            style={{
              width: `${progreso}%`,
            }}
          />
        </div>

        <time
          className={`${styles.fecha} ${styles.fechaFin}`}
          dateTime={
            scheduleActual.fecha_fin
          }
        >
          {formateador.format(fin)}
        </time>
      </section>

      <section
        className={
          styles.actualizacion
        }
        aria-label="Estado de actualización del ranking"
      >

        <span
          className={styles.intervalo}
        >
          Actualización cada{" "}
          {
            scheduleActual
              .intervalo_actualizacion
          }{" "}
          min
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