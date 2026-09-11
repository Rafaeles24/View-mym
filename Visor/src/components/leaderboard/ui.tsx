"use client";

import type { RankingList } from "@/types/ranking";
import type { SedeStats } from "@/types/stats";
import { useEffect, useRef } from "react";
import Lugar from "../lugar/ui";
import styles from "./ui.module.css";
import Image from "next/image";
import EdificioSvg from "@/icons/edificio.svg";
import PersonsaSvg from "@/icons/personas.svg";
import HeadsetSvg from "@/icons/headset.svg";
import BarraBlancaSvg from "@/icons/barra blanco.svg";

const VELOCIDAD = 25;
const PAUSA = 1500;

type Props = {
  id: string;
  titulo: string;
  subtitulo: string;
  ranking: RankingList[];
  stats?: SedeStats;
};

export default function Leaderboard({
  id,
  titulo,
  subtitulo,
  ranking,
  stats,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const esResumen = stats !== undefined;

  const primeros = ranking.slice(0, 3);
  const restantes = ranking.slice(3);

  const esSede = id === "agentes-sede";
  const mostrarSede =
    id === "agentes-global" || id === "cerradores-global";

  const sedes = stats
    ? [...stats.sedes]
        .filter(
          (item) =>
            item.sede.trim().toUpperCase() !== "SIN SEDE" ||
            item.cantidad > 0
        )
        .sort((a, b) => a.puesto - b.puesto)
    : [];

  useEffect(() => {
    if (esResumen) return;

    const contenedor = scrollRef.current;
    if (!contenedor) return;

    let frameId = 0;
    let direccion = 1;
    let posicion = 0;
    let anterior = 0;
    let pausaHasta = performance.now() + PAUSA;

    contenedor.scrollTop = 0;

    function animar(ahora: number) {
      if (!contenedor) return;

      const delta = anterior
        ? Math.min((ahora - anterior) / 1000, 0.05)
        : 0;

      anterior = ahora;

      const limite = Math.max(
        0,
        contenedor.scrollHeight - contenedor.clientHeight
      );

      if (limite <= 1) {
        posicion = 0;
        direccion = 1;
        pausaHasta = ahora + PAUSA;
      } else if (ahora >= pausaHasta) {
        posicion = Math.min(posicion, limite);
        posicion += direccion * VELOCIDAD * delta;

        if (posicion >= limite) {
          posicion = limite;
          direccion = -1;
          pausaHasta = ahora + PAUSA;
        } else if (posicion <= 0) {
          posicion = 0;
          direccion = 1;
          pausaHasta = ahora + PAUSA;
        }
      }

      contenedor.scrollTop = posicion;
      frameId = requestAnimationFrame(animar);
    }

    frameId = requestAnimationFrame(animar);

    return () => cancelAnimationFrame(frameId);
  }, [ranking, esResumen]);

  return (
    <section
      aria-labelledby={id}
      className={`${styles.leaderboardContent} ${
        esSede ? styles.sedes : ""
      }`}
    >
      <header className={styles.cabeceraRanking}>
        { id === "agentes-sede" ? (
            <Image
              src={EdificioSvg}
              width={60}
              height={60}
              alt=""
              aria-hidden="true"
            />
          ) : id === "agentes-global" ? (
            <Image
              src={PersonsaSvg}
              width={60}
              height={60}
              alt=""
              aria-hidden="true"
            />
          ) : id === "cerradores-global" ? (
            <Image
              src={HeadsetSvg}
              width={60}
              height={60}
              alt=""
              aria-hidden="true"
            />
          ) : id === "stats-sede" ? (
            <Image
              src={BarraBlancaSvg}
              width={60}
              height={60}
              alt=""
              aria-hidden="true"
            />
          ) : null
        }
        <div className={styles.titulo}>
          <p className={styles.subtituloRanking}>
            {subtitulo}
          </p>
          <h3 className={styles.tituloRanking} id={id}>
            {titulo}
          </h3>
        </div>
      </header>

      {stats ? (
        <div className={styles.resumenSedes}>
          <ol className={styles.listaSedes}>
            {sedes.map((item) => (
              <li
                key={item.sede}
                value={item.puesto}
                className={`${styles.filaSede} ${
                  item.puesto === 1 ? styles.sedePrimera : ""
                }`}
              >
                <span
                  className={styles.puestoSede}
                  aria-label={`Puesto ${item.puesto}`}
                >
                  {item.puesto}
                </span>

                <span className={styles.nombreSede}>
                  {item.sede}
                </span>

                <div className={styles.ventasSede}>
                  <strong>
                    {item.cantidad.toLocaleString("es-PE")}
                  </strong>
                  <span>VENTAS</span>
                </div>
              </li>
            ))}
          </ol>

          {sedes.length === 0 && (
            <div className={styles.vacio}>
              <p>Sin registro de sedes</p>
            </div>
          )}

          <footer className={styles.totalSedes}>
            <span>TOTAL DE VENTAS</span>

            <strong>
              {stats.total_ventas.toLocaleString("es-PE")}
            </strong>
          </footer>
        </div>
      ) : ranking.length > 0 ? (
        <div className={styles.contenidoRanking}>
          <ol role="list" className={styles.lista}>
            {primeros.map((persona) => (
              <Lugar
                key={JSON.stringify([
                  persona.sede.id,
                  persona.campaign.id,
                  persona.variante,
                  persona.nombre,
                ])}
                persona={persona}
                mostrarSede={mostrarSede}
              />
            ))}
          </ol>

          {restantes.length > 0 && (
            <div
              ref={scrollRef}
              className={styles.scrollRanking}
            >
              <ol
                role="list"
                start={4}
                className={styles.lista}
              >
                {restantes.map((persona) => (
                  <Lugar
                    key={JSON.stringify([
                      persona.sede.id,
                      persona.campaign.id,
                      persona.variante,
                      persona.nombre,
                    ])}
                    persona={persona}
                    mostrarSede={mostrarSede}
                  />
                ))}
              </ol>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.vacio}>
          <p>Sin registro actual</p>
        </div>
      )}
    </section>
  );
}