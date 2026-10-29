"use client";

import {
  useCallback,
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
import DefaultPerson from "@/images/default.png";

/* =========================================
   CONFIGURACIÓN
========================================= */

const ITEMS_PER_PAGE = 4;

/*
 * Debe coincidir con el tiempo
 * de transición CSS.
 */
const FADE_MS = 500;

type Layer = "a" | "b";

const oppositeLayer = (
  layer: Layer,
): Layer => {
  return layer === "a"
    ? "b"
    : "a";
};

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
      <CampaignLogos
        campaigns={cerrador.campaigns}
      />

      <div
        className={styles.personName}
        title={cerrador.nombre}
      >
        {cerrador.nombre}
      </div>

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
      {/* INFORMACIÓN IZQUIERDA */}
      <div className={styles.side}>
        <CerradorInfo
          cerrador={versus.cerrador_1}
        />
      </div>

      {/* PERSONA IZQUIERDA */}
      <div className={styles.personImageWrap}>
        <Image
          src={
            versus.cerrador_1.avatar_url?.trim() ||
            DefaultPerson
          }
          alt={versus.cerrador_1.nombre}
          fill
          unoptimized
          sizes="(min-width: 1600px) 180px, (max-width: 1400px) 105px, 150px"
          className={styles.personImage}
        />
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

      {/* PERSONA DERECHA */}
      <div className={styles.personImageWrap}>
        <Image
          src={
            versus.cerrador_2.avatar_url?.trim() ||
            DefaultPerson
          }
          alt={versus.cerrador_2.nombre}
          fill
          unoptimized
          sizes="(min-width: 1600px) 180px, (max-width: 1400px) 105px, 150px"
          className={styles.personImage}
        />
      </div>

      {/* INFORMACIÓN DERECHA */}
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
  /*
   * =========================================
   * PAGINACIÓN
   * =========================================
   */

  const pages = useMemo(() => {
    const result: VisorVersus[][] = [];

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

  /*
   * =========================================
   * ESTADO
   * =========================================
   */

  const [
    pageIndex,
    setPageIndex,
  ] = useState(0);

  const [
    active,
    setActive,
  ] = useState<Layer>("a");

  /*
   * Cada capa contiene una página completa.
   *
   * A = página visible
   * B = siguiente página precargada
   *
   * Luego se intercambian.
   */
  const [
    layerPages,
    setLayerPages,
  ] = useState<
    Record<
      Layer,
      VisorVersus[]
    >
  >(() => ({
    a:
      pages[0] ??
      [],

    b:
      pages[1] ??
      [],
  }));

  /*
   * Solo comenzamos el contador cuando
   * ViewRotator ya colocó Versus delante.
   */
  const [
    playbackReady,
    setPlaybackReady,
  ] = useState(false);

  /*
   * =========================================
   * REFS
   * =========================================
   */

  const onCompleteRef =
    useRef(onComplete);

  const activeRef =
    useRef<Layer>("a");

  const pageIndexRef =
    useRef(0);

  const pagesRef =
    useRef<VisorVersus[][]>(
      pages,
    );

  const transitioningRef =
    useRef(false);

  const completedRef =
    useRef(false);

  const transitionTimerRef =
    useRef<number | null>(
      null,
    );

  const frameARef =
    useRef<number | null>(
      null,
    );

  const frameBRef =
    useRef<number | null>(
      null,
    );

  /*
   * Lo iniciamos en false para que
   * si Versus nace activo también
   * ejecute el proceso de entrada.
   */
  const previousIsActiveRef =
    useRef(false);

  /*
   * =========================================
   * SINCRONIZAR REFS
   * =========================================
   */

  useEffect(() => {
    onCompleteRef.current =
      onComplete;
  }, [onComplete]);

  useEffect(() => {
    activeRef.current =
      active;
  }, [active]);

  useEffect(() => {
    pageIndexRef.current =
      pageIndex;
  }, [pageIndex]);

  /*
   * =========================================
   * CANCELAR FRAMES
   * =========================================
   */

  const cancelFrames =
    useCallback(() => {
      if (
        frameARef.current !==
        null
      ) {
        cancelAnimationFrame(
          frameARef.current,
        );

        frameARef.current =
          null;
      }

      if (
        frameBRef.current !==
        null
      ) {
        cancelAnimationFrame(
          frameBRef.current,
        );

        frameBRef.current =
          null;
      }
    }, []);

  /*
   * =========================================
   * RESET
   * =========================================
   */

  const resetVersus =
    useCallback(() => {
      /*
       * Cancelar transición pendiente.
       */
      if (
        transitionTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          transitionTimerRef.current,
        );

        transitionTimerRef.current =
          null;
      }

      transitioningRef.current =
        false;

      completedRef.current =
        false;

      /*
       * Comenzar siempre desde
       * página 0.
       */
      pageIndexRef.current =
        0;

      setPageIndex(0);

      activeRef.current =
        "a";

      setActive("a");

      /*
       * Precargar las dos primeras
       * páginas inmediatamente.
       */
      const list =
        pagesRef.current;

      setLayerPages({
        a:
          list[0] ??
          [],

        b:
          list[1] ??
          [],
      });
    }, []);

  /*
   * =========================================
   * FINALIZAR VERSUS
   * =========================================
   */

  const completeVersus =
    useCallback(() => {
      if (
        completedRef.current
      ) {
        return;
      }

      completedRef.current =
        true;

      setPlaybackReady(false);

      onCompleteRef.current?.();
    }, []);

  /*
   * =========================================
   * AVANZAR
   * =========================================
   */

  const advance =
    useCallback(() => {
      /*
       * Una vista oculta nunca debe
       * modificar sus páginas.
       */
      if (
        !isActive ||
        !playbackReady
      ) {
        return;
      }

      const list =
        pagesRef.current;

      if (
        list.length === 0
      ) {
        completeVersus();

        return;
      }

      /*
       * Evitar doble transición.
       */
      if (
        transitioningRef.current
      ) {
        return;
      }

      const currentIndex =
        pageIndexRef.current;

      const isLastPage =
        currentIndex >=
        list.length - 1;

      /*
       * Si estamos en la última página,
       * termina Versus y ViewRotator
       * continúa con la siguiente vista.
       */
      if (isLastPage) {
        completeVersus();

        return;
      }

      transitioningRef.current =
        true;

      /*
       * Capa visible actualmente.
       */
      const from =
        activeRef.current;

      /*
       * Capa que estaba oculta.
       */
      const to =
        oppositeLayer(
          from,
        );

      /*
       * Página que pasará a mostrarse.
       */
      const nextIndex =
        currentIndex + 1;

      /*
       * Página que se dejará preparada
       * después de la transición.
       */
      const preloadIndex =
        nextIndex + 1;

      /*
       * =====================================
       * ASEGURAR SIGUIENTE PÁGINA
       * =====================================
       *
       * Normalmente ya estaba cargada,
       * pero la volvemos a sincronizar
       * por seguridad.
       */
      setLayerPages(
        (current) => ({
          ...current,

          [to]:
            list[
              nextIndex
            ] ??
            [],
        }),
      );

      /*
       * =====================================
       * INTERCAMBIAR CAPAS
       * =====================================
       */

      activeRef.current =
        to;

      setActive(to);

      if (
        transitionTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          transitionTimerRef.current,
        );
      }

      transitionTimerRef.current =
        window.setTimeout(
          () => {
            /*
             * La transición terminó.
             */

            pageIndexRef.current =
              nextIndex;

            setPageIndex(
              nextIndex,
            );

            /*
             * =================================
             * PRECARGAR LA SIGUIENTE
             * =================================
             *
             * La capa que acaba de quedar
             * atrás ahora recibe la página
             * siguiente.
             *
             * Ejemplo:
             *
             * A = página 1 visible
             * B = página 2 precargada
             *
             * cambio:
             *
             * B = página 2 visible
             *
             * y después:
             *
             * A = página 3 precargada
             */
            setLayerPages(
              (current) => ({
                ...current,

                [from]:
                  list[
                    preloadIndex
                  ] ??
                  [],
              }),
            );

            transitioningRef.current =
              false;

            transitionTimerRef.current =
              null;
          },

          FADE_MS,
        );
    }, [
      completeVersus,
      isActive,
      playbackReady,
    ]);

  /*
   * =========================================
   * DATA / PÁGINAS ACTUALIZADAS
   * =========================================
   */

  useEffect(() => {
    pagesRef.current =
      pages;

    /*
     * Si cambia la información proveniente
     * del backend/socket, reconstruimos
     * las dos capas.
     */
    resetVersus();
  }, [
    pages,
    resetVersus,
  ]);

  /*
   * =========================================
   * ACTIVACIÓN DE LA VISTA
   * =========================================
   */

  useEffect(() => {
    const wasActive =
      previousIsActiveRef.current;

    previousIsActiveRef.current =
      isActive;

    /*
     * ===========================
     * VERSUS OCULTO
     * ===========================
     */
    if (!isActive) {
      cancelFrames();

      setPlaybackReady(false);

      return;
    }

    /*
     * ===========================
     * VERSUS ACABA DE ENTRAR
     * ===========================
     */
    if (
      isActive &&
      !wasActive
    ) {
      resetVersus();

      setPlaybackReady(false);

      /*
       * Esperamos dos frames,
       * igual que Player.
       *
       * Primer frame:
       * React coloca la capa.
       *
       * Segundo frame:
       * navegador ya resolvió
       * opacity / z-index.
       */
      frameARef.current =
        requestAnimationFrame(
          () => {
            frameBRef.current =
              requestAnimationFrame(
                () => {
                  frameARef.current =
                    null;

                  frameBRef.current =
                    null;

                  setPlaybackReady(
                    true,
                  );
                },
              );
          },
        );
    }
  }, [
    isActive,
    cancelFrames,
    resetVersus,
  ]);

  /*
   * =========================================
   * PÁGINA ACTIVA
   * =========================================
   */

  const activePage =
    layerPages[
      active
    ];

  /*
   * =========================================
   * TEMPORIZADOR
   * =========================================
   */

  useEffect(() => {
    /*
     * No contar tiempo mientras
     * Versus esté detrás de otra vista.
     */
    if (
      !isActive ||
      !playbackReady
    ) {
      return;
    }

    /*
     * No existen versus.
     */
    if (
      pagesRef.current.length ===
      0
    ) {
      completeVersus();

      return;
    }

    /*
     * Cada página permanece visible
     * durationMs.
     */
    const timer =
      window.setTimeout(
        () => {
          advance();
        },

        durationMs,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    isActive,
    playbackReady,

    /*
     * Muy importante:
     *
     * cada cambio de capa representa
     * una nueva página.
     */
    active,
    activePage,

    durationMs,
    advance,
    completeVersus,
  ]);

  /*
   * =========================================
   * CLEANUP GENERAL
   * =========================================
   */

  useEffect(() => {
    return () => {
      cancelFrames();

      if (
        transitionTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          transitionTimerRef.current,
        );

        transitionTimerRef.current =
          null;
      }
    };
  }, [
    cancelFrames,
  ]);

  /*
   * =========================================
   * SIN DATOS
   * =========================================
   */

  if (!data.length) {
    return null;
  }

  /*
   * =========================================
   * UI
   * =========================================
   */

  return (
    <main className={styles.container}>
      {/* =====================================
          HEADER
      ===================================== */}

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
              <span
                className={
                  styles.tituloVentas
                }
              >
                VENTAS GLOBAL
              </span>
            </h1>

            <p>
              Disciplina hoy, grandes resultados mañana
            </p>
          </div>
        </div>

        <div className={styles.rankingRango}>
          <VersusRango
            schedule={versusRango}
          />
        </div>
      </header>

      {/* =====================================
          STAGE DE CAPAS
      ===================================== */}

      <div
        className={
          styles.versusStage
        }
      >
        {/* ================================
            CAPA A
        ================================ */}

        <section
          className={`
            ${styles.list}
            ${styles.versusLayer}
            ${
              active === "a"
                ? styles.layerActive
                : styles.layerHidden
            }
          `}
        >
          {layerPages.a.map(
            (versus) => (
              <VersusRow
                key={versus.id}
                versus={versus}
              />
            ),
          )}
        </section>

        {/* ================================
            CAPA B
        ================================ */}

        <section
          className={`
            ${styles.list}
            ${styles.versusLayer}
            ${
              active === "b"
                ? styles.layerActive
                : styles.layerHidden
            }
          `}
        >
          {layerPages.b.map(
            (versus) => (
              <VersusRow
                key={versus.id}
                versus={versus}
              />
            ),
          )}
        </section>
      </div>

      {/* =====================================
          PAGINACIÓN
      ===================================== */}

      {pages.length > 1 && (
        <div className={styles.pagination}>
          {pages.map(
            (_, index) => (
              <span
                key={index}
                className={`${styles.dot} ${
                  index === pageIndex
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