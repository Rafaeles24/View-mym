"use client";

import {
  useCallback,
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import styles from "./ui.module.css";
import content from "./content.module.css";

import type {
  VersusCampaignIcon,
  VersusCerrador,
  VersusEquipo,
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

const ITEMS_PER_PAGE = 3;

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
    <div className={content.campaignLogos}>
      {campaigns.map((campaign) => (
        <div
          key={campaign.id}
          className={content.logoWrap}
          title={campaign.nombre}
        >
          {campaign.logo_url ? (
            <Image
              src={campaign.logo_url}
              alt={campaign.nombre}
              fill
              unoptimized
              sizes="28px"
              className={content.logo}
            />
          ) : (
            <div className={content.fallback}>
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
  cerrador: VersusCerrador;
}) {
  return (
    <div className={content.member}>
      <div className={content.personImageWrap}>
        <Image
          src={cerrador.avatar_url?.trim() || DefaultPerson}
          alt={cerrador.nombre}
          fill
          unoptimized
          sizes="(min-width: 1600px) 45vw, 50vw"
          className={content.personImage}
        />
      </div>

      <div className={content.personData}>
        <div className={content.identity}>
        <div className={content.personName} title={cerrador.nombre}>
          {cerrador.nombre}
        </div>

        <div className={content.metadata}>
            {cerrador.sedes.map((sede) => (
              <span key={sede.id} className={content.sedeBadge}>
                {sede.nombre}
              </span>
            ))}
            <CampaignLogos campaigns={cerrador.campaigns} />
        </div>
        </div>
        <div className={content.memberScore}>
          <strong>{cerrador.ventas}</strong>
        </div>
      </div>
    </div>
  );
}

function EquipoInfo({
  equipo,
  isActive,
}: {
  equipo: VersusEquipo;
  isActive: boolean;
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(equipo.participantes.length / 2);
  const currentPage = page % Math.max(pageCount, 1);
  useEffect(() => {
    if (!isActive || pageCount <= 1) return;
    const timer = window.setInterval(() => setPage((value) => (value + 1) % pageCount), 8000);
    return () => window.clearInterval(timer);
  }, [isActive, pageCount]);

  return (
    <div
      className={`${content.team} ${equipo.lider ? content.teamLeader : ""}`}
      aria-label={`Equipo ${equipo.numero}${equipo.lider ? ", líder" : ""}`}
    >
      {equipo.participantes.length > 1 && (
        <div className={content.teamHeader}>
          <strong>EQUIPO {String(equipo.numero).padStart(2, "0")}</strong>
          {equipo.lider && <span className={content.headerLeader}>● LÍDER</span>}
          <span className={content.teamTotal} aria-label={`Puntaje total: ${equipo.ventas}`}>
            {equipo.ventas}
          </span>
        </div>
      )}
      {equipo.lider && equipo.participantes.length === 1 && <span className={content.leaderBadge}>● LÍDER</span>}
      {pageCount > 1 && <span className={content.rosterPage}>Integrantes {currentPage * 2 + 1}–{Math.min(currentPage * 2 + 2, equipo.participantes.length)} / {equipo.participantes.length}</span>}
      <div className={content.teamRoster}>
        {equipo.participantes.slice(currentPage * 2, currentPage * 2 + 2).map((cerrador) => (
          <CerradorInfo key={cerrador.id} cerrador={cerrador} />
        ))}
      </div>
    </div>
  );
}

/* =========================================
   FILA VERSUS
========================================= */

function VersusRow({
  versus,
  isActive,
}: {
  versus: VisorVersus;
  isActive: boolean;
}) {
  const isDuel = versus.equipos.length === 2 &&
    versus.equipos.every((equipo) => equipo.participantes.length === 1);

  return (
    <article className={`${content.row} ${isDuel ? content.duel : ""}`}>
      <div className={content.caption}>
        <h2>{versus.nombre}</h2>
        <span>{versus.equipos.length} equipos · {versus.equipos.reduce((total, equipo) => total + equipo.participantes.length, 0)} participantes</span>
      </div>
      <div className={content.teams}>
        {versus.equipos.map((equipo, index) => (
          <Fragment key={equipo.numero}>
            {index > 0 && <span className={content.duelSeparator}>VS</span>}
            <EquipoInfo equipo={equipo} isActive={isActive} />
          </Fragment>
        ))}
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
    // La actualización de datos debe reiniciar ambas capas de animación.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

      // Al ocultarse, la vista detiene inmediatamente su reproducción.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
                isActive={isActive && active === "a"}
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
                isActive={isActive && active === "b"}
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
