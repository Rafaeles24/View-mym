"use client";

import { ViewConfig } from "@/types/viewConfig";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import styles from "./ui.module.css";

const FADE_MS = 500;

type Layer = "a" | "b";

const oppositeLayer = (
  layer: Layer,
): Layer => {
  return layer === "a"
    ? "b"
    : "a";
};

export default function ViewRotator({
  views,
}: {
  views: ViewConfig[];
}) {
  /*
   * ==========================
   * ESTADO
   * ==========================
   */

  const [index, setIndex] =
    useState(0);

  const [active, setActive] =
    useState<Layer>("a");

  /*
   * La capa que se está retirando.
   *
   * Se mantiene encima mientras
   * baja su opacity.
   */
  const [
    leaving,
    setLeaving,
  ] = useState<Layer | null>(
    null,
  );

  /*
   * Igual que layerMedia del Player.
   *
   * Guardamos las vistas reales y
   * no simplemente sus IDs.
   *
   * Esto además permite mantener
   * una playlist/vista estable
   * durante su pasada actual.
   */
  const [
    layerViews,
    setLayerViews,
  ] = useState<
    Record<
      Layer,
      ViewConfig | null
    >
  >({
    a:
      views[0] ??
      null,

    b:
      views[1] ??
      null,
  });

  /*
   * ==========================
   * REFS
   * ==========================
   */

  const activeRef =
    useRef<Layer>("a");

  const indexRef =
    useRef(0);

  const viewsRef =
    useRef<ViewConfig[]>(
      views,
    );

  const layerViewsRef =
    useRef<
      Record<
        Layer,
        ViewConfig | null
      >
    >({
      a:
        views[0] ??
        null,

      b:
        views[1] ??
        null,
    });

  const transitioningRef =
    useRef(false);

  const transitionTimerRef =
    useRef<number | null>(
      null,
    );

  const viewTimerRef =
    useRef<number | null>(
      null,
    );

  /*
   * Si un controlled termina
   * mientras todavía estamos
   * realizando el fade.
   */
  const pendingCompleteRef =
    useRef<string | null>(
      null,
    );

  /*
   * ==========================
   * SINCRONIZAR REFS
   * ==========================
   */

  useEffect(() => {
    activeRef.current =
      active;
  }, [active]);

  useEffect(() => {
    indexRef.current =
      index;
  }, [index]);

  useEffect(() => {
    viewsRef.current =
      views;
  }, [views]);

  useEffect(() => {
    layerViewsRef.current =
      layerViews;
  }, [layerViews]);

  /*
   * ==========================
   * CAMBIAR CAPAS
   * ==========================
   */

  const transitionTo =
    useCallback(
      (
        nextView: ViewConfig,
        nextIndex: number,
      ) => {
        if (
          transitioningRef.current
        ) {
          return;
        }

        const from =
          activeRef.current;

        const to =
          oppositeLayer(from);

        /*
         * La siguiente vista se coloca
         * en la capa que estaba oculta.
         */
        setLayerViews(
          (prev) => {
            const next = {
              ...prev,

              [to]:
                nextView,
            };

            layerViewsRef.current =
              next;

            return next;
          },
        );

        transitioningRef.current =
          true;

        /*
         * Igual conceptualmente
         * que PlayerUI:
         *
         * from = capa anterior
         * to   = capa nueva
         */
        setLeaving(
          from,
        );

        setActive(
          to,
        );

        activeRef.current =
          to;

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
              setIndex(
                nextIndex,
              );

              indexRef.current =
                nextIndex;

              /*
               * =====================
               * PRECARGAR SIGUIENTE
               * =====================
               */

              const latestViews =
                viewsRef.current;

              const latestIndex =
                latestViews.findIndex(
                  (view) =>
                    view.id ===
                    nextView.id,
                );

              let preloadView:
                ViewConfig | null =
                null;

              if (
                latestViews.length >
                  1 &&
                latestIndex >= 0
              ) {
                const preloadIndex =
                  (latestIndex + 1) %
                  latestViews.length;

                preloadView =
                  latestViews[
                    preloadIndex
                  ] ?? null;
              }

              /*
               * La capa que desapareció
               * se recicla para la
               * próxima vista.
               */
              setLayerViews(
                (prev) => {
                  const next = {
                    ...prev,

                    [from]:
                      preloadView,
                  };

                  layerViewsRef.current =
                    next;

                  return next;
                },
              );

              setLeaving(
                null,
              );

              transitioningRef.current =
                false;

              transitionTimerRef.current =
                null;

              /*
               * Caso extremo:
               * controlled terminó
               * durante el fade.
               */
              if (
                pendingCompleteRef.current ===
                nextView.id
              ) {
                pendingCompleteRef.current =
                  null;

                window.setTimeout(
                  () => {
                    advanceRef.current();
                  },
                  0,
                );
              }
            },

            FADE_MS,
          );
      },
      [],
    );

  /*
   * ==========================
   * AVANZAR
   * ==========================
   */

  const advanceRef =
    useRef<() => void>(
      () => {},
    );

  const advance =
    useCallback(() => {
      if (
        transitioningRef.current
      ) {
        return;
      }

      const list =
        viewsRef.current;

      if (
        list.length <= 1
      ) {
        return;
      }

      const currentLayer =
        activeRef.current;

      const currentView =
        layerViewsRef.current[
          currentLayer
        ];

      if (!currentView) {
        return;
      }

      /*
       * Buscamos la posición según ID
       * porque las vistas pueden cambiar
       * dinámicamente.
       */
      const currentIndex =
        list.findIndex(
          (view) =>
            view.id ===
            currentView.id,
        );

      /*
       * Si la vista activa ya no existe,
       * volver a la primera disponible.
       */
      if (
        currentIndex < 0
      ) {
        transitionTo(
          list[0],
          0,
        );

        return;
      }

      const nextIndex =
        (currentIndex + 1) %
        list.length;

      transitionTo(
        list[nextIndex],
        nextIndex,
      );
    }, [
      transitionTo,
    ]);

  advanceRef.current =
    advance;

  /*
   * ==========================
   * CAMBIOS EN `views`
   * ==========================
   *
   * Esto es importante cuando llega:
   *
   * router.refresh()
   *
   * por Socket.IO.
   */

  useEffect(() => {
    viewsRef.current =
      views;

    /*
     * No hay ninguna vista.
     */
    if (
      views.length === 0
    ) {
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

      setLeaving(null);

      setLayerViews({
        a: null,
        b: null,
      });

      layerViewsRef.current = {
        a: null,
        b: null,
      };

      return;
    }

    /*
     * No modificar capas en medio
     * de una transición.
     */
    if (
      transitioningRef.current
    ) {
      return;
    }

    const currentLayer =
      activeRef.current;

    const hiddenLayer =
      oppositeLayer(
        currentLayer,
      );

    const currentView =
      layerViewsRef.current[
        currentLayer
      ];

    /*
     * Primera carga / recuperación.
     */
    if (!currentView) {
      const initial = {
        a:
          views[0] ??
          null,

        b:
          views[1] ??
          null,
      };

      setLayerViews(
        initial,
      );

      layerViewsRef.current =
        initial;

      setActive("a");

      activeRef.current =
        "a";

      setIndex(0);

      indexRef.current =
        0;

      return;
    }

    /*
     * ¿La vista actual todavía existe?
     */
    const currentIndex =
      views.findIndex(
        (view) =>
          view.id ===
          currentView.id,
      );

    /*
     * EJEMPLO:
     *
     * Estábamos en Player.
     *
     * [ranking, player]
     *
     * Eliminan todas las medias.
     *
     * Ahora:
     *
     * [ranking]
     *
     * Debemos abandonar Player.
     */
    if (
      currentIndex < 0
    ) {
      if (
        views.length === 1
      ) {
        /*
         * Aunque solo quede una vista,
         * hacemos fade hacia ella.
         */
        transitionTo(
          views[0],
          0,
        );

        return;
      }

      transitionTo(
        views[0],
        0,
      );

      return;
    }

    setIndex(
      currentIndex,
    );

    indexRef.current =
      currentIndex;

    /*
     * IMPORTANTE:
     *
     * NO reemplazamos currentView.
     *
     * Así una vista que ya está
     * corriendo mantiene sus datos
     * hasta terminar su pasada.
     *
     * Actualizamos solamente la
     * capa oculta.
     */

    if (
      views.length === 1
    ) {
      setLayerViews(
        (prev) => {
          const next = {
            ...prev,

            [hiddenLayer]:
              null,
          };

          layerViewsRef.current =
            next;

          return next;
        },
      );

      return;
    }

    const nextIndex =
      (currentIndex + 1) %
      views.length;

    setLayerViews(
      (prev) => {
        const next = {
          ...prev,

          [hiddenLayer]:
            views[
              nextIndex
            ] ?? null,
        };

        layerViewsRef.current =
          next;

        return next;
      },
    );
  }, [
    views,
    transitionTo,
  ]);

  /*
   * ==========================
   * VISTA ACTIVA
   * ==========================
   */

  const activeView =
    layerViews[active];

  /*
   * ==========================
   * TIMER DE VISTA
   * ==========================
   */

  useEffect(() => {
    if (
      viewTimerRef.current !==
      null
    ) {
      window.clearTimeout(
        viewTimerRef.current,
      );

      viewTimerRef.current =
        null;
    }

    if (!activeView) {
      return;
    }

    /*
     * Player controla su
     * finalización.
     */
    if (
      activeView.type ===
      "controlled"
    ) {
      return;
    }

    viewTimerRef.current =
      window.setTimeout(
        () => {
          viewTimerRef.current =
            null;

          advance();
        },

        activeView.durationMs,
      );

    return () => {
      if (
        viewTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          viewTimerRef.current,
        );

        viewTimerRef.current =
          null;
      }
    };
  }, [
    activeView?.id,

    activeView?.type ===
    "timed"
      ? activeView.durationMs
      : null,

    advance,
  ]);

  /*
   * ==========================
   * CONTROLLED COMPLETE
   * ==========================
   */

  const handleComplete =
    useCallback(
      (
        viewId: string,
        layer: Layer,
      ) => {
        /*
         * Una vista precargada/oculta
         * jamás puede cambiar de vista.
         */
        if (
          layer !==
          activeRef.current
        ) {
          return;
        }

        /*
         * Si termina durante el fade,
         * ejecutar después.
         */
        if (
          transitioningRef.current
        ) {
          pendingCompleteRef.current =
            viewId;

          return;
        }

        advance();
      },
      [
        advance,
      ],
    );

  /*
   * ==========================
   * RENDER VIEW
   * ==========================
   */

  const renderView = (
    view:
      ViewConfig | null,

    layer:
      Layer,
  ) => {
    if (!view) {
      return null;
    }

    const isActive =
      layer === active;

    if (
      view.type ===
      "controlled"
    ) {
      return view.render(
        () => {
          handleComplete(
            view.id,
            layer,
          );
        },

        isActive,
      );
    }

    return view.render;
  };

  /*
   * ==========================
   * CLEANUP
   * ==========================
   */

  useEffect(() => {
    return () => {
      if (
        transitionTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          transitionTimerRef.current,
        );
      }

      if (
        viewTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          viewTimerRef.current,
        );
      }
    };
  }, []);

  /*
   * ==========================
   * UI
   * ==========================
   */

  if (
    !layerViews.a &&
    !layerViews.b
  ) {
    return null;
  }

  return (
    <div
      className={
        styles.rotator
      }
    >
      {/* CAPA A */}
      <div
        className={`
          ${styles.layer}

          ${
            active === "a"
              ? styles.active
              : ""
          }

          ${
            leaving === "a"
              ? styles.leaving
              : ""
          }

          ${
            active !== "a" &&
            leaving !== "a"
              ? styles.hidden
              : ""
          }
        `}
      >
        {renderView(
          layerViews.a,
          "a",
        )}
      </div>

      {/* CAPA B */}
      <div
        className={`
          ${styles.layer}

          ${
            active === "b"
              ? styles.active
              : ""
          }

          ${
            leaving === "b"
              ? styles.leaving
              : ""
          }

          ${
            active !== "b" &&
            leaving !== "b"
              ? styles.hidden
              : ""
          }
        `}
      >
        {renderView(
          layerViews.b,
          "b",
        )}
      </div>
    </div>
  );
}