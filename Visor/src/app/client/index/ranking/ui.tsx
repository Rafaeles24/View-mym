"use client";

import { Ranking } from "@/types/ranking";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./ui.module.css";
import { socket } from "@/libs/socket";
import { formatDate } from "@/helpers/formatDate";
import AvatarIcon from "@/icons/avatar";
import Time from "@/components/time/ui";

export default function RankingClient({ data }: { data: Ranking }) {
  const [ranking, setRanking] = useState<Ranking>(data);

  const scrollingViewportRef = useRef<HTMLDivElement>(null);

  const sortedSupervisors = useMemo(() => {
    return [...ranking.supervisores].sort((a, b) => {
      if (a.puesto !== b.puesto) {
        return a.puesto - b.puesto;
      }

      if (a.tramitadas !== b.tramitadas) {
        return b.tramitadas - a.tramitadas;
      }

      return a.nombre.localeCompare(b.nombre, "es");
    });
  }, [ranking.supervisores]);

  const {
    firstPlaceSupervisors,
    scrollingSupervisors,
  } = useMemo(() => {
    const firstPosition = sortedSupervisors[0]?.puesto;

    if (firstPosition === undefined) {
      return {
        firstPlaceSupervisors: [],
        scrollingSupervisors: [],
      };
    }

    return {
      firstPlaceSupervisors: sortedSupervisors.filter(
        (supervisor) => supervisor.puesto === firstPosition
      ),

      scrollingSupervisors: sortedSupervisors.filter(
        (supervisor) => supervisor.puesto !== firstPosition
      ),
    };
  }, [sortedSupervisors]);

  const maxSales = useMemo(() => {
    return Math.max(
      ...sortedSupervisors.map(
        (supervisor) => supervisor.tramitadas
      ),
      1
    );
  }, [sortedSupervisors]);

  const rankingScrollVersion = useMemo(() => {
    return scrollingSupervisors
      .map(
        (supervisor) =>
          `${supervisor.colaborador_id}:${supervisor.puesto}:${supervisor.tramitadas}`
      )
      .join("|");
  }, [scrollingSupervisors]);

  useEffect(() => {
    let componentMounted = true;
    let refreshing = false;
    let refreshQueued = false;

    const abortController = new AbortController();

    const refreshRanking = async () => {
      if (refreshing) {
        refreshQueued = true;
        return;
      }

      refreshing = true;
      refreshQueued = false;

      try {
        const response = await fetch("/api/visor/ranking", {
          method: "GET",
          cache: "no-store",
          signal: abortController.signal,
          headers: {
            Accept: "application/json",
          },
        });

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

        if (refreshQueued && componentMounted) {
          void refreshRanking();
        }
      }
    };

    const handleConnect = () => {
      console.log("Socket conectado:", socket.id);

      socket.emit("join-ranking");

      void refreshRanking();
    };

    const handleDisconnect = (reason: string) => {
      console.warn("Socket desconectado:", reason);
    };

    const handleConnectError = (error: Error) => {
      console.error(
        "Error conectando con Socket.IO:",
        error.message
      );
    };

    const handleRankingRefresh = () => {
      console.log("Evento ranking:refresh recibido");

      void refreshRanking();
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("ranking:refresh", handleRankingRefresh);

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

      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off(
        "ranking:refresh",
        handleRankingRefresh
      );
    };
  }, []);

  useEffect(() => {
    const viewport = scrollingViewportRef.current;

    if (!viewport || scrollingSupervisors.length === 0) {
      return;
    }

    let animationFrameId = 0;
    let direction: 1 | -1 = 1;

    let previousTime = performance.now();
    let pauseUntil = previousTime + 1500;

    const SCROLL_SPEED = 35;
    const EDGE_PAUSE = 1500;

    viewport.scrollLeft = 0;

    const animateScroll = (currentTime: number) => {
      const maxScroll =
        viewport.scrollWidth - viewport.clientWidth;

      if (maxScroll <= 1) {
        viewport.scrollLeft = 0;
        previousTime = currentTime;

        animationFrameId =
          requestAnimationFrame(animateScroll);

        return;
      }

      if (currentTime < pauseUntil) {
        previousTime = currentTime;

        animationFrameId =
          requestAnimationFrame(animateScroll);

        return;
      }

      const deltaTime = Math.min(
        (currentTime - previousTime) / 1000,
        0.05
      );

      previousTime = currentTime;

      const nextPosition =
        viewport.scrollLeft +
        direction * SCROLL_SPEED * deltaTime;

      if (nextPosition >= maxScroll) {
        viewport.scrollLeft = maxScroll;
        direction = -1;
        pauseUntil = currentTime + EDGE_PAUSE;
      } else if (nextPosition <= 0) {
        viewport.scrollLeft = 0;
        direction = 1;
        pauseUntil = currentTime + EDGE_PAUSE;
      } else {
        viewport.scrollLeft = nextPosition;
      }

      animationFrameId =
        requestAnimationFrame(animateScroll);
    };

    animationFrameId =
      requestAnimationFrame(animateScroll);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    rankingScrollVersion,
    scrollingSupervisors.length,
  ]);

  const renderSupervisor = (
    supervisor: Ranking["supervisores"][number]
  ) => {
    const barPercentage =
      supervisor.tramitadas > 0
        ? Math.max(
            (supervisor.tramitadas / maxSales) * 100,
            4
          )
        : 0;

    return (
      <article
        key={supervisor.colaborador_id}
        className={styles.rankingBarColumn}
        data-position={supervisor.puesto}
      >
        <div className={styles.chartContent}>
          <div
              className={styles.barFill}
              style={{
                height: `${barPercentage}%`,
              }}
            />

          <div className={styles.principalStats}>

            <div className={styles.salesValue}>
              <strong>{supervisor.tramitadas}</strong>

              <span>
                {supervisor.tramitadas === 1
                  ? "TRAMITADA"
                  : "TRAMITADAS"}
              </span>

              <div className={styles.avatar}>
                <AvatarIcon />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.supervisorInformation}>
          <h3>{supervisor.nombre}</h3>

          <img
            className={styles.campaignLogo}
            src={supervisor.campania.logoUrl}
            alt={supervisor.campania.nombre}
          />

          <div className={styles.supervisorMetadata}>
            <span>{supervisor.sede.nombre}</span>
          </div>
          
        </div>

        <div className={styles.positionContainer}>
          <strong className={styles.positionNumber}>
            {supervisor.puesto}
          </strong>
        </div>
        
      </article>
    );
  };

  return (
    <main className={styles.ranking}>
      <div className={styles.clock}>
        <Time/>
        <Time timeZone="Europe/Madrid" />
      </div>
      <section className={styles.content}>
        <div className={styles.supervisoresSection}>
          {sortedSupervisors.length === 0 ? (
            <div className={styles.emptyState}>
              Esperando información de Sicacenter
            </div>
          ) : (
            <div
              className={styles.barRanking}
            >
              {firstPlaceSupervisors.length > 0 && (
                <div
                  className={styles.firstPosition}
                >
                  {firstPlaceSupervisors.map(
                    renderSupervisor
                  )}
                </div>
              )}

              {scrollingSupervisors.length > 0 && (
                <div
                  ref={scrollingViewportRef}
                  className={styles.scrollingContent}
                >
                  <div
                    className={styles.scrollingItem}
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

        <div className={styles.footer}>
          <h2>RANKING DIARIO DE SUPERVISORES</h2>

          <div className={styles.date}>
            <strong>
              {formatDate(ranking.fecha)}
            </strong>
          </div>
        </div>
      </section>
    </main>
  );
}