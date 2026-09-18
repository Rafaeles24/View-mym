"use client";

import { formatTime } from "@/lib/formatTime";
import { socket } from "@/lib/socket";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./ui.module.css";
import { Time } from "@/types/time";
import Image from "next/image";
import FlagPe from "@/icons/bandera peru.svg";
import FlagEs from "@/icons/bandera españa.svg";

type ClockTime = {
  hour: string;
  minute: string;
  second: string;
  period: string;
};

const EMPTY_TIME: ClockTime = {
  hour: "--",
  minute: "--",
  second: "--",
  period: "",
};

const TIME_ZONE_PE = "America/Lima";
const TIME_ZONE_ES = "Europe/Madrid";

export default function TimeUI({
  time,
}: {
  time: Time;
}) {
  const [timePe, setTimePe] =
    useState<ClockTime>(EMPTY_TIME);

  const [timeEs, setTimeEs] =
    useState<ClockTime>(EMPTY_TIME);

  const offsetRef = useRef(0);

  const sincronizadoRef = useRef(false);

  /*
   * ==========================================
   * ACTUALIZAR RELOJ
   * ==========================================
   */

  const actualizarRelojes = useCallback(() => {
    if (!sincronizadoRef.current) {
      return;
    }

    const ahoraServidor = new Date(
      Date.now() + offsetRef.current
    );

    setTimePe(
      formatTime(
        ahoraServidor,
        TIME_ZONE_PE
      )
    );

    setTimeEs(
      formatTime(
        ahoraServidor,
        TIME_ZONE_ES
      )
    );
  }, []);

  /*
   * ==========================================
   * SINCRONIZAR CON EL SERVIDOR
   * ==========================================
   */

  const handleTimeSync = useCallback(
    ({ utc }: { utc: string }) => {
      const servidorMs =
        Date.parse(utc);

      if (
        !Number.isFinite(servidorMs)
      ) {
        console.error(
          "[TIME] Hora inválida:",
          utc
        );

        return;
      }

      /*
       * Calculamos cuánto difiere el reloj
       * del servidor del reloj del navegador.
       */
      offsetRef.current =
        servidorMs - Date.now();

      sincronizadoRef.current =
        true;

      actualizarRelojes();
    },
    [actualizarRelojes]
  );

  /*
   * ==========================================
   * HORA INICIAL
   * ==========================================
   */

  useEffect(() => {
    if (!time) {
      return;
    }

    handleTimeSync({
      utc: time.utc,
    });
  }, [
    time,
    handleTimeSync,
  ]);

  /*
   * ==========================================
   * SOCKET.IO
   * ==========================================
   */

  useEffect(() => {
    function onTimeSync(
      data: {
        utc: string;
      }
    ) {
      console.log(
        "[SOCKET] time:sync",
        data.utc
      );

      handleTimeSync(data);
    }

    socket.on(
      "time:sync",
      onTimeSync
    );

    return () => {
      socket.off(
        "time:sync",
        onTimeSync
      );
    };
  }, [handleTimeSync]);

  /*
   * ==========================================
   * SEGUNDOS EN TIEMPO REAL
   * ==========================================
   */

  useEffect(() => {
    /*
     * Ejecutamos varias veces por segundo
     * para evitar que el intervalo quede
     * visualmente desplazado respecto al
     * cambio real del segundo.
     */
    const timer =
      window.setInterval(
        actualizarRelojes,
        250
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [actualizarRelojes]);

  return (
    <div className={styles.container}>
      <Clock
        country="PE"
        label="Lima"
        time={timePe}
      />

      <div
        className={styles.divider}
      />

      <Clock
        country="ES"
        label="Madrid"
        time={timeEs}
      />
    </div>
  );
}

function Clock({
  country,
  label,
  time,
}: {
  country: string;
  label: string;
  time: ClockTime;
}) {
  return (
    <div className={styles.clock}>
      <div
        className={styles.location}
      >
        <Image
          src={country === "PE" ? FlagPe : FlagEs}
          width={48}
          height={48}
          alt="flag"
        />
        
        <span
          className={`${styles.country} ${country === "PE" ? styles.pe : styles.es}`}
        >
          {country}
        </span>

        <span>{label}</span>
      </div>

      <div
        className={styles.time}
      >
        <span className={`${styles.hour} ${country === "PE" ? styles.pehour : styles.eshour}`}>{time.hour}</span>

        <span
          className={styles.separator}
        >
          :
        </span>

        <span className={`${styles.minute} ${country === "PE" ? styles.peminute : styles.esminute}`}>{time.minute}</span>

        <span
          className={
            styles.seconds
          }
        >
          :{time.second}
        </span>

        {time.period && (
          <span
            className={
              styles.period
            }
          >
            {time.period}
          </span>
        )}
      </div>
    </div>
  );
}