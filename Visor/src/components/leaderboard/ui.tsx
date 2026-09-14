"use client";

import type { RankingList } from "@/types/ranking";
import { useEffect, useRef } from "react";
import Image from "next/image";
import Lugar from "../lugar/ui";
import styles from "./ui.module.css";
import EdificioSvg from "@/icons/edificio.svg";
import PersonasSvg from "@/icons/personas.svg";
import HeadsetSvg from "@/icons/headset.svg";

const VELOCIDAD = 25;
const PAUSA = 1500;

type Props = {
  id: string;
  titulo: string;
  subtitulo: string;
  ranking: RankingList[];
};

export default function Leaderboard({
  id,
  titulo,
  subtitulo,
  ranking,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const primeros = ranking.slice(0, 3);
  const restantes = ranking.slice(3);

  const esSede = id === "agentes-sede";

  const mostrarSede =
    id === "agentes-global" || id === "cerradores-global";

  const icono =
    esSede
      ? EdificioSvg
      : id === "agentes-global"
        ? PersonasSvg
        : id === "cerradores-global"
          ? HeadsetSvg
          : null;

  useEffect(() => {
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
  }, [ranking]);

  return (
    <section
      aria-labelledby={id}
      className={`${styles.leaderboardContent} ${
        esSede ? styles.sedes : ""
      }`}
    >
      <header className={styles.cabeceraRanking}>
        {icono && (
          <Image
            src={icono}
            width={60}
            height={60}
            alt=""
            aria-hidden="true"
          />
        )}

        <div className={styles.titulo}>
          <p className={styles.subtituloRanking}>
            {subtitulo}
          </p>

          <h3 className={styles.tituloRanking} id={id}>
            {titulo}
          </h3>
        </div>
      </header>

      {ranking.length > 0 ? (
        <div className={styles.contenidoRanking}>
          <ol
            role="list"
            className={`${styles.lista} ${styles.listaFija}`}
          >
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