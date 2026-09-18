"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import styles from "./ui.module.css";

import { SedeMedia } from "@/types/media";
import { detectMediaKind } from "@/lib/mediaKind";

const FADE_MS = 500;

const DEFAULT_IMAGE_DURATION =
  5000;

const VIDEO_START_TIMEOUT =
  5000;

type Layer =
  | "a"
  | "b";

type PlayerMedia =
  SedeMedia["medias"][number];

const oppositeLayer = (
  layer: Layer,
): Layer => {
  return layer === "a"
    ? "b"
    : "a";
};

export default function PlayerUI({
  sede,
  onComplete,
  isActive,
}: {
  sede: SedeMedia | null;
  onComplete?: () => void;
  isActive: boolean;
}) {
  /*
   * ============================
   * PLAYLIST
   * ============================
   */

  const medias =
    sede?.medias ?? [];

  /*
   * ============================
   * ESTADO
   * ============================
   */

  const [
    index,
    setIndex,
  ] = useState(0);

  const [
    active,
    setActive,
  ] =
    useState<Layer>("a");

  const [
    layerMedia,
    setLayerMedia,
  ] = useState<
    Record<
      Layer,
      PlayerMedia | null
    >
  >({
    a:
      medias[0] ??
      null,

    b:
      medias[1] ??
      null,
  });

  /*
   * Este contador representa
   * una nueva pasada completa
   * del Player.
   *
   * Cada vez que:
   *
   * ranking -> player
   *
   * aumenta en 1.
   */
  const [
    playbackCycle,
    setPlaybackCycle,
  ] = useState(0);

  /*
   * Antes de reproducir esperamos
   * a que ViewRotator realmente haya
   * colocado esta capa delante.
   */
  const [
    playbackReady,
    setPlaybackReady,
  ] = useState(false);

  /*
   * ============================
   * VIDEO REFS
   * ============================
   */

  const videoA =
    useRef<HTMLVideoElement>(
      null,
    );

  const videoB =
    useRef<HTMLVideoElement>(
      null,
    );

  /*
   * ============================
   * REFS
   * ============================
   */

  const activeRef =
    useRef<Layer>("a");

  const indexRef =
    useRef(0);

  const mediasRef =
    useRef<PlayerMedia[]>(
      medias,
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

  const previousIsActiveRef =
    useRef(isActive);

  /*
   * ============================
   * SINCRONIZAR REFS
   * ============================
   */

  useEffect(() => {
    activeRef.current =
      active;
  }, [
    active,
  ]);

  useEffect(() => {
    indexRef.current =
      index;
  }, [
    index,
  ]);

  useEffect(() => {
    mediasRef.current =
      medias;
  }, [
    medias,
  ]);

  /*
   * ============================
   * MEDIA ACTIVA
   * ============================
   */

  const activeMedia =
    layerMedia[
      active
    ];

  const activeKind =
    activeMedia
      ? detectMediaKind(
          activeMedia.url,
          activeMedia.mimetype,
        )
      : null;

  /*
   * ============================
   * CANCELAR RAF
   * ============================
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
   * ============================
   * PAUSAR VIDEOS
   * ============================
   */

  const pauseVideos =
    useCallback(() => {
      videoA.current?.pause();
      videoB.current?.pause();
    }, []);

  /*
   * ============================
   * RESETEAR PLAYLIST
   * ============================
   */

  const resetPlaylist =
    useCallback(() => {
      /*
       * Cancelar transición interna.
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
       * Comenzar siempre por
       * flyer número 1.
       */

      indexRef.current =
        0;

      setIndex(0);

      activeRef.current =
        "a";

      setActive("a");

      const list =
        mediasRef.current;

      setLayerMedia({
        a:
          list[0] ??
          null,

        b:
          list[1] ??
          null,
      });

      /*
       * Reiniciar videos físicamente.
       */

      const videos = [
        videoA.current,
        videoB.current,
      ];

      videos.forEach(
        (video) => {
          if (!video) {
            return;
          }

          video.pause();

          try {
            video.currentTime =
              0;
          } catch {
            // todavía sin metadata
          }
        },
      );
    }, []);

  /*
   * ============================
   * FINALIZAR PLAYER
   * ============================
   */

  const completePlayer =
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

      pauseVideos();

      onComplete?.();
    }, [
      onComplete,
      pauseVideos,
    ]);

  /*
   * ============================
   * AVANZAR
   * ============================
   */

  const advance =
    useCallback(() => {
      /*
       * Una instancia oculta
       * jamás debe avanzar.
       */

      if (
        !isActive
      ) {
        return;
      }

      const list =
        mediasRef.current;

      if (
        list.length === 0
      ) {
        completePlayer();

        return;
      }

      if (
        transitioningRef.current
      ) {
        return;
      }

      const currentIndex =
        indexRef.current;

      const isLast =
        currentIndex >=
        list.length - 1;

      if (isLast) {
        completePlayer();

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

      /*
       * Cargar siguiente flyer.
       */

      setLayerMedia(
        (prev) => ({
          ...prev,

          [to]:
            list[
              nextIndex
            ] ??
            null,
        }),
      );

      /*
       * Cambiar capa.
       */

      activeRef.current =
        to;

      setActive(
        to,
      );

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
            indexRef.current =
              nextIndex;

            setIndex(
              nextIndex,
            );

            /*
             * Precargar el siguiente.
             */

            setLayerMedia(
              (prev) => ({
                ...prev,

                [from]:
                  list[
                    preloadIndex
                  ] ??
                  null,
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
      completePlayer,
      isActive,
    ]);

  /*
   * ============================
   * IDENTIDAD PLAYLIST
   * ============================
   */

  const playlistKey =
    useMemo(() => {
      return medias
        .map(
          (media) =>
            [
              media.id,
              media.url,
              media.mimetype,
              media.duracionms ??
                "null",
            ].join("-"),
        )
        .join("|");
    }, [
      medias,
    ]);

  /*
   * ============================
   * PLAYLIST ACTUALIZADA
   * ============================
   */

  useEffect(() => {
    mediasRef.current =
      medias;

    /*
     * Si estamos ocultos,
     * únicamente dejamos preparada
     * la playlist.
     */

    resetPlaylist();
  }, [
    playlistKey,
    resetPlaylist,
  ]);

  /*
   * ============================
   * ACTIVACIÓN DEL PLAYER
   * ============================
   *
   * Esta es la parte fundamental.
   *
   * hidden:
   *
   * isActive = false
   *
   * pasa al frente:
   *
   * isActive = true
   *
   * Primero reiniciamos.
   *
   * Después esperamos DOS frames
   * del navegador.
   *
   * Finalmente permitimos play().
   * ============================
   */

  useEffect(() => {
    const wasActive =
      previousIsActiveRef.current;

    previousIsActiveRef.current =
      isActive;

    /*
     * ========================
     * PLAYER OCULTO
     * ========================
     */

    if (
      !isActive
    ) {
      cancelFrames();

      setPlaybackReady(
        false,
      );

      pauseVideos();

      return;
    }

    /*
     * ========================
     * PLAYER ACABA DE ENTRAR
     * ========================
     */

    if (
      isActive &&
      !wasActive
    ) {
      /*
       * Primero:
       *
       * volver a flyer 0.
       */

      resetPlaylist();

      setPlaybackReady(
        false,
      );

      /*
       * Esperar un frame:
       *
       * React pinta la capa.
       */

      frameARef.current =
        requestAnimationFrame(
          () => {
            /*
             * Segundo frame:
             *
             * el navegador ya calculó
             * opacity/z-index/display/
             * visibility.
             */

            frameBRef.current =
              requestAnimationFrame(
                () => {
                  frameARef.current =
                    null;

                  frameBRef.current =
                    null;

                  /*
                   * Nueva ejecución.
                   */

                  setPlaybackCycle(
                    (current) =>
                      current + 1,
                  );

                  /*
                   * Ahora sí puede
                   * comenzar a reproducir.
                   */

                  setPlaybackReady(
                    true,
                  );
                },
              );
          },
        );
    }

    return () => {
      /*
       * No cancelamos aquí playback
       * general porque este cleanup
       * también ocurre por rerenders.
       */
    };
  }, [
    isActive,
    cancelFrames,
    pauseVideos,
    resetPlaylist,
  ]);

  /*
   * ============================
   * PRIMER MONTAJE ACTIVO
   * ============================
   *
   * Por ejemplo:
   *
   * si Player fuese la única vista.
   */

  useEffect(() => {
    if (
      !isActive
    ) {
      return;
    }

    /*
     * previousIsActiveRef empieza
     * en true cuando Player ya nace
     * activo.
     *
     * Entonces necesitamos arrancarlo
     * explícitamente.
     */

    if (
      playbackCycle !==
      0
    ) {
      return;
    }

    cancelFrames();

    resetPlaylist();

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

                setPlaybackCycle(
                  1,
                );

                setPlaybackReady(
                  true,
                );
              },
            );
        },
      );

    return () => {
      /*
       * El cleanup general se encarga
       * de cancelar RAF pendientes.
       */
    };
  }, []);

  /*
   * ============================
   * SIN CONTENIDO
   * ============================
   */

  useEffect(() => {
    if (
      !isActive
    ) {
      return;
    }

    if (
      medias.length >
      0
    ) {
      return;
    }

    completePlayer();
  }, [
    isActive,
    medias.length,
    completePlayer,
  ]);

  /*
   * ============================
   * IMÁGENES
   * ============================
   */

  useEffect(() => {
    /*
     * Importante:
     *
     * no iniciar el contador
     * hasta que ViewRotator ya
     * haya puesto Player delante.
     */

    if (
      !isActive ||
      !playbackReady
    ) {
      return;
    }

    if (
      !activeMedia
    ) {
      return;
    }

    if (
      activeKind !==
      "image"
    ) {
      return;
    }

    const duration =
      Number(
        activeMedia.duracionms,
      ) ||
      DEFAULT_IMAGE_DURATION;

    const timer =
      window.setTimeout(
        () => {
          advance();
        },

        duration,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    isActive,
    playbackReady,
    playbackCycle,

    active,
    activeMedia?.id,
    activeMedia?.url,
    activeMedia?.duracionms,

    activeKind,

    advance,
  ]);

  /*
   * ============================
   * VIDEOS
   * ============================
   */

  useEffect(() => {
    /*
     * No reproducir contenido
     * debajo del ranking.
     */

    if (
      !isActive ||
      !playbackReady
    ) {
      pauseVideos();

      return;
    }

    if (
      !activeMedia
    ) {
      return;
    }

    if (
      activeKind !==
      "video"
    ) {
      return;
    }

    /*
     * Siempre detener la capa
     * que NO está activa.
     */

    const video =
      active === "a"
        ? videoA.current
        : videoB.current;

    const hiddenVideo =
      active === "a"
        ? videoB.current
        : videoA.current;

    hiddenVideo?.pause();

    if (
      !video
    ) {
      return;
    }

    let cancelled =
      false;

    let startTimer:
      number | null =
      null;

    /*
     * ========================
     * LIMPIAR TIMEOUT
     * ========================
     */

    const clearStartTimer =
      () => {
        if (
          startTimer ===
          null
        ) {
          return;
        }

        window.clearTimeout(
          startTimer,
        );

        startTimer =
          null;
      };

    /*
     * ========================
     * SIGUIENTE SI FALLA
     * ========================
     */

    const goNextIfBroken =
      () => {
        if (
          cancelled
        ) {
          return;
        }

        clearStartTimer();

        advance();
      };

    /*
     * ========================
     * PLAY
     * ========================
     */

    const startVideo =
      async () => {
        if (
          cancelled
        ) {
          return;
        }

        try {
          /*
           * MUY IMPORTANTE.
           *
           * Cada flyer de video
           * comienza desde cero.
           */

          video.pause();

          video.currentTime =
            0;

          /*
           * Esperar además otro frame
           * específico para el elemento
           * <video>.
           */

          await new Promise<void>(
            (resolve) => {
              requestAnimationFrame(
                () => {
                  resolve();
                },
              );
            },
          );

          if (
            cancelled
          ) {
            return;
          }

          const promise =
            video.play();

          if (promise) {
            await promise;
          }
        } catch (error) {
          if (
            cancelled
          ) {
            return;
          }

          console.error(
            "[PlayerUI] Error ejecutando video:",
            {
              error,
              media:
                activeMedia,
              readyState:
                video.readyState,
              networkState:
                video.networkState,
              paused:
                video.paused,
            },
          );

          goNextIfBroken();
        }
      };

    /*
     * ========================
     * PLAYING
     * ========================
     */

    const handlePlaying =
      () => {
        clearStartTimer();
      };

    /*
     * ========================
     * ERROR
     * ========================
     */

    const handleError =
      () => {
        console.error(
          "[PlayerUI] Error de archivo de video:",
          activeMedia.url,
        );

        goNextIfBroken();
      };

    video.addEventListener(
      "playing",
      handlePlaying,
    );

    video.addEventListener(
      "error",
      handleError,
    );

    /*
     * ========================
     * TIMEOUT
     * ========================
     */

    startTimer =
      window.setTimeout(
        () => {
          if (
            cancelled
          ) {
            return;
          }

          /*
           * Si luego de 5 segundos
           * sigue pausado,
           * considerarlo fallo.
           */

          if (
            video.paused
          ) {
            console.error(
              "[PlayerUI] El video no inició:",
              activeMedia.url,
            );

            goNextIfBroken();
          }
        },

        VIDEO_START_TIMEOUT,
      );

    /*
     * ========================
     * YA TIENE DATOS
     * ========================
     */

    if (
      video.readyState >=
      HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      void startVideo();
    } else {
      /*
       * Todavía no está listo.
       */

      const handleCanPlay =
        () => {
          void startVideo();
        };

      video.addEventListener(
        "canplay",
        handleCanPlay,
        {
          once: true,
        },
      );

      video.load();

      return () => {
        cancelled =
          true;

        clearStartTimer();

        video.removeEventListener(
          "playing",
          handlePlaying,
        );

        video.removeEventListener(
          "error",
          handleError,
        );

        video.removeEventListener(
          "canplay",
          handleCanPlay,
        );

        video.pause();
      };
    }

    /*
     * ========================
     * CLEANUP VIDEO
     * ========================
     */

    return () => {
      cancelled =
        true;

      clearStartTimer();

      video.removeEventListener(
        "playing",
        handlePlaying,
      );

      video.removeEventListener(
        "error",
        handleError,
      );

      video.pause();
    };
  }, [
    /*
     * Cada nueva aparición del
     * Player obliga a ejecutar
     * nuevamente este efecto.
     */

    playbackCycle,
    playbackReady,

    isActive,

    active,

    activeMedia?.id,
    activeMedia?.url,

    activeKind,

    advance,
    pauseVideos,
  ]);

  /*
   * ============================
   * CLEANUP GENERAL
   * ============================
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

      pauseVideos();
    };
  }, [
    cancelFrames,
    pauseVideos,
  ]);

  /*
   * ============================
   * RENDER MEDIA
   * ============================
   */

  const renderMedia = (
    media:
      PlayerMedia | null,

    layer:
      Layer,
  ) => {
    if (
      !media
    ) {
      return null;
    }

    const kind =
      detectMediaKind(
        media.url,
        media.mimetype,
      );

    const videoRef =
      layer === "a"
        ? videoA
        : videoB;

    const isActiveLayer =
      active ===
        layer &&
      isActive &&
      playbackReady;

    /*
     * ========================
     * VIDEO
     * ========================
     */

    if (
      kind ===
      "video"
    ) {
      return (
        <video
          key={
            `${media.id}-${media.url}`
          }
          ref={
            videoRef
          }
          src={
            media.url
          }
          className={
            styles.media
          }
          muted
          playsInline
          preload="auto"
          onEnded={
            isActiveLayer
              ? advance
              : undefined
          }
        />
      );
    }

    /*
     * ========================
     * IMAGEN
     * ========================
     */

    return (
      <img
        key={
          `${media.id}-${media.url}`
        }
        src={
          media.url
        }
        className={
          styles.media
        }
        alt=""
        draggable={
          false
        }
      />
    );
  };

  /*
   * ============================
   * UI
   * ============================
   */

  return (
    <div
      className={
        styles.player
      }
    >
      <div
        className={
          styles.stage
        }
      >
        {!medias.length ? (
          <div
            className={
              styles.idle
            }
          >
            Sin contenido
          </div>
        ) : (
          <>
            {/*
             * CAPA A
             */}

            <div
              className={`
                ${styles.layer}

                ${
                  active === "a"
                    ? styles.active
                    : styles.hidden
                }
              `}
            >
              {renderMedia(
                layerMedia.a,
                "a",
              )}
            </div>

            {/*
             * CAPA B
             */}

            <div
              className={`
                ${styles.layer}

                ${
                  active === "b"
                    ? styles.active
                    : styles.hidden
                }
              `}
            >
              {renderMedia(
                layerMedia.b,
                "b",
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}