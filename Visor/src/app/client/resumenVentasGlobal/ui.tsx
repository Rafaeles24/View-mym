
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Image from "next/image";

import styles from "./ui.module.css";
import { ResumenVentas } from "@/types/resumenVenta";
import { obtenerMinutos } from "@/lib/formatTime";
import { Sede } from "@/types/sede";
import { RankingRangoFecha } from "@/types/ranking";
import RankingRango from "@/components/rankingRangoFecha/ui";
import LogoSvg from "@/icons/logo.svg";

type Tramo = ResumenVentas["global"]["tramos"][number];

type EstadoTramo =
  | "FINALIZADO"
  | "EN CURSO"
  | "SIN DEFINIR";

type PuntoGrafico = {
  minuto: number;
  hoy: number | null;
  ayer: number | null;
};

function obtenerHoraLima(): number {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const hora = Number(
    partes.find((p) => p.type === "hour")?.value ?? 0
  );
  const minuto = Number(
    partes.find((p) => p.type === "minute")?.value ?? 0
  );

  return hora * 60 + minuto;
}

function obtenerEstadoTramo(
  actual: number,
  inicio: string,
  fin: string
): EstadoTramo {
  if (actual >= obtenerMinutos(fin)) return "FINALIZADO";
  if (actual >= obtenerMinutos(inicio)) return "EN CURSO";
  return "SIN DEFINIR";
}

function formatearMinutos(minutos: number) {
  const hora = Math.floor(minutos / 60) % 12 || 12;
  const minuto = minutos % 60;
  return `${hora}:${String(minuto).padStart(2, "0")}`;
}

function formatearHora(hora: string) {
  return formatearMinutos(obtenerMinutos(hora));
}

/*
 * Genera los puntos del gráfico:
 * - Un punto inicial con cero ventas.
 * - Un punto por cada tramo terminado.
 * - Un punto en la hora actual para el tramo en curso.
 * - Ningún punto correspondiente a tramos futuros.
 */
function construirDatosGrafico(
  tramosHoy: Tramo[],
  tramosAyer: Tramo[],
  horaActual: number
): PuntoGrafico[] {
  if (!tramosHoy.length) return [];

  const tramosOrdenados = [...tramosHoy].sort(
    (a, b) =>
      obtenerMinutos(a.hora_inicio) -
      obtenerMinutos(b.hora_inicio)
  );

  const inicio = obtenerMinutos(tramosOrdenados[0].hora_inicio);

  if (horaActual < inicio) return [];

  const ayerPorClave = new Map(
    tramosAyer.map((tramo) => [tramo.clave, tramo.cantidad])
  );

  const puntos: PuntoGrafico[] = [
    { minuto: inicio, hoy: 0, ayer: 0 },
  ];

  let acumuladoHoy = 0;
  let acumuladoAyer = 0;

  for (const tramo of tramosOrdenados) {
    const estado = obtenerEstadoTramo(
      horaActual,
      tramo.hora_inicio,
      tramo.hora_fin
    );

    if (estado === "SIN DEFINIR") break;

    acumuladoHoy += tramo.cantidad;

    if (estado === "FINALIZADO") {
      acumuladoAyer += ayerPorClave.get(tramo.clave) ?? 0;

      puntos.push({
        minuto: obtenerMinutos(tramo.hora_fin),
        hoy: acumuladoHoy,
        ayer: acumuladoAyer,
      });
    } else {
      puntos.push({
        minuto: horaActual,
        hoy: acumuladoHoy,
        ayer: null,
      });
      break;
    }
  }

  return puntos;
}

/* GRÁFICO REUTILIZABLE */

