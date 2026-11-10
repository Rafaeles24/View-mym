import Image from "next/image";

import LogoSvg from "@/icons/logo.svg";
import DefaultPerson from "@/images/default.png";
import type { VisorSedeVersus } from "@/types/sedeVersus";
import type { VersusRangoFecha } from "@/types/versus";
import VersusRango from "../versusRangoFecha/ui";

import styles from "./ui.module.css";

export default function SedeVersusUI({
  data,
  versusRango,
}: {
  data: VisorSedeVersus;
  versusRango: VersusRangoFecha;
}) {
  const lideres = data.participantes.filter(
    (participante) => participante.lider,
  );

  const mensajeResultado =
    data.resultado.estado === "EMPATE"
      ? `Empate entre ${lideres.map((sede) => sede.nombre).join(", ")}`
      : lideres[0]
        ? `${lideres[0].nombre} lidera la competencia`
        : "Competencia sin participantes";

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleContent}>
          <Image
            src={LogoSvg}
            width={80}
            height={80}
            alt=""
            aria-hidden="true"
          />

          <div className={styles.title}>
            <h1>
              VS. DE <span>JEFATURA</span>
            </h1>
            <p>Una sola meta, cuatro sedes compitiendo</p>
          </div>
        </div>

        <div className={styles.range}>
          <VersusRango schedule={versusRango} />
        </div>
      </header>

      <section className={styles.result} aria-live="polite">
        <span className={styles.resultLabel}>EN VIVO</span>
        <strong>{mensajeResultado}</strong>
        {data.resultado.estado === "LIDER" && (
          <span>
            Ventaja de {data.resultado.diferencia_primero_segundo} {data.resultado.diferencia_primero_segundo === 1 ? "venta" : "ventas"}
          </span>
        )}
      </section>

      <section className={styles.grid} aria-label="Clasificación de sedes">
        {data.participantes.map((participante) => (
          <article
            className={`${styles.card} ${participante.lider ? styles.leaderCard : ""}`}
            key={participante.id}
          >
            <div className={styles.hero}>
              <Image
                src={participante.jefe_operaciones?.avatar_url?.trim() || DefaultPerson}
                alt={participante.jefe_operaciones?.nombre ?? "Jefe de operaciones por asignar"}
                fill
                unoptimized
                sizes="(max-width: 900px) 50vw, 25vw"
                className={styles.heroImage}
              />

              <div className={styles.heroShade} />

              <span className={styles.position}>#{participante.posicion}</span>
              {participante.lider && (
                <span className={styles.leaderBadge}>LÍDER</span>
              )}

              <div className={styles.managerInfo}>
                <span>Jefe de operaciones</span>
                <strong>
                  {participante.jefe_operaciones?.nombre ?? "Por asignar"}
                </strong>
              </div>
            </div>

            <div className={styles.cardInfo}>
              <h2 title={participante.nombre}>{participante.nombre}</h2>

              <div className={styles.scoreBlock}>
                <strong className={styles.score}>{participante.ventas}</strong>
                <span>{participante.ventas === 1 ? "venta" : "ventas"}</span>
              </div>

              <div className={styles.gap}>
                {participante.lider
                  ? "Marcando el ritmo"
                  : `A ${participante.diferencia_lider} ${participante.diferencia_lider === 1 ? "venta" : "ventas"} del líder`}
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
