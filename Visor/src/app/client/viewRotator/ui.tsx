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

const oppositeLayer = (layer: Layer): Layer =>
  layer === "a" ? "b" : "a";

export default function ViewRotator({
  views,
}: {
  views: ViewConfig[];
}) {
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState<Layer>("a");
  const [leaving, setLeaving] =
    useState<Layer | null>(null);

  const [layerViews, setLayerViews] = useState<
    Record<Layer, ViewConfig | null>
  >({
    a: views[0] ?? null,
    b: views[1] ?? null,
  });

  /*
   * ==========================================
   * REFS
   * ==========================================
   */

  const activeRef = useRef<Layer>("a");
  const indexRef = useRef(0);
  const viewsRef = useRef<ViewConfig[]>(views);

  const layerViewsRef = useRef<
    Record<Layer, ViewConfig | null>
  >({
    a: views[0] ?? null,
    b: views[1] ?? null,
  });

  const transitioningRef = useRef(false);

  const transitionTimerRef =
    useRef<number | null>(null);

  const viewTimerRef =
    useRef<number | null>(null);

  /*
   * Si una vista controlada termina durante
   * la transición, se avanza cuando termine
   * el efecto de fade.
   */
  const pendingCompleteRef =
    useRef<string | null>(null);

  const advanceRef =
    useRef<() => void>(() => {});

  /*
   * ==========================================
   * SINCRONIZAR REFS
   * ==========================================
   */

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    viewsRef.current = views;
  }, [views]);

  useEffect(() => {
    layerViewsRef.current = layerViews;
  }, [layerViews]);

  /*
   * ==========================================
   * CAMBIAR DE VISTA
   * ==========================================
   */

  const transitionTo = useCallback(
    (
      nextView: ViewConfig,
      nextIndex: number,
    ) => {
      if (transitioningRef.current) {
        return;
      }

      const from = activeRef.current;
      const to = oppositeLayer(from);

      /*
       * Colocar la siguiente vista en la
       * capa que actualmente está oculta.
       */
      setLayerViews((previous) => {
        const next = {
          ...previous,
          [to]: nextView,
        };

        layerViewsRef.current = next;

        return next;
      });

      transitioningRef.current = true;

      setLeaving(from);
      setActive(to);

      activeRef.current = to;

      if (transitionTimerRef.current !== null) {
        window.clearTimeout(
          transitionTimerRef.current,
        );
      }

      transitionTimerRef.current =
        window.setTimeout(() => {
          const latestViews =
            viewsRef.current;

          /*
           * Durante los 500 ms de transición
           * pudo llegar un router.refresh().
           *
           * Buscamos la versión más reciente
           * de la vista por su ID.
           */
          let currentIndex =
            latestViews.findIndex(
              (view) =>
                view.id === nextView.id,
            );

          let currentView:
            | ViewConfig
            | null = null;

          if (currentIndex >= 0) {
            currentView =
              latestViews[currentIndex];
          } else if (
            latestViews.length > 0
          ) {
            /*
             * La vista fue eliminada durante
             * la transición. Se utiliza la
             * primera vista disponible.
             */
            currentIndex = 0;
            currentView =
              latestViews[0];
          }

          setIndex(
            currentIndex >= 0
              ? currentIndex
              : nextIndex,
          );

          indexRef.current =
            currentIndex >= 0
              ? currentIndex
              : nextIndex;

          let preloadView:
            | ViewConfig
            | null = null;

          if (
            latestViews.length > 1 &&
            currentIndex >= 0
          ) {
            const preloadIndex =
              (currentIndex + 1) %
              latestViews.length;

            preloadView =
              latestViews[
                preloadIndex
              ] ?? null;
          }

          /*
           * Actualizamos ambas capas:
           *
           * - La capa activa recibe la versión
           *   más reciente de la vista.
           * - La capa anterior se reutiliza
           *   para precargar la siguiente.
           */
          setLayerViews((previous) => {
            const next = {
              ...previous,
              [to]: currentView,
              [from]: preloadView,
            };

            layerViewsRef.current = next;

            return next;
          });

          setLeaving(null);

          transitioningRef.current =
            false;

          transitionTimerRef.current =
            null;

          /*
           * Una vista controlada pudo terminar
           * durante el fade.
           */
          if (
            currentView &&
            pendingCompleteRef.current ===
              currentView.id
          ) {
            pendingCompleteRef.current =
              null;

            window.setTimeout(() => {
              advanceRef.current();
            }, 0);
          }
        }, FADE_MS);
    },
    [],
  );

  /*
   * ==========================================
   * AVANZAR
   * ==========================================
   */

  const advance = useCallback(() => {
    if (transitioningRef.current) {
      return;
    }

    const currentViews =
      viewsRef.current;

    if (currentViews.length <= 1) {
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

    const currentIndex =
      currentViews.findIndex(
        (view) =>
          view.id === currentView.id,
      );

    /*
     * La vista activa ya no existe.
     * Volver a la primera disponible.
     */
    if (currentIndex < 0) {
      transitionTo(
        currentViews[0],
        0,
      );

      return;
    }

    const nextIndex =
      (currentIndex + 1) %
      currentViews.length;

    transitionTo(
      currentViews[nextIndex],
      nextIndex,
    );
  }, [transitionTo]);

  advanceRef.current = advance;

  /*
   * ==========================================
   * SINCRONIZAR CAMBIOS EN VIEWS
   * ==========================================
   *
   * Este efecto se ejecuta cuando:
   *
   * - Llega router.refresh().
   * - Cambia el ranking.
   * - Cambia el rango de fechas.
   * - Cambian las estadísticas.
   * - Se agregan o eliminan medias.
   */

  useEffect(() => {
    viewsRef.current = views;

    /*
     * No quedan vistas.
     */
    if (views.length === 0) {
      if (
        transitionTimerRef.current !== null
      ) {
        window.clearTimeout(
          transitionTimerRef.current,
        );

        transitionTimerRef.current =
          null;
      }

      if (
        viewTimerRef.current !== null
      ) {
        window.clearTimeout(
          viewTimerRef.current,
        );

        viewTimerRef.current = null;
      }

      transitioningRef.current = false;
      pendingCompleteRef.current = null;

      setLeaving(null);
      setActive("a");
      setIndex(0);

      activeRef.current = "a";
      indexRef.current = 0;

      const emptyLayers = {
        a: null,
        b: null,
      };

      setLayerViews(emptyLayers);
      layerViewsRef.current =
        emptyLayers;

      return;
    }

    /*
     * Si hay una transición activa, no se
     * modifican las capas en ese instante.
     *
     * Al terminar el fade, transitionTo()
     * utilizará viewsRef.current y tomará
     * automáticamente los datos nuevos.
     */
    if (transitioningRef.current) {
      return;
    }

    const currentLayer =
      activeRef.current;

    const hiddenLayer =
      oppositeLayer(currentLayer);

    const currentView =
      layerViewsRef.current[
        currentLayer
      ];

    /*
     * Primera carga o recuperación.
     */
    if (!currentView) {
      const initialLayers = {
        [currentLayer]:
          views[0] ?? null,

        [hiddenLayer]:
          views[1] ?? null,
      } as Record<
        Layer,
        ViewConfig | null
      >;

      setLayerViews(
        initialLayers,
      );

      layerViewsRef.current =
        initialLayers;

      setIndex(0);
      indexRef.current = 0;

      return;
    }

    /*
     * Buscar la vista activa por ID dentro
     * de la nueva lista recibida.
     */
    const currentIndex =
      views.findIndex(
        (view) =>
          view.id === currentView.id,
      );

    /*
     * La vista activa fue eliminada.
     *
     * Ejemplo:
     * estábamos en Player, pero se eliminaron
     * todas las medias.
     */
    if (currentIndex < 0) {
      transitionTo(
        views[0],
        0,
      );

      return;
    }

    setIndex(currentIndex);
    indexRef.current =
      currentIndex;

    const updatedCurrentView =
      views[currentIndex];

    /*
     * Si solamente queda una vista:
     *
     * - Actualizamos inmediatamente los datos
     *   si no es controlled.
     * - Limpiamos la capa oculta.
     */
    if (views.length === 1) {
      setLayerViews((previous) => {
        const next = {
          ...previous,

          [currentLayer]:
            currentView.type ===
            "controlled"
              ? previous[
                  currentLayer
                ]
              : updatedCurrentView,

          [hiddenLayer]: null,
        };

        layerViewsRef.current = next;

        return next;
      });

      return;
    }

    const nextIndex =
      (currentIndex + 1) %
      views.length;

    /*
     * Actualizar las capas.
     *
     * Una vista timed, como RankingUI o
     * TimeUI, recibe inmediatamente los
     * datos nuevos.
     *
     * Una vista controlled, como PlayerUI,
     * conserva la instancia activa para no
     * reiniciar el video o la playlist.
     */
    setLayerViews((previous) => {
      const next = {
        ...previous,

        [currentLayer]:
          currentView.type ===
          "controlled"
            ? previous[currentLayer]
            : updatedCurrentView,

        [hiddenLayer]:
          views[nextIndex] ?? null,
      };

      layerViewsRef.current = next;

      return next;
    });
  }, [
    views,
    transitionTo,
  ]);

  /*
   * ==========================================
   * VISTA ACTIVA
   * ==========================================
   */

  const activeView =
    layerViews[active];

  /*
   * ==========================================
   * TIMER DE LA VISTA
   * ==========================================
   */

  useEffect(() => {
    if (
      viewTimerRef.current !== null
    ) {
      window.clearTimeout(
        viewTimerRef.current,
      );

      viewTimerRef.current = null;
    }

    if (!activeView) {
      return;
    }

    /*
     * PlayerUI controla por sí mismo cuándo
     * debe terminar.
     */
    if (
      activeView.type ===
      "controlled"
    ) {
      return;
    }

    /*
     * Evitar timers inválidos o ciclos
     * inmediatos accidentales.
     */
    if (
      !Number.isFinite(
        activeView.durationMs,
      ) ||
      activeView.durationMs <= 0
    ) {
      return;
    }

    viewTimerRef.current =
      window.setTimeout(() => {
        viewTimerRef.current =
          null;

        advance();
      }, activeView.durationMs);

    return () => {
      if (
        viewTimerRef.current !== null
      ) {
        window.clearTimeout(
          viewTimerRef.current,
        );

        viewTimerRef.current = null;
      }
    };
  }, [
    activeView?.id,

    activeView?.type === "timed"
      ? activeView.durationMs
      : null,

    advance,
  ]);

  /*
   * ==========================================
   * FINALIZACIÓN DE VISTA CONTROLADA
   * ==========================================
   */

  const handleComplete = useCallback(
    (
      viewId: string,
      layer: Layer,
    ) => {
      /*
       * Una vista precargada u oculta no
       * puede provocar el cambio de vista.
       */
      if (
        layer !== activeRef.current
      ) {
        return;
      }

      /*
       * Validar que el evento corresponda
       * todavía a la vista activa.
       */
      const currentView =
        layerViewsRef.current[
          layer
        ];

      if (
        !currentView ||
        currentView.id !== viewId
      ) {
        return;
      }

      /*
       * Si termina durante el fade,
       * esperar a que concluya.
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
    [advance],
  );

  /*
   * ==========================================
   * RENDERIZAR UNA VISTA
   * ==========================================
   */

  const renderView = (
    view: ViewConfig | null,
    layer: Layer,
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
   * ==========================================
   * CLEANUP
   * ==========================================
   */

  useEffect(() => {
    return () => {
      if (
        transitionTimerRef.current !== null
      ) {
        window.clearTimeout(
          transitionTimerRef.current,
        );
      }

      if (
        viewTimerRef.current !== null
      ) {
        window.clearTimeout(
          viewTimerRef.current,
        );
      }

      transitioningRef.current = false;
      pendingCompleteRef.current = null;
    };
  }, []);

  /*
   * ==========================================
   * RENDER
   * ==========================================
   */

  if (
    !layerViews.a &&
    !layerViews.b
  ) {
    return null;
  }

  return (
    <div className={styles.rotator}>
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