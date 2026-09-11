import type { RankingRangoFecha } from "@/types/ranking";
import styles from "./ui.module.css";
import Image from "next/image";
import CalendarioSvg from "@/icons/calendario.svg";

const PERIODOS: Record<string, string> = {
  DIARIO: "Diario",
  SEMANAL: "Semanal",
  MENSUAL: "Mensual",
  ANUAL: "Anual",
  PERSONALIZADO: "Personalizado",
};

export default function RankingRango({
  schedule,
}: {
  schedule: RankingRangoFecha;
}) {
  const esPersonalizado = schedule.periodo === "PERSONALIZADO";
  const zonaHoraria = schedule.zona_horaria ?? "America/Lima";

  const horaInicio = `${String(schedule.hora_inicio).padStart(2, "0")}:${String(
    schedule.minuto_inicio,
  ).padStart(2, "0")}`;

  function formatearFecha(valor?: string, soloFecha = false) {
    if (!valor) return "Sin definir";

    const fecha = new Date(
      soloFecha ? `${valor.slice(0, 10)}T00:00:00Z` : valor,
    );

    if (Number.isNaN(fecha.getTime())) return "Fecha inválida";

    return new Intl.DateTimeFormat("es-PE", {
      timeZone: soloFecha ? "UTC" : zonaHoraria,
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(fecha);
  }

  const DIAS_SEMANA = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];

  return (
    <section aria-label="Configuración del período del ranking" className={styles.rango}>
      <Image
        src={CalendarioSvg}
        width={60}
        height={60}
        alt=""
        aria-hidden="true"
      />
      
      <div className={styles.fechas}>
        <div className={styles.rangoContent}>
          <h3>{PERIODOS[schedule.periodo] ?? schedule.periodo}</h3>
          <div className={styles.fechaRango}>
            <p>Inicio: <strong>{formatearFecha(schedule.fecha_ancla, true)}</strong></p>
            <p>Fin: <strong>{formatearFecha(schedule.fecha_fin)}</strong></p>
          </div>
        </div>

        <div className={styles.intervalo}>
          {esPersonalizado ? (
            <div className={styles.duracion}>
              <p className={styles.p1}>{schedule.intervalo_dias}</p>
              <p>{schedule.intervalo_dias === 1 ? "día" : "días"}</p>
            </div>
          ) : schedule.periodo === "SEMANAL" ? (
            <div className={styles.diaDeInicio}>
              <p>Día de inicio</p>
              <p className={styles.p1}>{DIAS_SEMANA[schedule.dia_semana] ?? "Sin definir"}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}