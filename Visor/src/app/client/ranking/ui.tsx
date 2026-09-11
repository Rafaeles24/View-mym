import { RankingList, RankingRangoFecha } from "@/types/ranking";
import styles from "./ui.module.css";
import Leaderboard from "@/components/leaderboard/ui";
import { Sede } from "@/types/sede";
import Image from "next/image";
import LogoSvg from "@/icons/logo.svg";
import { SedeStats } from "@/types/stats";
import RankingRango from "@/components/rankingRangoFecha/ui";

export default function RankingUI({
  sedeOrigin,
  rankingAgenteSede,
  rankingGlobalAgente,
  rankingGlobalCerrador,
  sedesStatsDiario,
  rankingRango,
} : {
  sedeOrigin: Sede;
  rankingAgenteSede: RankingList[];
  rankingGlobalAgente: RankingList[];
  rankingGlobalCerrador: RankingList[];
  sedesStatsDiario: SedeStats;
  rankingRango: RankingRangoFecha;
}) {
  const rankings = [
    {
      id: "agentes-sede",
      titulo: `${sedeOrigin.nombre}`,
      subtitulo: `Top agentes`,
      datos: rankingAgenteSede,
    },
    {
      id: "agentes-global",
      titulo: "M&M",
      subtitulo: "Top agentes",
      datos: rankingGlobalAgente,
    },
    {
      id: "cerradores-global",
      titulo: "M&M",
      subtitulo: "Top supervirsores",
      datos: rankingGlobalCerrador,
    },
  ];

  return (
    <main className={styles.main}>

      <header className={styles.header}>
        <div className={styles.titleContent}>
          <Image
            src={LogoSvg}
            width={80}
            height={80}
            alt=""
            aria-hidden="true"
          />
          <div className={styles.titulo}>
            <h1>RANKING DE <span className={styles.tituloVentas}>VENTAS {sedeOrigin.nombre}</span></h1>
            <p>Disciplina hoy, grandes resultados mañana</p>
          </div>
        </div>

        <RankingRango schedule={rankingRango} />
      </header>

      <div className={styles.leaderboardContent}>
        {rankings.map(({ id, titulo, subtitulo, datos }) => (
          <Leaderboard
            key={id}
            id={id}
            titulo={titulo}
            subtitulo={subtitulo}
            ranking={datos}
          />
          
        ))}

        <Leaderboard
          key="stats-sede"
          id="stats-sede"
          titulo="POR SEDE"
          subtitulo="Resumen de hoy"
          ranking={[]}
          stats={sedesStatsDiario}
        />
      </div>

      <footer className={styles.footer}>
        <p>Somos equipo, Somos M&M</p>
      </footer>
    </main>
  );
}