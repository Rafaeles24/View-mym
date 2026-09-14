"use client";

import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import type { RankingRangoFecha } from "@/types/ranking";
import styles from "./ui.module.css";
import { RankingCountdown } from "@/types/countdown";

type Props = {
  schedule: RankingRangoFecha;
};

export default function RankingRango({ schedule }: { schedule: RankingRangoFecha; }) {
  const [ahora, setAhora] = useState<number | null>(null);
  const [conectado, setConectado] = useState(false);
  const [contador, setContador] =
    useState<RankingCountdown | null>(null);

  useEffect(() => {
    function actualizarHora() {
      setAhora(Date.now());
    }

    actualizarHora();

    const timer = window.setInterval(actualizarHora, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function recibirContador(datos: RankingCountdown) {
      setContador(datos);
      setConectado(true);
    }

    function onConnect() {
      setConectado(true);
      setContador(null);
    }

    function onDisconnect() {
      setConectado(false);
      setContador(null);
    }

    socket.on("ranking:countdown", recibirContador);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    setConectado(socket.connected);

    return () => {
      socket.off("ranking:countdown", recibirContador);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  const inicio = Date.parse(schedule.fecha_inicio);

  // El servicio devuelve fecha_fin inclusiva.
  // No volver a restar un milisegundo.
  const fin = Date.parse(schedule.fecha_fin) - 1;

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

  const progreso =
    ahora === null
      ? 0
      : Math.min(
          100,
          Math.max(0, ((ahora - inicio) / (fin - inicio)) * 100),
        );

  const formateador = new Intl.DateTimeFormat("es-PE", {
    timeZone: schedule.zona_horaria,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const textoContador = !conectado
    ? "Sin conexión"
    : !contador
      ? "Esperando programación…"
      : contador.segundos_restantes === null
        ? "Sin próxima actualización"
        : contador.segundos_restantes === 0
          ? "Actualización pendiente…"
          : contador.cuenta_regresiva ?? "—";

  const mostrarUnidad =
    conectado &&
    contador !== null &&
    contador.segundos_restantes !== null &&
    contador.segundos_restantes > 0;

  return (
    <div className={styles.contenedor}>
      <section
        className={styles.rango}
        aria-label="Progreso del período del ranking"
      >
        <time
          className={styles.fecha}
          dateTime={schedule.fecha_inicio}
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
              : Number(progreso.toFixed(1))
          }
          aria-valuetext={
            ahora === null
              ? "Cargando"
              : `${progreso.toFixed(1)}% transcurrido`
          }
        >
          <div
            className={styles.progreso}
            style={{ width: `${progreso}%` }}
          />
        </div>

        <time
          className={`${styles.fecha} ${styles.fechaFin}`}
          dateTime={schedule.fecha_fin}
        >
          {formateador.format(fin)}
        </time>
      </section>

      <section
        className={styles.actualizacion}
        aria-label="Estado de actualización del ranking"
      >
        <span className={styles.horario}>
          L–V{" "}
          {contador
            ? `${contador.hora_inicio_actualizacion} – ${contador.hora_fin_actualizacion}`
            : "—"}
        </span>

        <span className={styles.intervalo}>
          Cada {contador?.intervalo_actualizacion ?? "—"} min
        </span>

        <span className={styles.estadoActualizacion}>
          Actualizando en:{" "}
          <strong className={styles.contador}>
            {textoContador}
          </strong>
        </span>
      </section>
    </div>
  );
  
}