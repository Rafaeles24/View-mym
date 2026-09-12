"use client";

import { useEffect, useState } from "react";
import type { RankingRangoFecha } from "@/types/ranking";
import styles from "./ui.module.css";

export default function RankingRango({
  schedule,
}: {
  schedule: RankingRangoFecha;
}) {
  const [ahora, setAhora] = useState<number | null>(null);

  useEffect(() => {
    const actualizar = () => setAhora(Date.now());

    actualizar();

    const timer = window.setInterval(actualizar, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const inicio = Date.parse(schedule.fecha_inicio);
  const fin = Date.parse(schedule.fecha_fin) - 1;

  if (
    !Number.isFinite(inicio) ||
    !Number.isFinite(fin) ||
    fin <= inicio
  ) {
    return (
      <section className={styles.rango}>
        <p className={styles.error}>El rango de fechas no es válido.</p>
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

  const estado =
    ahora === null
      ? "Cargando..."
      : ahora < inicio
        ? "Por comenzar"
        : ahora >= fin
          ? "Finalizado"
          : "En curso";

  const formateador = new Intl.DateTimeFormat("es-PE", {
    timeZone: schedule.zona_horaria,
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  return (
    <section
      className={styles.rango}
      aria-label="Progreso del período del ranking"
    >
      <div className={styles.fecha}>
        <time dateTime={schedule.fecha_inicio}>
          {formateador.format(inicio)}
        </time>
      </div>

      <div
        className={styles.barra}
        role="progressbar"
        aria-label="Tiempo transcurrido del período"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={
          ahora === null ? undefined : Number(progreso.toFixed(1))
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

      <div className={`${styles.fecha} ${styles.fechaFin}`}>
        <time dateTime={schedule.fecha_fin}>
          {formateador.format(fin)}
        </time>
      </div>
    </section>
  );
}