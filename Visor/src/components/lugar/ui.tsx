
"use client";

import { RankingList } from "@/types/ranking";
import Image from "next/image";

import styles from "./ui.module.css";

import PrimeroSvg from "@/icons/primero.svg";
import SegundoSvg from "@/icons/segundo.svg";
import TerceroSvg from "@/icons/tercero.svg";

type Props = {
  persona: RankingList;
  mostrarSede?: boolean;
};

export default function Lugar({
  persona,
  mostrarSede = false,
}: Props) {

  const {
    puesto,
    nombre,
    cantidad,
    variante,
    sede,
    campaigns,
  } = persona;

  const esPrimero = puesto === 1;
  const esSegundo = puesto === 2;
  const esTercero = puesto === 3;

  const esOjt = variante === "OJT";
  const esAlta = variante === "ALTA";
  const esSup = variante === "SUP";

  return (
    <li
      value={puesto}
      className={`${styles.puesto} ${
        esPrimero
          ? styles.primero
          : esSegundo
            ? styles.segundo
            : esTercero
              ? styles.tercero
              : ""
      }`}
    >
      {/* =====================================
          POSICION
      ===================================== */}

      <span
        aria-label={`Puesto ${puesto}`}
        className={styles.posicion}
      >
        {esPrimero ? (
          <Image
            src={PrimeroSvg}
            width={70}
            height={70}
            alt=""
            aria-hidden="true"
          />
        ) : esSegundo ? (
          <Image
            src={SegundoSvg}
            width={60}
            height={60}
            alt=""
            aria-hidden="true"
          />
        ) : esTercero ? (
          <Image
            src={TerceroSvg}
            width={50}
            height={50}
            alt=""
            aria-hidden="true"
          />
        ) : (
          puesto
        )}
      </span>

      {/* =====================================
          PARTICIPANTE
      ===================================== */}

      <div className={styles.participante}>
        <p
          className={styles.nombre}
          title={nombre}
        >
          {nombre}
        </p>

        <div className={styles.detalle}>

          {/* =================================
              LOGOS DE TODAS LAS CAMPAÑAS
          ================================= */}

          {campaigns?.length > 0 && (
            <div className={styles.campaignLogos}>
              {campaigns.map((campaign) => (
                campaign.logo_url ? (
                  <Image
                    key={campaign.id}
                    src={campaign.logo_url}
                    alt={campaign.nombre}
                    title={`${campaign.nombre}: ${campaign.cantidad} ventas`}
                    width={35}
                    height={35}
                    unoptimized
                  />
                ) : null
              ))}
            </div>
          )}

          {/* =================================
              VARIANTE DEL PARTICIPANTE
          ================================= */}

          <span
            className={`${styles.detalleTexto} ${
              esOjt
                ? styles.ojt
                : esAlta
                  ? styles.alta
                  : esSup
                    ? styles.sup
                    : ""
            }`}
            title={variante}
          >
            {variante}
          </span>

          {/* =================================
              SEDE
          ================================= */}

          {mostrarSede && sede && (
            <span className={styles.sedeNombre}>
              {sede.nombre}
            </span>
          )}

        </div>
      </div>

      {/* =====================================
          TOTAL DE VENTAS
      ===================================== */}

      <strong aria-label={`${cantidad} ventas`}>
        {cantidad}
      </strong>
    </li>
  );
}
