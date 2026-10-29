"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import type {
  ConfiguracionVisor,
} from "@/types/ranking";

import {
  fechaParaInput,
} from "@/libs/fechaParaInput";

import styles from "./ui.module.css";
import { actualizarIntervalo, actualizarRanking, actualizarVersus } from "@/services/media/configVisor";

/* =========================================
   TIPOS
========================================= */

type RangoEditable = {
  inicio: string;
  fin: string;
};

type TipoGuardado =
  | "ranking"
  | "versus"
  | "intervalo";

type Props = {
  rankingConfig: ConfiguracionVisor;
  versusConfig: ConfiguracionVisor;
};

/* =========================================
   UTILIDADES
========================================= */

function obtenerRango(
  config: ConfiguracionVisor
): RangoEditable {
  return {
    inicio: fechaParaInput(
      config.fecha_inicio,
      config.zona_horaria || "America/Lima"
    ),

    fin: fechaParaInput(
      config.fecha_fin,
      config.zona_horaria || "America/Lima"
    ),
  };
}

function rangosIguales(
  a: RangoEditable,
  b: RangoEditable
): boolean {
  return (
    a.inicio === b.inicio &&
    a.fin === b.fin
  );
}

/*
 * Valida que datetime-local tenga
 * una fecha y hora reales.
 */

function fechaValida(
  valor: string
): boolean {
  const partes = valor.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/
  );

  if (!partes) {
    return false;
  }

  const anio = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const hora = Number(partes[4]);
  const minuto = Number(partes[5]);

  const fecha = new Date(
    Date.UTC(
      anio,
      mes - 1,
      dia,
      hora,
      minuto
    )
  );

  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia &&
    fecha.getUTCHours() === hora &&
    fecha.getUTCMinutes() === minuto
  );
}

function rangoValido(
  rango: RangoEditable
): boolean {
  return (
    fechaValida(rango.inicio) &&
    fechaValida(rango.fin) &&
    rango.fin > rango.inicio
  );
}

/* =========================================
   COMPONENTE
========================================= */

