import { socket } from "@/libs/socket";
import { useCallback, useEffect, useState } from "react";
import styles from "./ui.module.css";
import { formatTime } from "@/libs/formatTime";
import peFlag from "@/img/flagPe.svg";
import esFlag from "@/img/flagEs.svg";
import peFont from "@/img/peruFont.png";
import esFont from "@/img/spainFont.png";
import TimeIcon from "@/icons/time";

type Props = {
  timeZone?: "America/Lima" | "Europe/Madrid";
};

export default function Time({
  timeZone = "America/Lima"
}: Props) {
  const [time, setTime] = useState({
    hour: "--",
    minute: "--",
    period: ""
  });

  const isPeru = timeZone === "America/Lima";

  const handleTimeSync = useCallback(({ utc }: { utc: string }) => {
    const date = new Date(utc);
    setTime(formatTime(date, timeZone));
  }, [timeZone]);

  useEffect(() => {
    fetch("/api/time")
      .then((response) => {
        if (!response.ok) {
          throw new Error("No se pudo obtener la hora inicial.");
        }

        return response.json();
      })
      .then((data: { utc: string }) => {
        handleTimeSync({ utc: data.utc });
      })
      .catch((error) => {
        console.error("Error fetching time data:", error);
      });
  }, [handleTimeSync]);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    socket.on("time:sync", handleTimeSync);

    return () => {
      socket.off("time:sync", handleTimeSync);
      // No usar socket.disconnect() aquí si el socket es compartido.
    };
  }, [handleTimeSync]);

  return (
    <div
      className={`${styles.time} ${
        isPeru ? styles.contentPe : styles.contentEs
      }`}
    >
      <div
        className={`${styles.timeContent} ${
          isPeru ? styles.pe : styles.es
        }`}
      >
        <div className={styles.timeItem}>
          <img
            src={isPeru ? peFlag.src : esFlag.src}
            alt={isPeru ? "PE" : "ES"}
            className={styles.flagIcon}
          />

          <img src={isPeru ? peFont.src : esFont.src} alt="Font" className={styles.fontIcon} />

          <div className={styles.timeInfo}>
            <TimeIcon />

            <div className={styles.timeLabel}>
              <span className={styles.hour}>{time.hour}</span>
              <span className={styles.separator}>:</span>
              <span className={styles.minute}>{time.minute}</span>
              <span className={styles.period}>{time.period}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}