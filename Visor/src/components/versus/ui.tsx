"use client";

import {
  CSSProperties,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Image from "next/image";

import styles from "./ui.module.css";
import content from "./content.module.css";

import type {
  VersusCampaignIcon,
  VersusCerrador,
  VersusEquipo,
  VersusRangoFecha,
  VisorVersus,
} from "@/types/versus";

import LogoSvg from "@/icons/logo.svg";
import DefaultPerson from "@/images/default.png";
import VersusRango from "../versusRangoFecha/ui";

/* =========================================
   CONFIGURACIÓN
========================================= */

const PAGE_ROW_CAPACITY = 3;
const MAX_COLUMNS = 4;
const FADE_MS = 500;

type Layer = "a" | "b";

type VersusPage = {
  items: VisorVersus[];
  rows: number;
};

type MultiTeamRow = {
  equipos: VersusEquipo[];
  memberRows: number;
};

type TeamAccentStyle = CSSProperties & {
  "--team-accent": string;
  "--team-accent-rgb": string;
};

const oppositeLayer = (
  layer: Layer,
): Layer => {
  return layer === "a"
    ? "b"
    : "a";
};

/* =========================================
   COLORES DE LOS EQUIPOS
========================================= */

const TEAM_ACCENTS = [
  {
    hex: "#ed244b",
    rgb: "237,36,75",
  },
  {
    hex: "#2b6dff",
    rgb: "43,109,255",
  },
  {
    hex: "#f59e0b",
    rgb: "245,158,11",
  },
  {
    hex: "#22c55e",
    rgb: "34,197,94",
  },
  {
    hex: "#a855f7",
    rgb: "168,85,247",
  },
  {
    hex: "#06b6d4",
    rgb: "6,182,212",
  },
];

function getTeamAccent(
  teamNumber: number,
) {
  const index =
    (Math.max(teamNumber, 1) - 1) %
    TEAM_ACCENTS.length;

  return TEAM_ACCENTS[index];
}

function getTeamAccentStyle(
  teamNumber: number,
): TeamAccentStyle {
  const accent =
    getTeamAccent(teamNumber);

  return {
    "--team-accent":
      accent.hex,

    "--team-accent-rgb":
      accent.rgb,
  };
}

/* =========================================
   HELPERS
========================================= */

function isVersusDuel(
  versus: VisorVersus,
) {
  return (
    versus.equipos.length === 2 &&
    versus.equipos.every(
      (equipo) =>
        equipo.participantes.length === 1,
    )
  );
}

/* =========================================
   UNIDADES DEL EQUIPO
========================================= */

/*
 * Cada integrante representa
 * una unidad horizontal.
 *
 * 1 integrante = 1
 * 2 integrantes = 2
 * 3 integrantes = 3
 * 4+ integrantes = 4
 */

function getTeamUnits(
  equipo: VersusEquipo,
) {
  return Math.min(
    Math.max(
      equipo.participantes.length,
      1,
    ),
    MAX_COLUMNS,
  );
}

/* =========================================
   FILAS INTERNAS DEL EQUIPO
========================================= */

function getTeamMemberRows(
  equipo: VersusEquipo,
) {
  return Math.max(
    1,
    Math.ceil(
      equipo.participantes.length /
        MAX_COLUMNS,
    ),
  );
}

/* =========================================
   CREAR FILAS MULTI
========================================= */

function buildMultiTeamRows(
  equipos: VersusEquipo[],
): MultiTeamRow[] {
  const rows: MultiTeamRow[] = [];

  let currentTeams:
    VersusEquipo[] = [];

  let currentUnits = 0;

  const pushCurrentRow = () => {
    if (!currentTeams.length) {
      return;
    }

    rows.push({
      equipos: currentTeams,

      memberRows:
        Math.max(
          1,

          ...currentTeams.map(
            (equipo) =>
              getTeamMemberRows(
                equipo,
              ),
          ),
        ),
    });

    currentTeams = [];
    currentUnits = 0;
  };

  for (const equipo of equipos) {
    const units =
      getTeamUnits(
        equipo,
      );

    /*
     * Máximo cuatro unidades
     * por fila.
     */

    if (
      currentTeams.length > 0 &&
      currentUnits + units >
        MAX_COLUMNS
    ) {
      pushCurrentRow();
    }

    currentTeams.push(
      equipo,
    );

    currentUnits += units;

    if (
      currentUnits >=
      MAX_COLUMNS
    ) {
      pushCurrentRow();
    }
  }

  pushCurrentRow();

  return rows;
}

/* =========================================
   GRID DE UNA FILA MULTI
========================================= */

/*
 * Ahora el VS ocupa una columna REAL.
 *
 * Ejemplo:
 *
 * equipo 1 = 2 integrantes
 * equipo 2 = 1 integrante
 *
 * queda:
 *
 * 2fr | 84px | 1fr
 *
 * El separador ya no se superpone
 * sobre ningún equipo.
 */

function getMultiGridTemplate(
  row: MultiTeamRow,
) {
  const columns:
    string[] = [];

  row.equipos.forEach(
    (
      equipo,
      index,
    ) => {
      const units =
        getTeamUnits(
          equipo,
        );

      columns.push(
        `minmax(0, ${units}fr)`,
      );

      if (
        index <
        row.equipos.length - 1
      ) {
        columns.push(
          "var(--multi-vs-width)",
        );
      }
    },
  );

  return columns.join(
    " ",
  );
}

/* =========================================
   ALTURA DEL VERSUS
========================================= */

function getVersusRowSpan(
  versus: VisorVersus,
) {
  if (
    isVersusDuel(
      versus,
    )
  ) {
    return 1;
  }

  const rows =
    buildMultiTeamRows(
      versus.equipos,
    );

  return Math.max(
    1,

    rows.reduce(
      (
        total,
        row,
      ) =>
        total +
        row.memberRows,
      0,
    ),
  );
}

/* =========================================
   PAGINACIÓN DINÁMICA
========================================= */

function buildPages(
  data: VisorVersus[],
): VersusPage[] {
  const result:
    VersusPage[] = [];

  let currentItems:
    VisorVersus[] = [];

  let currentRows = 0;

  const pushPage = () => {
    if (
      !currentItems.length
    ) {
      return;
    }

    result.push({
      items:
        currentItems,

      rows:
        Math.max(
          PAGE_ROW_CAPACITY,
          currentRows,
        ),
    });

    currentItems = [];
    currentRows = 0;
  };

  for (const versus of data) {
    const span =
      getVersusRowSpan(
        versus,
      );

    if (
      currentItems.length > 0 &&
      currentRows + span >
        PAGE_ROW_CAPACITY
    ) {
      pushPage();
    }

    currentItems.push(
      versus,
    );

    currentRows += span;

    if (
      currentRows >=
      PAGE_ROW_CAPACITY
    ) {
      pushPage();
    }
  }

  pushPage();

  return result;
}

function emptyPage():
  VersusPage {
  return {
    items: [],

    rows:
      PAGE_ROW_CAPACITY,
  };
}

/* =========================================
   LOGOS DE CAMPAÑAS
========================================= */

function CampaignLogos({
  campaigns,
}: {
  campaigns:
    VersusCampaignIcon[];
}) {
  if (!campaigns.length) {
    return null;
  }

  return (
    <div
      className={
        content.campaignLogos
      }
    >
      {campaigns.map(
        (campaign) => (
          <div
            key={
              campaign.id
            }
            className={
              content.logoWrap
            }
            title={
              campaign.nombre
            }
          >
            {campaign.logo_url ? (
              <img
                src={
                  campaign.logo_url
                }
                alt={
                  campaign.nombre
                }
                className={
                  content.logo
                }
              />
            ) : (
              <div
                className={
                  content.fallback
                }
                style={{
                  backgroundColor:
                    campaign.hex ||
                    "#2563eb",
                }}
              >
                {campaign.nombre
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}
          </div>
        ),
      )}
    </div>
  );
}

/* =========================================
   PARTICIPANTE
========================================= */

function CerradorInfo({
  cerrador,
  showScore = true,
  scoreValue,
}: {
  cerrador:
    VersusCerrador;

  showScore?: boolean;

  scoreValue?: number;
}) {
  const avatar =
    cerrador.avatar_url?.trim();

  const displayScore =
    scoreValue ??
    cerrador.ventas;

  return (
    <div
      className={
        content.member
      }
    >
      {/* AVATAR */}

      <div
        className={
          content.personImageWrap
        }
      >
        {avatar ? (
          <img
            src={avatar}
            alt={
              cerrador.nombre
            }
            className={
              content.personImage
            }
          />
        ) : (
          <Image
            src={
              DefaultPerson
            }
            alt={
              cerrador.nombre
            }
            fill
            sizes="25vw"
            className={
              content.personImage
            }
          />
        )}
      </div>

      {/* DATOS */}

      <div
        className={
          content.personData
        }
      >
        <div
          className={
            content.identity
          }
        >
          <div
            className={
              content.personName
            }
            title={
              cerrador.nombre
            }
          >
            {
              cerrador.nombre
            }
          </div>

          <div
            className={
              content.metadata
            }
          >
            {cerrador.sedes.map(
              (sede) => (
                <span
                  key={
                    sede.id
                  }
                  className={
                    content.sedeBadge
                  }
                >
                  {
                    sede.nombre
                  }
                </span>
              ),
            )}

            <CampaignLogos
              campaigns={
                cerrador.campaigns
              }
            />
          </div>
        </div>

        {/* PUNTAJE */}

        {showScore && (
          <div
            className={
              content.memberScore
            }
          >
            <strong>
              {
                displayScore
              }
            </strong>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================
   EQUIPO
========================================= */

function EquipoInfo({
  equipo,
  isDuel,
}: {
  equipo: VersusEquipo;
  isDuel: boolean;
}) {
  const totalMembers =
    equipo.participantes.length;

  /*
   * MULTI con 1 integrante:
   * no mostrar score individual.
   *
   * 1vs1:
   * sí mostrar marcador.
   */
  const showIndividualScore =
    isDuel ||
    totalMembers > 1;

  const teamAccentStyle =
    getTeamAccentStyle(
      equipo.numero,
    );

  const memberColumns =
    Math.min(
      Math.max(
        equipo.participantes.length,
        1,
      ),
      MAX_COLUMNS,
    );

  return (
    <div
      className={`
        ${content.team}
        ${
          equipo.lider
            ? content.teamLeader
            : ""
        }
      `}
      style={
        teamAccentStyle
      }
    >
      {/* HEADER MULTI */}

      {!isDuel && (
        <div
          className={
            content.teamHeader
          }
        >
          <strong>
            EQUIPO{" "}
            {String(
              equipo.numero,
            ).padStart(
              2,
              "0",
            )}
          </strong>

          {equipo.lider && (
            <span
              className={
                content.headerLeader
              }
            >
              ● EN VENTAJA
            </span>
          )}

          <span
            className={
              content.teamTotal
            }
          >
            {
              equipo.ventas
            }
          </span>
        </div>
      )}

      {/* BADGE 1VS1 */}

      {isDuel &&
        equipo.lider && (
          <span
            className={
              content.leaderBadge
            }
          >
            ● EN VENTAJA
          </span>
        )}

      {/* PARTICIPANTES */}

      <div
        className={`
          ${content.teamRoster}
          ${
            !isDuel
              ? content.multiRoster
              : ""
          }
        `}
        style={
          !isDuel
            ? {
                gridTemplateColumns:
                  `repeat(${memberColumns}, minmax(0, 1fr))`,
              }
            : undefined
        }
      >
        {equipo.participantes.map(
          (cerrador) => (
            <CerradorInfo
              key={
                cerrador.id
              }
              cerrador={
                cerrador
              }
              showScore={
                showIndividualScore
              }
              scoreValue={
                isDuel
                  ? equipo.ventas
                  : undefined
              }
            />
          ),
        )}
      </div>
    </div>
  );
}

/* =========================================
   SEPARADOR MULTI
========================================= */

/*
 * Utilizamos exactamente el mismo
 * componente visual que el 1vs1.
 *
 * La diferencia es que en multi
 * ocupa una columna real del GRID.
 */

function MultiSeparator() {
  return (
    <div
      className={`
        ${content.duelSeparator}
        ${content.multiSeparator}
      `}
      aria-hidden="true"
    >
      <span>
        VS
      </span>
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
  const isDuel =
    isVersusDuel(
      versus,
    );

  const totalParticipantes =
    versus.equipos.reduce(
      (
        total,
        equipo,
      ) =>
        total +
        equipo.participantes
          .length,
      0,
    );

  const rowSpan =
    getVersusRowSpan(
      versus,
    );

  const leaderExists =
    versus.equipos.some(
      (equipo) =>
        equipo.lider,
    );

  /* =========================================
     1 VS 1
  ========================================= */

  if (isDuel) {
    return (
      <article
        className={`
          ${content.row}
          ${content.duel}
        `}
        style={{
          gridRow:
            `span ${rowSpan}`,
        }}
      >
        <div
          className={
            content.caption
          }
        >
          <h2>
            {
              versus.nombre
            }
          </h2>

          <span>
            {
              versus.equipos.length
            }{" "}
            equipos ·{" "}
            {
              totalParticipantes
            }{" "}
            participantes
          </span>
        </div>

        <div
          className={`
            ${content.versusCard}
            ${
              leaderExists
                ? content.hasLeader
                : ""
            }
          `}
        >
          <div
            className={
              content.teams
            }
          >
            {versus.equipos.map(
              (
                equipo,
                index,
              ) => (
                <Fragment
                  key={
                    equipo.numero
                  }
                >
                  {index > 0 && (
                    <div
                      className={
                        content.duelSeparator
                      }
                    >
                      <span>
                        VS
                      </span>
                    </div>
                  )}

                  <EquipoInfo
                    equipo={
                      equipo
                    }
                    isDuel
                  />
                </Fragment>
              ),
            )}
          </div>
        </div>
      </article>
    );
  }

  /* =========================================
     MULTI
  ========================================= */

  const teamRows =
    buildMultiTeamRows(
      versus.equipos,
    );

  return (
    <article
      className={`
        ${content.row}
        ${content.multi}
      `}
      style={{
        gridRow:
          `span ${rowSpan}`,
      }}
    >
      <div
        className={
          content.caption
        }
      >
        <h2>
          {
            versus.nombre
          }
        </h2>

        <span>
          {
            versus.equipos.length
          }{" "}
          equipos ·{" "}
          {
            totalParticipantes
          }{" "}
          participantes
        </span>
      </div>

      <div
        className={`
          ${content.versusCard}
          ${
            leaderExists
              ? content.hasLeader
              : ""
          }
        `}
      >
        <div
          className={`
            ${content.teams}
            ${content.multiTeams}
          `}
        >
          {teamRows.map(
            (
              row,
              rowIndex,
            ) => (
              <div
                key={
                  rowIndex
                }
                className={
                  content.teamRow
                }
                style={{
                  /*
                   * Ejemplo:
                   *
                   * 1 vs 1 vs 1
                   *
                   * 1fr 84px
                   * 1fr 84px
                   * 1fr
                   *
                   *
                   * 2 integrantes vs 1
                   *
                   * 2fr 84px 1fr
                   */
                  gridTemplateColumns:
                    getMultiGridTemplate(
                      row,
                    ),

                  flexGrow:
                    row.memberRows,
                }}
              >
                {row.equipos.map(
                  (
                    equipo,
                    index,
                  ) => (
                    <Fragment
                      key={
                        equipo.numero
                      }
                    >
                      {index > 0 && (
                        <MultiSeparator />
                      )}

                      <div
                        className={
                          content.teamSlot
                        }
                      >
                        <EquipoInfo
                          equipo={
                            equipo
                          }
                          isDuel={
                            false
                          }
                        />
                      </div>
                    </Fragment>
                  ),
                )}
              </div>
            ),
          )}
        </div>
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
  versusRango:
    VersusRangoFecha;
  isActive: boolean;
}) {
  /* =========================================
     PÁGINAS
  ========================================= */

  const pages =
    useMemo(
      () =>
        buildPages(
          data,
        ),
      [data],
    );

  /* =========================================
     ESTADOS
  ========================================= */

  const [
    pageIndex,
    setPageIndex,
  ] = useState(0);

  const [
    active,
    setActive,
  ] =
    useState<Layer>("a");

  const [
    layerPages,
    setLayerPages,
  ] = useState<
    Record<
      Layer,
      VersusPage
    >
  >(() => ({
    a:
      pages[0] ??
      emptyPage(),

    b:
      pages[1] ??
      emptyPage(),
  }));

  const [
    playbackReady,
    setPlaybackReady,
  ] = useState(false);

  /* =========================================
     REFS
  ========================================= */

  const onCompleteRef =
    useRef(onComplete);

  const activeRef =
    useRef<Layer>("a");

  const pageIndexRef =
    useRef(0);

  const pagesRef =
    useRef<
      VersusPage[]
    >(pages);

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

  const previousIsActiveRef =
    useRef(false);

  /* =========================================
     SINCRONIZAR REFS
  ========================================= */

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

  /* =========================================
     CANCELAR FRAMES
  ========================================= */

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

  /* =========================================
     RESET
  ========================================= */

  const resetVersus =
    useCallback(() => {
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

      pageIndexRef.current =
        0;

      setPageIndex(0);

      activeRef.current =
        "a";

      setActive("a");

      const list =
        pagesRef.current;

      setLayerPages({
        a:
          list[0] ??
          emptyPage(),

        b:
          list[1] ??
          emptyPage(),
      });
    }, []);

  /* =========================================
     FINALIZAR
  ========================================= */

  const completeVersus =
    useCallback(() => {
      if (
        completedRef.current
      ) {
        return;
      }

      completedRef.current =
        true;

      setPlaybackReady(
        false,
      );

      onCompleteRef.current?.();
    }, []);

  /* =========================================
     AVANZAR
  ========================================= */

  const advance =
    useCallback(() => {
      if (
        !isActive ||
        !playbackReady
      ) {
        return;
      }

      const list =
        pagesRef.current;

      if (!list.length) {
        completeVersus();
        return;
      }

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

      if (isLastPage) {
        completeVersus();
        return;
      }

      transitioningRef.current =
        true;

      const from =
        activeRef.current;

      const to =
        oppositeLayer(
          from,
        );

      const nextIndex =
        currentIndex + 1;

      const preloadIndex =
        nextIndex + 1;

      setLayerPages(
        (current) => ({
          ...current,

          [to]:
            list[
              nextIndex
            ] ??
            emptyPage(),
        }),
      );

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
            pageIndexRef.current =
              nextIndex;

            setPageIndex(
              nextIndex,
            );

            setLayerPages(
              (current) => ({
                ...current,

                [from]:
                  list[
                    preloadIndex
                  ] ??
                  emptyPage(),
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
      isActive,
      playbackReady,
      completeVersus,
    ]);

  /* =========================================
     DATA
  ========================================= */

  useEffect(() => {
    pagesRef.current =
      pages;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    resetVersus();
  }, [
    pages,
    resetVersus,
  ]);

  /* =========================================
     ACTIVACIÓN
  ========================================= */

  useEffect(() => {
    const wasActive =
      previousIsActiveRef.current;

    previousIsActiveRef.current =
      isActive;

    if (!isActive) {
      cancelFrames();

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlaybackReady(
        false,
      );

      return;
    }

    if (
      isActive &&
      !wasActive
    ) {
      resetVersus();

      setPlaybackReady(
        false,
      );

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

  /* =========================================
     PÁGINA ACTIVA
  ========================================= */

  const activePage =
    layerPages[active];

  /* =========================================
     TIMER
  ========================================= */

  useEffect(() => {
    if (
      !isActive ||
      !playbackReady
    ) {
      return;
    }

    if (
      !pagesRef.current.length
    ) {
      completeVersus();

      return;
    }

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
    active,
    activePage,
    durationMs,
    advance,
    completeVersus,
  ]);

  /* =========================================
     CLEANUP
  ========================================= */

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

  if (!data.length) {
    return null;
  }

  /* =========================================
     RENDER
  ========================================= */

  return (
    <main
      className={
        styles.container
      }
    >
      {/* HEADER */}

      <header
        className={
          styles.header
        }
      >
        <div
          className={
            styles.titleContent
          }
        >
          <Image
            src={LogoSvg}
            width={80}
            height={80}
            alt=""
            aria-hidden="true"
          />

          <div
            className={
              styles.titulo
            }
          >
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
              Disciplina hoy,
              grandes resultados mañana
            </p>
          </div>
        </div>

        <div
          className={
            styles.rankingRango
          }
        >
          <VersusRango
            schedule={
              versusRango
            }
          />
        </div>
      </header>

      {/* STAGE */}

      <div
        className={
          styles.versusStage
        }
      >
        {/* CAPA A */}

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
          style={{
            gridTemplateRows:
              `repeat(${layerPages.a.rows}, minmax(0, 1fr))`,
          }}
        >
          {layerPages.a.items.map(
            (versus) => (
              <VersusRow
                key={
                  versus.id
                }
                versus={
                  versus
                }
              />
            ),
          )}
        </section>

        {/* CAPA B */}

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
          style={{
            gridTemplateRows:
              `repeat(${layerPages.b.rows}, minmax(0, 1fr))`,
          }}
        >
          {layerPages.b.items.map(
            (versus) => (
              <VersusRow
                key={
                  versus.id
                }
                versus={
                  versus
                }
              />
            ),
          )}
        </section>
      </div>

      {/* PAGINACIÓN */}

      {pages.length > 1 && (
        <div
          className={
            styles.pagination
          }
        >
          {pages.map(
            (
              _,
              index,
            ) => (
              <span
                key={index}
                className={`
                  ${styles.dot}
                  ${
                    index ===
                    pageIndex
                      ? styles.dotActive
                      : ""
                  }
                `}
              />
            ),
          )}
        </div>
      )}
    </main>
  );
}