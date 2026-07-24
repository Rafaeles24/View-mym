"use client";

import { Ranking } from "@/types/ranking";
import {
  type CSSProperties,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./ui.module.css";
import { socket } from "@/libs/socket";
import { formatDate } from "@/helpers/formatDate";
import AvatarIcon from "@/icons/avatar";
import Time from "@/components/time/ui";
import RankingIcon from "@/icons/ranking";
import InfoBar from "@/components/infoBar/ui";

type SupervisorRanking =
  Ranking["supervisores"][number];

type SedeRanking =
  Ranking["rankingSedes"][number];

type SupervisorCardStyle = CSSProperties & {
  "--campaign-color": string;
  "--position-color": string;
};

type SedeCardStyle = CSSProperties & {
  "--site-position-color": string;
};

const numberFormatter = new Intl.NumberFormat(
  "es-PE"
);

export default function RankingClient({
  data,
}: {
  data: Ranking;
}) {
  const [ranking, setRanking] =
    useState<Ranking>(data);

  /*
   * Referencia utilizada para activar fullscreen
   * sobre todo el componente.
   */
  const rankingContainerRef =
    useRef<HTMLElement | null>(null);

  /*
   * Viewport independiente de los primeros puestos.
   */
  const firstPositionViewportRef =
    useRef<HTMLDivElement | null>(null);

  /*
   * Viewport independiente de los demás puestos.
   */
  const lowerPositionViewportRef =
    useRef<HTMLDivElement | null>(null);

  /*
   * Ordenamiento del ranking de sedes.
   */
  const sortedSites = useMemo(() => {
    return [...ranking.rankingSedes].sort(
      (a, b) => {
        if (a.puesto !== b.puesto) {
          return a.puesto - b.puesto;
        }

        if (
          a.totalVentas !== b.totalVentas
        ) {
          return (
            b.totalVentas - a.totalVentas
          );
        }

        return a.sede.nombre.localeCompare(
          b.sede.nombre,
          "es"
        );
      }
    );
  }, [ranking.rankingSedes]);

  /*
   * Ordenamiento del ranking de supervisores.
   */
  const sortedSupervisors = useMemo(() => {
    return [...ranking.supervisores].sort(
      (a, b) => {
        if (a.puesto !== b.puesto) {
          return a.puesto - b.puesto;
        }

        if (a.tramitadas !== b.tramitadas) {
          return b.tramitadas - a.tramitadas;
        }

        return a.nombre.localeCompare(
          b.nombre,
          "es"
        );
      }
    );
  }, [ranking.supervisores]);

  /*
   * Separa todos los supervisores que comparten
   * el primer lugar del resto.
   */
  const {
    firstPlaceSupervisors,
    scrollingSupervisors,
  } = useMemo(() => {
    const firstPosition =
      sortedSupervisors[0]?.puesto;

    if (firstPosition === undefined) {
      return {
        firstPlaceSupervisors: [],
        scrollingSupervisors: [],
      };
    }

    return {
      firstPlaceSupervisors:
        sortedSupervisors.filter(
          (supervisor) =>
            supervisor.puesto ===
            firstPosition
        ),

      scrollingSupervisors:
        sortedSupervisors.filter(
          (supervisor) =>
            supervisor.puesto !==
            firstPosition
        ),
    };
  }, [sortedSupervisors]);

  const maxSales = useMemo(() => {
    return Math.max(
      ...sortedSupervisors.map(
        (supervisor) =>
          supervisor.tramitadas
      ),
      1
    );
  }, [sortedSupervisors]);

  /*
   * Versiones utilizadas para reiniciar cada
   * scroll cuando cambien sus datos.
   */
  const firstPositionScrollVersion =
    useMemo(() => {
      return firstPlaceSupervisors
        .map(
          (supervisor) =>
            `${supervisor.colaborador_id}:${supervisor.puesto}:${supervisor.tramitadas}`
        )
        .join("|");
    }, [firstPlaceSupervisors]);

  const lowerPositionScrollVersion =
    useMemo(() => {
      return scrollingSupervisors
        .map(
          (supervisor) =>
            `${supervisor.colaborador_id}:${supervisor.puesto}:${supervisor.tramitadas}`
        )
        .join("|");
    }, [scrollingSupervisors]);

  const hasLowerPositions =
    scrollingSupervisors.length > 0;

  const hasMoreThanTwoFirstPositions =
    firstPlaceSupervisors.length > 2;

  const hasMoreThanTwoLowerPositions =
    scrollingSupervisors.length > 2;

  /*
   * Distribución del contenedor de primeros puestos.
   */
  const firstPositionSizeClass =
    !hasLowerPositions
      ? styles.firstPositionFull
      : hasMoreThanTwoFirstPositions &&
          hasMoreThanTwoLowerPositions
        ? styles.firstPositionLimited
        : hasMoreThanTwoFirstPositions
          ? styles.firstPositionFlexible
          : styles.firstPositionNatural;

  /*
   * Distribución del contenedor de puestos inferiores.
   */
  const lowerPositionSizeClass =
    scrollingSupervisors.length <= 2
      ? styles.scrollingContentCompact
      : styles.scrollingContentFlexible;

  /*
   * Fullscreen mediante doble clic.
   */
  const toggleFullscreen = async () => {
    const container =
      rankingContainerRef.current;

    if (!container) {
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await container.requestFullscreen();
    } catch (error) {
      console.error(
        "No se pudo cambiar el modo fullscreen:",
        error
      );
    }
  };

  /*
   * Conexión y actualización con Socket.IO.
   */
  useEffect(() => {
    let componentMounted = true;
    let refreshing = false;
    let refreshQueued = false;

    const abortController =
      new AbortController();

    const refreshRanking = async () => {
      if (refreshing) {
        refreshQueued = true;
        return;
      }

      refreshing = true;
      refreshQueued = false;

      try {
        const response = await fetch(
          "/api/visor/ranking",
          {
            method: "GET",
            cache: "no-store",
            signal: abortController.signal,
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `No se pudo actualizar el ranking. Estado: ${response.status}`
          );
        }

        const updatedRanking =
          (await response.json()) as Ranking;

        if (componentMounted) {
          setRanking(updatedRanking);
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error(
          "Error actualizando el ranking:",
          error
        );
      } finally {
        refreshing = false;

        if (
          refreshQueued &&
          componentMounted
        ) {
          void refreshRanking();
        }
      }
    };

    const handleConnect = () => {
      console.log(
        "Socket conectado:",
        socket.id
      );

      socket.emit("join-ranking");

      void refreshRanking();
    };

    const handleDisconnect = (
      reason: string
    ) => {
      console.warn(
        "Socket desconectado:",
        reason
      );
    };

    const handleConnectError = (
      error: Error
    ) => {
      console.error(
        "Error conectando con Socket.IO:",
        error.message
      );
    };

    const handleRankingRefresh = () => {
      console.log(
        "Evento ranking:refresh recibido"
      );

      void refreshRanking();
    };

    socket.on("connect", handleConnect);

    socket.on(
      "disconnect",
      handleDisconnect
    );

    socket.on(
      "connect_error",
      handleConnectError
    );

    socket.on(
      "ranking:refresh",
      handleRankingRefresh
    );

    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    return () => {
      componentMounted = false;

      abortController.abort();

      if (socket.connected) {
        socket.emit("leave-ranking");
      }

      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );

      socket.off(
        "connect_error",
        handleConnectError
      );

      socket.off(
        "ranking:refresh",
        handleRankingRefresh
      );
    };
  }, []);

  /*
   * Scroll de los primeros puestos.
   */
  useHorizontalPingPongScroll(
    firstPositionViewportRef,
    firstPositionScrollVersion
  );

  /*
   * Scroll de los puestos inferiores.
   */
  useHorizontalPingPongScroll(
    lowerPositionViewportRef,
    lowerPositionScrollVersion
  );

  /*
   * Renderiza una sede dentro del ranking superior.
   */
  const renderSite = (
    siteRanking: SedeRanking
  ) => {
    const siteStyle: SedeCardStyle = {
      "--site-position-color":
        getPositionColor(
          siteRanking.puesto
        ),
    };

    return (
      <article
        key={siteRanking.sede.id}
        className={styles.siteRankingItem}
        data-position={
          siteRanking.puesto
        }
        style={siteStyle}
      >
        <div
          className={styles.sitePosition}
        >
          <span>#</span>

          <strong>
            {siteRanking.puesto}
          </strong>
        </div>

        <div className={styles.siteInfo}>
          <strong
            title={siteRanking.sede.nombre}
          >
            {siteRanking.sede.nombre}
          </strong>
        </div>

        <div className={styles.siteSales}>
          <strong>
            {numberFormatter.format(
              siteRanking.totalVentas
            )}
          </strong>
        </div>
      </article>
    );
  };

  /*
   * Renderiza una tarjeta de supervisor.
   */
  const renderSupervisor = (
    supervisor: SupervisorRanking
  ) => {
    const barPercentage =
      supervisor.tramitadas > 0
        ? Math.max(
            (supervisor.tramitadas /
              maxSales) *
              100,
            4
          )
        : 0;

    const campaignColor =
      supervisor.campania.hex?.trim() ||
      "#6b7280";

    const positionColor =
      getPositionColor(
        supervisor.puesto
      );

    /*
     * Variables CSS utilizadas para construir
     * el borde degradado.
     */
    const supervisorCardStyle: SupervisorCardStyle =
      {
        "--campaign-color":
          campaignColor,

        "--position-color":
          positionColor,
      };

    return (
      <article
        key={supervisor.colaborador_id}
        className={
          styles.rankingBarColumn
        }
        data-position={
          supervisor.puesto
        }
        style={supervisorCardStyle}
      >
        <div
          className={styles.chartContent}
        >
          <div className={styles.salesValue}>
              <strong>
                {supervisor.tramitadas}
              </strong>

              <span>
                {supervisor.tramitadas === 1
                  ? "VENTA"
                  : "VENTAS"}
              </span>
          </div>

          <div
            className={styles.barFill}
            style={{
              height: `${barPercentage}%`,
            }}
          />

          <div
            className={
              styles.principalStats
            }
          >
            <div
                className={styles.avatar}
              >
                <AvatarIcon />
            </div>
          </div>
        </div>

        <div
          className={
            styles.supervisorInformation
          }
        >
          <h3>{supervisor.nombre}</h3>

          {supervisor.campania
            .logoUrl && (
            <img
              className={
                styles.campaignLogo
              }
              src={
                supervisor.campania
                  .logoUrl
              }
              alt={
                supervisor.campania
                  .nombre
              }
            />
          )}

          <div
            className={
              styles.supervisorMetadata
            }
          >
            <span>
              {supervisor.sede.nombre}
            </span>
          </div>
        </div>

        <div
          className={
            styles.positionContainer
          }
        >
          <strong
            className={
              styles.positionNumber
            }
          >
            {supervisor.puesto}
          </strong>
        </div>
      </article>
    );
  };

  return (
    <main
      ref={rankingContainerRef}
      className={styles.ranking}
      onDoubleClick={() => {
        void toggleFullscreen();
      }}
    >
      <div className={styles.header}>
        <div
          className={styles.headerTitle}
        >
          <RankingIcon />

          <div>
            <h1>
              RANKING DIARIO DE VENTAS
              MYMCORP
            </h1>

            <p>
              Actualizado el{" "}
              {formatDate(ranking.fecha)} a
              las{" "}
              <strong>
                {ranking.hora}
              </strong>
            </p>
          </div>
        </div>

        <div className={styles.clock}>
          <Time />

          <Time timeZone="Europe/Madrid" />
        </div>
      </div>

      <div
        className={
          styles.overviewSection
        }
      >
        <article
          className={
            styles.totalSalesCard
          }
        >
          <div
            className={
              styles.totalSalesContent
            }
          >
            <strong>
              {numberFormatter.format(
                ranking.totalVentas
              )}
            </strong>
            <div>
              <div>
                <span
                  className={
                    styles.totalSalesLabel
                  }
                >
                  VENTAS
                </span>
              </div>
              <div>
                <span
                  className={
                    styles.totalSalesLabel
                  }
                >
                  TOTALES
                </span>
              </div>
            </div>
          </div>
        </article>
        <section
          className={
            styles.sitesRankingCard
          }
        >
          <div
            className={
              styles.sitesRankingHeader
            }
          >
            <div>
              <span>
                DESEMPEÑO GENERAL
              </span>
              <h2>
                VENTAS POR SEDES
              </h2>
            </div>
          </div>
          {sortedSites.length === 0 ? (
            <div
              className={
                styles.emptySites
              }
            >
              Esperando informacion de Sicacentercrm.com
            </div>
          ) : (
            <div
              className={
                styles.sitesRankingList
              }
            >
              {sortedSites.map(
                renderSite
              )}
            </div>
          )}
        </section>
      </div>

      <section className={styles.content}>
        <div className={styles.contentCont}>
          <div className={styles.supTitle}>
            <h3>
              RANKING DE SUPERVISORES
            </h3>
          </div>

          <div
            className={
              styles.supervisoresSection
            }
          >
            {sortedSupervisors.length ===
            0 ? (
              <div
                className={styles.emptyState}
              >
                El ranking aparecerá y se
                actualizará en el transcurso del
                día.
              </div>
            ) : (
              <div
                className={styles.barRanking}
              >
                {firstPlaceSupervisors.length >
                  0 && (
                  <div
                    ref={
                      firstPositionViewportRef
                    }
                    className={[
                      styles.firstPosition,
                      firstPositionSizeClass,
                    ].join(" ")}
                  >
                    <div
                      className={
                        styles.scrollingItem
                      }
                    >
                      {firstPlaceSupervisors.map(
                        renderSupervisor
                      )}
                    </div>
                  </div>
                )}

                {scrollingSupervisors.length >
                  0 && (
                  <div
                    ref={
                      lowerPositionViewportRef
                    }
                    className={[
                      styles.scrollingContent,
                      lowerPositionSizeClass,
                    ].join(" ")}
                  >
                    <div
                      className={
                        styles.scrollingItem
                      }
                    >
                      {scrollingSupervisors.map(
                        renderSupervisor
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className={styles.footer}>
        <InfoBar
          agentes={ranking.agentes}
          intervalo={10_000}
        />
      </div>
    </main>
  );
}

/*
 * Scroll automático:
 *
 * izquierda → derecha → pausa
 * derecha → izquierda → pausa
 * loop infinito
 */
function useHorizontalPingPongScroll(
  viewportRef: RefObject<
    HTMLDivElement | null
  >,
  version: string
) {
  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    let animationFrameId = 0;
    let direction: 1 | -1 = 1;

    let previousTime =
      performance.now();

    let pauseUntil =
      previousTime + 1500;

    const SCROLL_SPEED_PX_PER_SECOND =
      35;

    const EDGE_PAUSE_MS = 1500;

    viewport.scrollLeft = 0;

    const animateScroll = (
      currentTime: number
    ) => {
      const maxScroll = Math.max(
        0,
        viewport.scrollWidth -
          viewport.clientWidth
      );

      if (maxScroll <= 1) {
        viewport.scrollLeft = 0;
        previousTime = currentTime;

        animationFrameId =
          requestAnimationFrame(
            animateScroll
          );

        return;
      }

      if (currentTime < pauseUntil) {
        previousTime = currentTime;

        animationFrameId =
          requestAnimationFrame(
            animateScroll
          );

        return;
      }

      const deltaTime = Math.min(
        (currentTime - previousTime) /
          1000,
        0.05
      );

      previousTime = currentTime;

      const nextPosition =
        viewport.scrollLeft +
        direction *
          SCROLL_SPEED_PX_PER_SECOND *
          deltaTime;

      if (nextPosition >= maxScroll) {
        viewport.scrollLeft = maxScroll;
        direction = -1;

        pauseUntil =
          currentTime + EDGE_PAUSE_MS;
      } else if (nextPosition <= 0) {
        viewport.scrollLeft = 0;
        direction = 1;

        pauseUntil =
          currentTime + EDGE_PAUSE_MS;
      } else {
        viewport.scrollLeft =
          nextPosition;
      }

      animationFrameId =
        requestAnimationFrame(
          animateScroll
        );
    };

    animationFrameId =
      requestAnimationFrame(
        animateScroll
      );

    return () => {
      cancelAnimationFrame(
        animationFrameId
      );
    };
  }, [viewportRef, version]);
}

function getPositionColor(
  position: number
): string {
  if (position === 1) {
    return "#fbbf24";
  }

  if (position === 2) {
    return "#cbd5e1";
  }

  if (position === 3) {
    return "#cd7f32";
  }

  return "#ef4444";
}