function GraficoVentas({
  titulo,
  tramosHoy,
  tramosAyer,
  horaActual,
}: {
  titulo: string;
  tramosHoy: Tramo[];
  tramosAyer: Tramo[];
  horaActual: number | null;
}) {
  const datos = useMemo(() => {
    if (horaActual === null) return [];

    return construirDatosGrafico(
      tramosHoy,
      tramosAyer,
      horaActual
    );
  }, [tramosHoy, tramosAyer, horaActual]);

  const ticks = useMemo(
    () => [...new Set(datos.map((d) => d.minuto))],
    [datos]
  );

  const minutosInicio = datos[0]?.minuto ?? 0;
  const minutosFin =
    datos.length > 1
      ? datos[datos.length - 1].minuto
      : minutosInicio + 1;

  return (
    <article className={styles.chartCard}>
      <h3>{titulo}</h3>

      <div className={styles.chartContainer}>
        {datos.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={datos}
              margin={{
                top: 15,
                right: 20,
                left: 0,
                bottom: 5,
              }}
            >
              <CartesianGrid
                stroke="#303030"
                strokeOpacity={0.8}
              />

              <XAxis
                type="number"
                dataKey="minuto"
                domain={[minutosInicio, minutosFin]}
                ticks={ticks}
                tickFormatter={formatearMinutos}
                tick={{
                  fill: "#c8c8c8",
                  fontSize: 13,
                }}
                tickLine={false}
                axisLine={{ stroke: "#555" }}
                tickMargin={12}
                allowDecimals={false}
              />

              <YAxis
                allowDecimals={false}
                domain={[0, "auto"]}
                tick={{
                  fill: "#c8c8c8",
                  fontSize: 13,
                }}
                tickLine={false}
                axisLine={false}
              />

              <Tooltip
                labelFormatter={(valor) =>
                  formatearMinutos(Number(valor))
                }
                formatter={(value, name) => [
                  `${value} ventas`,
                  name,
                ]}
                contentStyle={{
                  background: "#171717",
                  border: "1px solid #454545",
                  borderRadius: 10,
                  color: "#fff",
                }}
                labelStyle={{ color: "#fff" }}
              />

              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{
                  fontSize: 25,
                  paddingTop: 10,
                }}
              />

              <Line
                type="linear"
                dataKey="hoy"
                name="Hoy"
                stroke="#ca0000"
                strokeWidth={5}
                dot={{
                  r: 5,
                  fill: "#ca0000",
                  strokeWidth: 0,
                }}
                activeDot={{ r: 7 }}
                isAnimationActive={false}
                connectNulls={false}
              />

              <Line
                type="linear"
                dataKey="ayer"
                name="Ayer"
                stroke="#969696"
                strokeWidth={3}
                strokeDasharray="9 6"
                dot={{
                  r: 5,
                  fill: "#969696",
                  strokeWidth: 0,
                }}
                activeDot={{ r: 7 }}
                isAnimationActive={false}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className={styles.sinDatos}>
            Esperando el inicio de las ventas
          </div>
        )}
      </div>
    </article>
  );
}

/* TARJETAS REUTILIZABLES */

