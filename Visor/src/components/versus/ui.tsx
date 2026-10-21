"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import styles from "./ui.module.css";

import {
  VersusRangoFecha,
  VisorVersus,
} from "@/types/versus";
import Image from "next/image";
import LogoSvg from "@/icons/logo.svg";
import VersusRango from "../versusRangoFecha/ui";

const ITEMS_PER_PAGE = 5;

function VersusRow({
  versus,
}: {
  versus: VisorVersus;
}) {
  const campaign1 =
    versus.cerrador_1.campaigns[0];

  const campaign2 =
    versus.cerrador_2.campaigns[0];

  const sede1 =
    versus.cerrador_1.sedes[0];

  const sede2 =
    versus.cerrador_2.sedes[0];

  return (
    <article className={styles.row}>
      {/* IZQUIERDA */}
      <div className={styles.side}>
        <div className={styles.logoWrap}>
          {campaign1?.logo_url ? (
            <img
              src={campaign1.logo_url}
              alt={campaign1.nombre}
              className={styles.logo}
            />
          ) : (
            <div className={styles.fallback}>
              {versus.cerrador_1.nombre
                .charAt(0)
                .toUpperCase()}
            </div>
          )}
        </div>

        <div className={styles.personData}>
          <div className={styles.personName}>
            {versus.cerrador_1.nombre}
          </div>

          {sede1 && (
            <div className={styles.sedeBadge}>
              {sede1.nombre}
            </div>
          )}
        </div>
      </div>

      {/* SCORE IZQUIERDA */}
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

      {/* SCORE DERECHA */}
      <div
        className={`${styles.score} ${
          versus.cerrador_2.lider
            ? styles.scoreLeader
            : styles.scoreLoser
        }`}
      >
        {versus.cerrador_2.ventas}
      </div>

      {/* DERECHA */}
      <div
        className={`${styles.side} ${styles.sideRight}`}
      >
        <div
          className={`${styles.personData} ${styles.personDataRight}`}
        >
          <div className={styles.personName}>
            {versus.cerrador_2.nombre}
          </div>

          {sede2 && (
            <div className={styles.sedeBadge}>
              {sede2.nombre}
            </div>
          )}
        </div>

        <div className={styles.logoWrap}>
          {campaign2?.logo_url ? (
            <img
              src={campaign2.logo_url}
              alt={campaign2.nombre}
              className={styles.logo}
            />
          ) : (
            <div className={styles.fallback}>
              {versus.cerrador_2.nombre
                .charAt(0)
                .toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

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
  const [page, setPage] =
    useState(0);

  const pages = useMemo(() => {
    const result: VisorVersus[][] =
      [];

    for (
      let i = 0;
      i < data.length;
      i += ITEMS_PER_PAGE
    ) {
      result.push(
        data.slice(
          i,
          i + ITEMS_PER_PAGE,
        ),
      );
    }

    return result;
  }, [data]);

  useEffect(() => {
    if (!isActive) return;

    setPage(0)
  }, [isActive]);


  useEffect(() => {
    if (!isActive) return;

    if (pages.length === 0) {
      onComplete?.();
      return;
    }

    const timer = window.setTimeout(() => {
      const isLastPage = page >= pages.length - 1;

      if (isLastPage) {
        onComplete?.();
        return;
      }

      setPage((current) => current + 1);
    }, durationMs);

    return () => {
      window.clearTimeout(timer);
    }
  }, [isActive, page, pages.length, durationMs, onComplete])

  if (!data.length) {
    return null;
  }

  const currentPage =
    pages[page] ?? [];

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
          <div className={styles.titulo}>
            <h1>VS. DE <span className={styles.tituloVentas}>VENTAS GLOBAL</span></h1>
            <p>Disciplina hoy, grandes resultados mañana</p>
          </div>
        </div>

        <div className={styles.rankingRango}>
          <VersusRango schedule={versusRango} />
        </div>
      </header>

      <section className={styles.list}>
        {currentPage.map(
          (versus) => (
            <VersusRow
              key={versus.id}
              versus={versus}
            />
          ),
        )}
      </section>

      {pages.length > 1 && (
        <div
          className={
            styles.pagination
          }
        >
          {pages.map(
            (_, index) => (
              <span
                key={index}
                className={`${styles.dot} ${
                  index === page
                    ? styles.dotActive
                    : ""
                }`}
              />
            ),
          )}
        </div>
      )}
    </main>
  );
}