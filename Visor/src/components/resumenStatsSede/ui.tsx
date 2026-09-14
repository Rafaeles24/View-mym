"use client";

import type { SedeStats } from "@/types/stats";
import Image from "next/image";
import BarraBlancaSvg from "@/icons/barra blanco.svg";
import styles from "./ui.module.css";

export default function ResumenStatsSede({
  stats,
  id = "stats-sede",
  titulo = "SEDES",
  subtitulo = "Resumen diario",
}: {
  stats: SedeStats;
  id?: string;
  titulo?: string;
  subtitulo?: string;
}) {
  const sedesVisibles = [...stats.sedes]
    .filter(
      (item) =>
        item.sede.trim().toUpperCase() !== "SIN SEDE" ||
        item.cantidad > 0
    )
    .sort((a, b) => a.puesto - b.puesto);

  const sedesAsignadas = sedesVisibles.filter(
    (item) => item.sede_id != null
  );

  const sedesSinAsignar = sedesVisibles.filter(
    (item) => item.sede_id === null
  );

  return (
    <section
      className={styles.resumenStatsSede}
      aria-labelledby={id}
    >
      <header className={styles.cabecera}>
        <Image
          className={styles.icono}
          src={BarraBlancaSvg}
          width={48}
          height={48}
          alt=""
          aria-hidden="true"
        />

        <div className={styles.textosCabecera}>
          <p className={styles.subtitulo}>{subtitulo}</p>
          <h3 className={styles.titulo} id={id}>
            {titulo}
          </h3>
        </div>
      </header>

      {sedesAsignadas.length > 0 ? (
        <div
          className={styles.scrollSedes}
          tabIndex={0}
          role="region"
          aria-label="Clasificación diaria de sedes"
        >
          <ol role="list" className={styles.listaSedes}>
            {sedesAsignadas.map((item) => (
              <li
                key={item.sede_id}
                value={item.puesto}
                className={`${styles.filaSede} ${
                  item.puesto === 1 ? styles.sedePrimera : ""
                }`}
              >
                <div className={styles.sedePuesto}>
                  <span
                    className={styles.puestoSede}
                    aria-label={`Puesto ${item.puesto}`}
                  >
                    {item.puesto}
                  </span>

                  <span className={styles.nombreSede}>
                    {item.sede}
                  </span>
                </div>

                <div className={styles.ventasSede}>
                  <strong>
                    {item.cantidad.toLocaleString("es-PE")}
                  </strong>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className={styles.vacio}>
          <p>Sin registro de sedes</p>
        </div>
      )}

      <footer className={styles.conteoTotal}>
        {sedesSinAsignar.map((item) => (
          <div key={item.sede} className={styles.sinSede}>
            <p>BO</p>
            <strong>
              {item.cantidad.toLocaleString("es-PE")}
            </strong>
          </div>
        ))}
        <div className={styles.totalSedes}>
          <span>TOTAL</span>
          <strong>
            {stats.total_ventas.toLocaleString("es-PE")}
          </strong>
        </div>
      </footer>
    </section>
  );
}