function TramosVentas({
  titulo,
  tramosHoy,
  tramosAyer,
  horaActual,
}: {
  titulo: string;
  tramosHoy: Tramo[];
  tramosAyer: Tramo[];
  horaActual: number | null;
}) {
  const tramosVisibles = useMemo(() => {
    if (horaActual === null) return [];

    return [...tramosHoy]
      .sort(
        (a, b) =>
          obtenerMinutos(a.hora_inicio) -
          obtenerMinutos(b.hora_inicio)
      )
      .map((tramo) => ({
        ...tramo,
        estado: obtenerEstadoTramo(
          horaActual,
          tramo.hora_inicio,
          tramo.hora_fin
        ),
      }))
      .filter((tramo) => tramo.estado !== "SIN DEFINIR");
  }, [tramosHoy, horaActual]);

  const ayerPorClave = useMemo(
    () =>
      new Map(
        tramosAyer.map((tramo) => [
          tramo.clave,
          tramo.cantidad,
        ])
      ),
    [tramosAyer]
  );

  return (
    <section className={styles.tramosContent}>
      <h3>{titulo}</h3>

      <div className={styles.tramosGrid}>
        {tramosVisibles.map((tramo) => {
          const cantidadAyer =
            ayerPorClave.get(tramo.clave) ?? 0;

          const balance = tramo.cantidad - cantidadAyer;

          const balanceClass =
            balance > 0
              ? styles.positivo
              : balance < 0
                ? styles.negativo
                : styles.neutro;

          return (
            <article
              key={tramo.clave}
              className={`${styles.tramoCard} ${
                tramo.estado === "EN CURSO"
                  ? styles.tramoActivo
                  : ""
              }`}
            >
              <div className={styles.tramoHorario}>
                <span>
                  {formatearHora(tramo.hora_inicio)}
                  {" - "}
                  {formatearHora(tramo.hora_fin)}
                </span>

                {tramo.estado === "EN CURSO" && (
                  <span className={styles.estadoActivo}>
                    EN CURSO
                  </span>
                )}
              </div>

              <div className={styles.comparativaCard}>
                {/* IZQUIERDA: AYER Y BALANCE */}
                <div className={styles.ventasAyer}>
                  <span className={styles.cardLabel}>
                    Ayer: {cantidadAyer.toLocaleString("es-PE")}
                  </span>

                  <strong className={balanceClass}>
                    {balance > 0 ? "+" : ""}
                    {balance.toLocaleString("es-PE")} ventas
                  </strong>
                </div>

                {/* DERECHA: VENTAS DE HOY */}
                <strong className={styles.tramoCantidad}>
                  {tramo.cantidad.toLocaleString("es-PE")}
                </strong>
              </div>
            </article>
          );
        })}

        {tramosVisibles.length === 0 && (
          <div className={styles.sinDatos}>
            No hay tramos iniciados
          </div>
        )}
      </div>
    </section>
  );
}

/* VISTA PRINCIPAL */

export default function VentasResumenUI({
  sedeOrigin,
  rankingRango,
  hoy,
  ayer,
}: {
  sedeOrigin: Sede;
  rankingRango: RankingRangoFecha;
  hoy: ResumenVentas;
  ayer: ResumenVentas;
}) {
  const [horaActual, setHoraActual] = useState<number | null>(
    null
  );

  useEffect(() => {
    const actualizar = () => setHoraActual(obtenerHoraLima());

    actualizar();

    const intervalo = setInterval(actualizar, 60_000);

    return () => clearInterval(intervalo);
  }, []);

  return (
    <main className={styles.main}>
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
              RESUMEN DIARIO DE{" "}
              <span className={styles.tituloVentas}>
                {sedeOrigin.nombre}
              </span>
            </h1>
            <p>
              Disciplina hoy, grandes resultados mañana
            </p>
          </div>
        </div>

        <div className={styles.rankingRango}>
          <RankingRango schedule={rankingRango} />
        </div>
      </header>

      <section className={styles.resumenContainer}>
        {/* FILA SUPERIOR: DOS GRÁFICOS */}

        <div className={styles.graficosGrid}>
          <GraficoVentas
            titulo="Evolución de ventas - Global"
            tramosHoy={hoy.global.tramos}
            tramosAyer={ayer.global.tramos}
            horaActual={horaActual}
          />

          <GraficoVentas
            titulo={`Evolución de ventas - ${hoy.sede.nombre}`}
            tramosHoy={hoy.sede.tramos}
            tramosAyer={ayer.sede.tramos}
            horaActual={horaActual}
          />
        </div>

        {/* FILA INFERIOR: TRAMOS */}

        <div className={styles.tramosRow}>
          <TramosVentas
            titulo="Ventas por tramos - Global"
            tramosHoy={hoy.global.tramos}
            tramosAyer={ayer.global.tramos}
            horaActual={horaActual}
          />

          <TramosVentas
            titulo={`Ventas por tramos - ${hoy.sede.nombre}`}
            tramosHoy={hoy.sede.tramos}
            tramosAyer={ayer.sede.tramos}
            horaActual={horaActual}
          />
        </div>
      </section>
    </main>
  );
}