export default function ConfiguracionVisoresUI({
  rankingConfig,
  versusConfig,
}: Props) {
  const router = useRouter();

  /* =======================================
     ESTADOS EDITABLES
  ======================================= */

  const [ranking, setRanking] =
    useState<RangoEditable>(
      () => obtenerRango(rankingConfig)
    );

  const [versus, setVersus] =
    useState<RangoEditable>(
      () => obtenerRango(versusConfig)
    );

  const [intervalo, setIntervalo] =
    useState<string>(
      () =>
        String(
          rankingConfig.intervalo_actualizacion ?? 30
        )
    );

  /* =======================================
     VALORES ORIGINALES
  ======================================= */

  const [rankingOriginal, setRankingOriginal] =
    useState<RangoEditable>(
      () => obtenerRango(rankingConfig)
    );

  const [versusOriginal, setVersusOriginal] =
    useState<RangoEditable>(
      () => obtenerRango(versusConfig)
    );

  const [intervaloOriginal, setIntervaloOriginal] =
    useState<string>(
      () =>
        String(
          rankingConfig.intervalo_actualizacion ?? 30
        )
    );

  /*
   * Referencias para comparar cambios
   * provenientes del Server Component.
   */

  const rankingServidor = useRef(
    obtenerRango(rankingConfig)
  );

  const versusServidor = useRef(
    obtenerRango(versusConfig)
  );

  const intervaloServidor = useRef(
    String(
      rankingConfig.intervalo_actualizacion ?? 30
    )
  );

  /* =======================================
     ESTADOS DE OPERACIÓN
  ======================================= */

  const [guardando, setGuardando] =
    useState<TipoGuardado | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [mensaje, setMensaje] =
    useState<string | null>(null);

  /* =======================================
     SINCRONIZAR RANKING
  ======================================= */

  useEffect(() => {
    const nuevoRango =
      obtenerRango(rankingConfig);

    const anterior =
      rankingServidor.current;

    /*
     * Solamente actualiza el formulario
     * cuando no existen cambios pendientes.
     */

    setRanking((actual) =>
      rangosIguales(actual, anterior)
        ? nuevoRango
        : actual
    );

    setRankingOriginal(nuevoRango);

    rankingServidor.current =
      nuevoRango;

    /*
     * Sincronizar también el intervalo.
     */

    const nuevoIntervalo =
      String(
        rankingConfig.intervalo_actualizacion ?? 30
      );

    const anteriorIntervalo =
      intervaloServidor.current;

    setIntervalo((actual) =>
      actual === anteriorIntervalo
        ? nuevoIntervalo
        : actual
    );

    setIntervaloOriginal(
      nuevoIntervalo
    );

    intervaloServidor.current =
      nuevoIntervalo;
  }, [rankingConfig]);

  /* =======================================
     SINCRONIZAR VERSUS
  ======================================= */

  useEffect(() => {
    const nuevoRango =
      obtenerRango(versusConfig);

    const anterior =
      versusServidor.current;

    setVersus((actual) =>
      rangosIguales(actual, anterior)
        ? nuevoRango
        : actual
    );

    setVersusOriginal(
      nuevoRango
    );

    versusServidor.current =
      nuevoRango;
  }, [versusConfig]);

  /* =======================================
     DETECTAR MODIFICACIONES
  ======================================= */

  const rankingModificado =
    !rangosIguales(
      ranking,
      rankingOriginal
    );

  const versusModificado =
    !rangosIguales(
      versus,
      versusOriginal
    );

  const intervaloModificado =
    intervalo !== intervaloOriginal;

  const intervaloNumero =
    Number(intervalo);

  const intervaloValido =
    intervalo.trim() !== "" &&
    Number.isInteger(intervaloNumero) &&
    intervaloNumero > 0;

  const hayCambios =
    rankingModificado ||
    versusModificado ||
    intervaloModificado;

  /* =======================================
     LIMPIAR MENSAJES
  ======================================= */

  function limpiarMensajes() {
    setError(null);
    setMensaje(null);
  }

  /* =======================================
     GUARDAR RANKING
  ======================================= */

  async function guardarRanking() {
    if (
      guardando !== null ||
      !rankingModificado
    ) {
      return;
    }

    if (!rangoValido(ranking)) {
      setError(
        "La fecha de fin de Ranking debe ser posterior a la fecha de inicio."
      );
      return;
    }

    limpiarMensajes();

    setGuardando("ranking");

    const datos = {
      ...ranking,
    };

    try {
      await actualizarRanking({
        fecha_inicio: datos.inicio,
        fecha_fin: datos.fin,
      });

      /*
       * Actualizar referencia local
       * únicamente después del PATCH.
       */

      setRankingOriginal(datos);
      rankingServidor.current = datos;

      setMensaje(
        "Rango de Ranking actualizado correctamente."
      );

      /*
       * Vuelve a ejecutar Promise.all()
       * en el Server Component.
       */

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar Ranking."
      );
    } finally {
      setGuardando(null);
    }
  }

  /* =======================================
     GUARDAR VERSUS
  ======================================= */

  async function guardarVersus() {
    if (
      guardando !== null ||
      !versusModificado
    ) {
      return;
    }

    if (!rangoValido(versus)) {
      setError(
        "La fecha de fin de Versus debe ser posterior a la fecha de inicio."
      );
      return;
    }

    limpiarMensajes();

    setGuardando("versus");

    const datos = {
      ...versus,
    };

    try {
      await actualizarVersus({
        fecha_inicio: datos.inicio,
        fecha_fin: datos.fin,
      });

      setVersusOriginal(datos);
      versusServidor.current = datos;

      setMensaje(
        "Rango de Versus actualizado correctamente."
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar Versus."
      );
    } finally {
      setGuardando(null);
    }
  }

  /* =======================================
     GUARDAR INTERVALO
  ======================================= */

  async function guardarProgramacion() {
    if (
      guardando !== null ||
      !intervaloModificado
    ) {
      return;
    }

    if (!intervaloValido) {
      setError(
        "El intervalo debe ser un número entero mayor que cero."
      );
      return;
    }

    limpiarMensajes();

    setGuardando("intervalo");

    const minutos =
      intervaloNumero;

    try {
      await actualizarIntervalo({
        intervalo_actualizacion: minutos,
      });

      const nuevoIntervalo =
        String(minutos);

      setIntervaloOriginal(
        nuevoIntervalo
      );

      intervaloServidor.current =
        nuevoIntervalo;

      setMensaje(
        "Intervalo de actualización guardado correctamente."
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el intervalo."
      );
    } finally {
      setGuardando(null);
    }
  }

  /* =======================================
     CANCELAR CAMBIOS
  ======================================= */

  function cancelarRanking() {
    setRanking({
      ...rankingOriginal,
    });

    limpiarMensajes();
  }

  function cancelarVersus() {
    setVersus({
      ...versusOriginal,
    });

    limpiarMensajes();
  }

  function cancelarIntervalo() {
    setIntervalo(
      intervaloOriginal
    );

    limpiarMensajes();
  }

  /* =======================================
     RENDER
  ======================================= */

  return (
    <div className={styles.contenedor}>
      {/* =====================================
          ENCABEZADO
      ===================================== */}

      <header className={styles.encabezado}>
        <div>
          <h1>
            Configuración de visores
          </h1>

          <p>
            Administra los períodos de Ranking,
            Versus y la frecuencia de actualización.
          </p>
        </div>

        {hayCambios && (
          <span className={styles.zona}>
            Cambios sin guardar
          </span>
        )}
      </header>

      {/* =====================================
          MENSAJES
      ===================================== */}

      {error && (
        <div
          className={styles.error}
          role="alert"
        >
          {error}
        </div>
      )}

      {mensaje && (
        <p
          className={styles.exito}
          role="status"
        >
          {mensaje}
        </p>
      )}

      <div className={styles.grid}>
        {/* =================================
            RANKING
        ================================= */}

        <section className={styles.tarjeta}>
          <div className={styles.tarjetaTitulo}>
            <div className={styles.icono}>
              🏆
            </div>

            <div>
              <h2>
                Rango de Ranking
              </h2>

              <p>
                Período utilizado para calcular
                las ventas del ranking.
              </p>
            </div>
          </div>

          <div className={styles.campos}>
            {/* FECHA INICIO */}

            <div className={styles.campo}>
              <label htmlFor="ranking-inicio">
                Fecha de inicio
              </label>

              <input
                id="ranking-inicio"
                type="datetime-local"
                value={ranking.inicio}
                disabled={guardando !== null}
                onChange={(e) => {
                  setRanking((prev) => ({
                    ...prev,
                    inicio: e.target.value,
                  }));

                  limpiarMensajes();
                }}
              />
            </div>

            {/* FECHA FIN */}

            <div className={styles.campo}>
              <label htmlFor="ranking-fin">
                Fecha de fin
              </label>

              <input
                id="ranking-fin"
                type="datetime-local"
                value={ranking.fin}
                disabled={guardando !== null}
                onChange={(e) => {
                  setRanking((prev) => ({
                    ...prev,
                    fin: e.target.value,
                  }));

                  limpiarMensajes();
                }}
              />
            </div>
          </div>

          <div className={styles.pieTarjeta}>
            <span className={styles.zona}>
              {rankingConfig.zona_horaria ||
                "America/Lima"}
            </span>

            <div className={styles.acciones}>
              {rankingModificado && (
                <button
                  type="button"
                  className={styles.botonCancelar}
                  onClick={cancelarRanking}
                  disabled={guardando !== null}
                >
                  Cancelar
                </button>
              )}

              <button
                type="button"
                className={styles.botonGuardar}
                onClick={() =>
                  void guardarRanking()
                }
                disabled={
                  guardando !== null ||
                  !rankingModificado ||
                  !rangoValido(ranking)
                }
              >
                {guardando === "ranking"
                  ? "Guardando..."
                  : "Guardar Ranking"}
              </button>
            </div>
          </div>
        </section>

        {/* =================================
            VERSUS
        ================================= */}

        <section className={styles.tarjeta}>
          <div className={styles.tarjetaTitulo}>
            <div className={styles.icono}>
              ⚔️
            </div>

            <div>
              <h2>
                Rango de Versus
              </h2>

              <p>
                Período utilizado en los
                enfrentamientos entre cerradores.
              </p>
            </div>
          </div>

          <div className={styles.campos}>
            {/* FECHA INICIO */}

            <div className={styles.campo}>
              <label htmlFor="versus-inicio">
                Fecha de inicio
              </label>

              <input
                id="versus-inicio"
                type="datetime-local"
                value={versus.inicio}
                disabled={guardando !== null}
                onChange={(e) => {
                  setVersus((prev) => ({
                    ...prev,
                    inicio: e.target.value,
                  }));

                  limpiarMensajes();
                }}
              />
            </div>

            {/* FECHA FIN */}

            <div className={styles.campo}>
              <label htmlFor="versus-fin">
                Fecha de fin
              </label>

              <input
                id="versus-fin"
                type="datetime-local"
                value={versus.fin}
                disabled={guardando !== null}
                onChange={(e) => {
                  setVersus((prev) => ({
                    ...prev,
                    fin: e.target.value,
                  }));

                  limpiarMensajes();
                }}
              />
            </div>
          </div>

          <div className={styles.pieTarjeta}>
            <span className={styles.zona}>
              {versusConfig.zona_horaria ||
                "America/Lima"}
            </span>

            <div className={styles.acciones}>
              {versusModificado && (
                <button
                  type="button"
                  className={styles.botonCancelar}
                  onClick={cancelarVersus}
                  disabled={guardando !== null}
                >
                  Cancelar
                </button>
              )}

              <button
                type="button"
                className={styles.botonGuardar}
                onClick={() =>
                  void guardarVersus()
                }
                disabled={
                  guardando !== null ||
                  !versusModificado ||
                  !rangoValido(versus)
                }
              >
                {guardando === "versus"
                  ? "Guardando..."
                  : "Guardar Versus"}
              </button>
            </div>
          </div>
        </section>

        {/* =================================
            PROGRAMACIÓN
        ================================= */}

        <section
          className={`${styles.tarjeta} ${styles.tarjetaIntervalo}`}
        >
          <div className={styles.tarjetaTitulo}>
            <div className={styles.icono}>
              ⏱️
            </div>

            <div>
              <h2>
                Programación de actualización
              </h2>

              <p>
                Configura la frecuencia de
                actualización automática del sistema.
              </p>
            </div>
          </div>

          <div className={styles.intervaloContenido}>
            <div className={styles.campo}>
              <label htmlFor="intervalo">
                Intervalo de actualización
              </label>

              <div className={styles.inputIntervalo}>
                <input
                  id="intervalo"
                  type="number"
                  min={1}
                  step={1}
                  value={intervalo}
                  disabled={guardando !== null}
                  onChange={(e) => {
                    setIntervalo(
                      e.target.value
                    );

                    limpiarMensajes();
                  }}
                />

                <span>
                  minutos
                </span>
              </div>
            </div>

            <div className={styles.intervaloInfo}>
              <strong>
                {intervaloValido
                  ? `Cada ${intervaloNumero} minutos`
                  : "Intervalo inválido"}
              </strong>

              <p>
                Frecuencia configurada mediante
                la programación de Ranking.
              </p>
            </div>
          </div>

          <div className={styles.pieTarjeta}>
            <span className={styles.zona}>
              Programación automática
            </span>

            <div className={styles.acciones}>
              {intervaloModificado && (
                <button
                  type="button"
                  className={styles.botonCancelar}
                  onClick={cancelarIntervalo}
                  disabled={guardando !== null}
                >
                  Cancelar
                </button>
              )}

              <button
                type="button"
                className={styles.botonGuardar}
                onClick={() =>
                  void guardarProgramacion()
                }
                disabled={
                  guardando !== null ||
                  !intervaloModificado ||
                  !intervaloValido
                }
              >
                {guardando === "intervalo"
                  ? "Guardando..."
                  : "Guardar intervalo"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}