"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { FormEvent } from "react";

import {
  obtenerEstadoReconciliacionSica,
  reconciliarSica,
  sincronizarSica,
} from "@/services/sica/sica.service";
import type {
  EstadoReconciliacionSica,
  ResultadoSincronizacionSica,
  SeguimientoReconciliacionSica,
} from "@/types/sica";

import styles from "./ui.module.css";

const MILISEGUNDOS_DIA = 86_400_000;
const MAXIMO_DIAS = 31;

function fechaActualLima(): string {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";

  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

function fechaUtc(valor: string): Date | null {
  const partes = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!partes) {
    return null;
  }

  const anio = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));

  if (
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() !== mes - 1 ||
    fecha.getUTCDate() !== dia
  ) {
    return null;
  }

  return fecha;
}

function sumarDias(valor: string, dias: number): string {
  const fecha = fechaUtc(valor);

  if (!fecha) {
    return "";
  }

  fecha.setUTCDate(fecha.getUTCDate() + dias);

  return fecha.toISOString().slice(0, 10);
}

function diasInclusivos(inicio: string, fin: string): number {
  const fechaInicio = fechaUtc(inicio);
  const fechaFin = fechaUtc(fin);

  if (!fechaInicio || !fechaFin) {
    return 0;
  }

  return (
    Math.round(
      (fechaFin.getTime() - fechaInicio.getTime()) /
        MILISEGUNDOS_DIA,
    ) + 1
  );
}

