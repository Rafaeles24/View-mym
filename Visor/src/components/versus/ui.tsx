
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import styles from "./ui.module.css";

import type {
  VersusCampaignIcon,
  VersusRangoFecha,
  VisorVersus,
} from "@/types/versus";

import Image from "next/image";
import LogoSvg from "@/icons/logo.svg";
import VersusRango from "../versusRangoFecha/ui";

const ITEMS_PER_PAGE = 4;

/* =========================================
   LOGOS DE CAMPAÑAS
========================================= */

function CampaignLogos({
  campaigns,
}: {
  campaigns: VersusCampaignIcon[];
}) {
  if (!campaigns.length) {
    return null;
  }

  return (
    <div className={styles.campaignLogos}>
      {campaigns.map((campaign) => (
        <div
          key={campaign.id}
          className={styles.logoWrap}
          title={campaign.nombre}
        >
          {campaign.logo_url ? (
            <img
              src={campaign.logo_url}
              alt={campaign.nombre}
              className={styles.logo}
            />
          ) : (
            <div className={styles.fallback}>
              {campaign.nombre
                .charAt(0)
                .toUpperCase()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* =========================================
   INFORMACIÓN DEL CERRADOR
========================================= */

function CerradorInfo({
  cerrador,
}: {
  cerrador: VisorVersus["cerrador_1"];
}) {
  return (
    <div className={styles.personData}>
      {/* LOGOS SUPERIORES */}
      <CampaignLogos
        campaigns={cerrador.campaigns}
      />

      {/* NOMBRE */}
      <div
        className={styles.personName}
        title={cerrador.nombre}
      >
        {cerrador.nombre}
      </div>

      {/* SEDES */}
      {cerrador.sedes.length > 0 && (
        <div className={styles.sedesList}>
          {cerrador.sedes.map((sede) => (
            <span
              key={sede.id}
              className={styles.sedeBadge}
            >
              {sede.nombre}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================
   FILA VERSUS
========================================= */

function VersusRow({
  versus,
}: {
  versus: VisorVersus;
}) {
  return (
    <article className={styles.row}>
      {/* CERRADOR IZQUIERDO */}
      <div className={styles.side}>
        <CerradorInfo
          cerrador={versus.cerrador_1}
        />
      </div>

      {/* VENTAS IZQUIERDA */}
      <div
        className={`${styles.score} ${
          versus.cerrador_1.lider
            ? styles.scoreLeader
            : styles.scoreLoser
        }`}
      >
        {versus.cerrador_1.ventas}
      </div>

      {/* VS */}
      <div className={styles.vs}>
        VS
      </div>

      {/* VENTAS DERECHA */}
      <div
        className={`${styles.score} ${
          versus.cerrador_2.lider
            ? styles.scoreLeader
            : styles.scoreLoser
        }`}
      >
        {versus.cerrador_2.ventas}
      </div>

      {/* CERRADOR DERECHO */}
      <div
        className={`${styles.side} ${styles.sideRight}`}
      >
        <CerradorInfo
          cerrador={versus.cerrador_2}
        />
      </div>
    </article>
  );
}

/* =========================================
   COMPONENTE PRINCIPAL
========================================= */

export default function VersusUI({
  data,
  durationMs = 10_000,
  onComplete,
  versusRango,
  isActive,
}: {
  data: VisorVersus[];
  durationMs?: number;
  onComplete?: () => void;
  versusRango: VersusRangoFecha;
  isActive: boolean;
}) {
  const [page, setPage] = useState(0);

  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  /* =========================================
     PAGINACIÓN
  ========================================= */

  const pages = useMemo(() => {
    const result: VisorVersus[][] = [];

    for (
      let i = 0;
      i < data.length;
      i += ITEMS_PER_PAGE
    ) {
      result.push(
        data.slice(i, i + ITEMS_PER_PAGE),
      );
    }

    return result;
  }, [data]);

  /* =========================================
     REINICIAR AL VOLVER A LA VISTA
  ========================================= */

  useEffect(() => {
    if (!isActive) {
      setPage(0);
      return;
    }

    setPage(0);
  }, [isActive]);

  /* =========================================
     CONTROL DE ROTACIÓN
  ========================================= */

  useEffect(() => {
    if (!isActive) {
      return;
    }

    if (pages.length === 0) {
      onCompleteRef.current?.();
      return;
    }

    const timer = window.setTimeout(() => {
      const isLastPage =
        page >= pages.length - 1;

      if (isLastPage) {
        onCompleteRef.current?.();
        return;
      }

      setPage((current) => current + 1);
    }, durationMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    isActive,
    page,
    pages.length,
    durationMs,
  ]);

  if (!data.length) {
    return null;
  }

  const currentPage = pages[page] ?? [];

  return (
    <main className={styles.container}>
      {/* HEADER */}
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
            <h1>
              VS. DE{" "}
              <span className={styles.tituloVentas}>
                VENTAS GLOBAL
              </span>
            </h1>

            <p>
              Disciplina hoy, grandes resultados mañana
            </p>
          </div>
        </div>

        <div className={styles.rankingRango}>
          <VersusRango schedule={versusRango} />
        </div>
      </header>

      {/* LISTA DE VERSUS */}
      <section className={styles.list}>
        {currentPage.map((versus) => (
          <VersusRow
            key={versus.id}
            versus={versus}
          />
        ))}
      </section>

      {/* PAGINACIÓN */}
      {pages.length > 1 && (
        <div className={styles.pagination}>
          {pages.map((_, index) => (
            <span
              key={index}
              className={`${styles.dot} ${
                index === page
                  ? styles.dotActive
                  : ""
              }`}
            />
          ))}
        </div>
      )}
    </main>
  );
}