function fechaParaApi(valor: string): string {
  const [anio, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${anio}`;
}

function fechaHoraLegible(valor: string | null): string {
  if (!valor) {
    return "—";
  }

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return valor;
  }

  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(fecha);
}

function etiquetaEstado(
  estado: EstadoReconciliacionSica,
): string {
  const etiquetas: Record<
    EstadoReconciliacionSica,
    string
  > = {
    SIN_EJECUCIONES: "Sin ejecuciones",
    EN_PROCESO: "En proceso",
    COMPLETADO: "Completado",
    ERROR: "Error",
  };

  return etiquetas[estado];
}

function claseEstado(
  estado: EstadoReconciliacionSica,
): string {
  if (estado === "EN_PROCESO") {
    return styles.estadoProceso;
  }

  if (estado === "COMPLETADO") {
    return styles.estadoCompletado;
  }

  if (estado === "ERROR") {
    return styles.estadoError;
  }

  return styles.estadoVacio;
}

type SicaUIProps = {
  seguimientoInicial: SeguimientoReconciliacionSica | null;
  errorEstadoInicial: string | null;
};

export default function SicaUI({
  seguimientoInicial,
  errorEstadoInicial,
}: SicaUIProps) {
  const hoy = fechaActualLima();
  const [inicio, setInicio] = useState(hoy);
  const [fin, setFin] = useState(hoy);
  const [seguimiento, setSeguimiento] =
    useState<SeguimientoReconciliacionSica | null>(
      seguimientoInicial,
    );
  const [resultadoSync, setResultadoSync] =
    useState<ResultadoSincronizacionSica | null>(null);
  const [operacion, setOperacion] = useState<
    "sync" | "reconciliar" | null
  >(null);
  const [cargandoEstado, setCargandoEstado] =
    useState(false);
  const [errorOperacion, setErrorOperacion] =
    useState<string | null>(null);
  const [errorEstado, setErrorEstado] =
    useState<string | null>(errorEstadoInicial);
  const [mensaje, setMensaje] = useState<string | null>(
    null,
  );

  const diasSeleccionados = useMemo(
    () => diasInclusivos(inicio, fin),
    [inicio, fin],
  );
  const maximoFin = useMemo(() => {
    const limiteRango = sumarDias(inicio, MAXIMO_DIAS - 1);

    if (!limiteRango) {
      return hoy;
    }

    return limiteRango < hoy ? limiteRango : hoy;
  }, [hoy, inicio]);
  const procesoActivo =
    seguimiento?.estado === "EN_PROCESO";
  const rangoValido =
    diasSeleccionados >= 1 &&
    diasSeleccionados <= MAXIMO_DIAS &&
    inicio <= hoy &&
    fin <= hoy;
  const porcentaje =
    seguimiento?.diasTotales
      ? Math.min(
          100,
          Math.round(
            (seguimiento.diasCompletados /
              seguimiento.diasTotales) *
              100,
          ),
        )
      : 0;

  const actualizarEstado = useCallback(
    async (mostrarCarga = false) => {
      if (mostrarCarga) {
        setCargandoEstado(true);
      }

      try {
        const estado =
          await obtenerEstadoReconciliacionSica();
        setSeguimiento(estado);
        setErrorEstado(null);
      } catch (error) {
        setErrorEstado(
          error instanceof Error
            ? error.message
            : "No se pudo consultar el estado",
        );
      } finally {
        setCargandoEstado(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!procesoActivo) {
      return;
    }

    const intervalo = window.setInterval(() => {
      void actualizarEstado();
    }, 3000);

    return () => window.clearInterval(intervalo);
  }, [actualizarEstado, procesoActivo]);

  function cambiarInicio(valor: string) {
    setInicio(valor);

    if (!valor) {
      return;
    }

    const limiteRango = sumarDias(
      valor,
      MAXIMO_DIAS - 1,
    );
    const limite =
      limiteRango && limiteRango < hoy
        ? limiteRango
        : hoy;

    if (!fin || fin < valor) {
      setFin(valor);
    } else if (fin > limite) {
      setFin(limite);
    }
  }

  async function ejecutarSincronizacion() {
    setOperacion("sync");
    setErrorOperacion(null);
    setMensaje(null);
    setResultadoSync(null);

    try {
      const resultado = await sincronizarSica();
      setResultadoSync(resultado);
      setMensaje(resultado.mensaje);
    } catch (error) {
      setErrorOperacion(
        error instanceof Error
          ? error.message
          : "No se pudo sincronizar SICA",
      );
    } finally {
      setOperacion(null);
    }
  }

  async function iniciarReconciliacion(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setErrorOperacion(null);
    setMensaje(null);

    if (!rangoValido) {
      setErrorOperacion(
        `Selecciona un rango válido de hasta ${MAXIMO_DIAS} días, sin fechas futuras.`,
      );
      return;
    }

    setOperacion("reconciliar");

    try {
      const resultado = await reconciliarSica(
        fechaParaApi(inicio),
        fechaParaApi(fin),
      );
      setMensaje(
        `Reconciliación iniciada para ${resultado.inicio} - ${resultado.fin}.`,
      );
      await actualizarEstado();
    } catch (error) {
      setErrorOperacion(
        error instanceof Error
          ? error.message
          : "No se pudo iniciar la reconciliación",
      );
    } finally {
      setOperacion(null);
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            Integración de ventas
          </span>
          <h1>Control de SICA</h1>
          <p>
            Sincroniza ventas recientes y reconcilia periodos
            históricos.
          </p>
        </div>

        {seguimiento && (
          <span
            className={`${styles.estado} ${claseEstado(
              seguimiento.estado,
            )}`}
          >
            <span aria-hidden="true" />
            {etiquetaEstado(seguimiento.estado)}
          </span>
        )}
      </header>

      {(mensaje || errorOperacion) && (
        <div
          className={
            errorOperacion
              ? styles.alertaError
              : styles.alertaExito
          }
          role={errorOperacion ? "alert" : "status"}
        >
          {errorOperacion ?? mensaje}
        </div>
      )}

      <div className={styles.operations}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon} aria-hidden="true">
              ↻
            </div>
            <div>
              <h2>Sincronización habitual</h2>
              <p>
                Consulta SICA e importa las ventas disponibles
                actualmente.
              </p>
            </div>
          </div>

          <div className={styles.cardBody}>
            <p className={styles.help}>
              Usa esta opción para actualizar el ranking sin
              seleccionar fechas.
            </p>

            <button
              type="button"
              className={styles.primaryButton}
              disabled={operacion !== null || procesoActivo}
              onClick={ejecutarSincronizacion}
            >
              {operacion === "sync"
                ? "Sincronizando..."
                : "Sincronizar ahora"}
            </button>

            {resultadoSync && (
              <div className={styles.miniMetrics}>
                <div>
                  <span>Ventas SICA</span>
                  <strong>
                    {resultadoSync.ventasSicaProcesadas}
                  </strong>
                </div>
                <div>
                  <span>Registros</span>
                  <strong>
                    {resultadoSync.registrosVentasProcesadas}
                  </strong>
                </div>
                <div>
                  <span>Sin cerrador</span>
                  <strong>
                    {
                      resultadoSync.ventaCerradorNoRegistrado
                    }
                  </strong>
                </div>
                <div>
                  <span>Omitidos</span>
                  <strong>{resultadoSync.omitidos}</strong>
                </div>
              </div>
            )}
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon} aria-hidden="true">
              ◷
            </div>
            <div>
              <h2>Reconciliación histórica</h2>
              <p>
                Reprocesa un periodo inclusivo de hasta 31 días.
              </p>
            </div>
          </div>

          <form
            className={styles.cardBody}
            onSubmit={iniciarReconciliacion}
          >
            <div className={styles.dateGrid}>
              <label>
                <span>Fecha inicial</span>
                <input
                  type="date"
                  value={inicio}
                  max={hoy}
                  required
                  disabled={operacion !== null || procesoActivo}
                  onChange={(event) =>
                    cambiarInicio(event.target.value)
                  }
                />
              </label>

              <label>
                <span>Fecha final</span>
                <input
                  type="date"
                  value={fin}
                  min={inicio}
                  max={maximoFin}
                  required
                  disabled={operacion !== null || procesoActivo}
                  onChange={(event) =>
                    setFin(event.target.value)
                  }
                />
              </label>
            </div>

            <div className={styles.rangeInfo}>
              <span>
                {rangoValido
                  ? `${diasSeleccionados} ${
                      diasSeleccionados === 1
                        ? "día seleccionado"
                        : "días seleccionados"
                    }`
                  : "Rango inválido"}
              </span>
              <span>Máximo: {MAXIMO_DIAS} días</span>
            </div>

            <button
              type="submit"
              className={styles.secondaryButton}
              disabled={
                operacion !== null ||
                procesoActivo ||
                !rangoValido
              }
            >
              {operacion === "reconciliar"
                ? "Iniciando..."
                : "Iniciar reconciliación"}
            </button>
          </form>
        </article>
      </div>

      <article className={styles.statusCard}>
        <div className={styles.statusHeader}>
          <div>
            <span className={styles.eyebrow}>
              Seguimiento
            </span>
            <h2>Estado de reconciliación</h2>
          </div>
          <button
            type="button"
            className={styles.refreshButton}
            disabled={cargandoEstado}
            onClick={() => void actualizarEstado(true)}
          >
            {cargandoEstado ? "Consultando..." : "Actualizar estado"}
          </button>
        </div>

        {errorEstado && (
          <p className={styles.inlineError} role="alert">
            {errorEstado}
          </p>
        )}

        {!seguimiento && cargandoEstado ? (
          <div className={styles.emptyState}>
            Consultando el estado de SICA...
          </div>
        ) : seguimiento ? (
          <>
            <div className={styles.statusDetails}>
              <div>
                <span>Periodo</span>
                <strong>
                  {seguimiento.inicio && seguimiento.fin
                    ? `${seguimiento.inicio} - ${seguimiento.fin}`
                    : "Sin periodo"}
                </strong>
              </div>
              <div>
                <span>Origen</span>
                <strong>
                  {seguimiento.origen ?? "—"}
                </strong>
              </div>
              <div>
                <span>Inicio</span>
                <strong>
                  {fechaHoraLegible(seguimiento.iniciadoEn)}
                </strong>
              </div>
              <div>
                <span>Finalización</span>
                <strong>
                  {fechaHoraLegible(
                    seguimiento.finalizadoEn,
                  )}
                </strong>
              </div>
            </div>

            {seguimiento.diasTotales > 0 && (
              <div className={styles.progressSection}>
                <div className={styles.progressLabels}>
                  <span>
                    {seguimiento.fechaActual
                      ? `Procesando ${seguimiento.fechaActual}`
                      : "Progreso del periodo"}
                  </span>
                  <strong>
                    {seguimiento.diasCompletados}/
                    {seguimiento.diasTotales} días
                  </strong>
                </div>
                <div
                  className={styles.progressTrack}
                  role="progressbar"
                  aria-label="Progreso de reconciliación"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={porcentaje}
                >
                  <span style={{ width: `${porcentaje}%` }} />
                </div>
              </div>
            )}

            {seguimiento.resumen && (
              <div className={styles.metrics}>
                <div>
                  <span>Días consultados</span>
                  <strong>
                    {seguimiento.resumen.diasConsultados}
                  </strong>
                </div>
                <div>
                  <span>Ventas SICA</span>
                  <strong>
                    {
                      seguimiento.resumen
                        .ventasSicaProcesadas
                    }
                  </strong>
                </div>
                <div>
                  <span>Registros procesados</span>
                  <strong>
                    {
                      seguimiento.resumen
                        .registrosVentasProcesadas
                    }
                  </strong>
                </div>
                <div>
                  <span>Sin cerrador</span>
                  <strong>
                    {
                      seguimiento.resumen
                        .ventaCerradorNoRegistrado
                    }
                  </strong>
                </div>
                <div>
                  <span>Omitidos</span>
                  <strong>
                    {seguimiento.resumen.omitidos}
                  </strong>
                </div>
              </div>
            )}

            {seguimiento.error && (
              <p className={styles.inlineError} role="alert">
                {seguimiento.error}
              </p>
            )}

            {seguimiento.estado === "SIN_EJECUCIONES" && (
              <div className={styles.emptyState}>
                Todavía no se ha ejecutado una reconciliación
                desde que inició el Backend.
              </div>
            )}
          </>
        ) : (
          <div className={styles.emptyState}>
            No se pudo obtener el estado actual.
          </div>
        )}
      </article>
    </section>
  );
}
