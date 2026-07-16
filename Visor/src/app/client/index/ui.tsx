"use client";

import CampaignSelect from "@/components/campaignSelect/ui";
import Player from "@/components/player/ui";
import { Campaign, FullCampaign, Sede } from "@/types/Campaign";
import { useEffect, useRef, useState } from "react";
import styles from "./ui.module.css";
import { socket } from "@/libs/socket";
import { Ranking } from "@/types/ranking";
import RankingClient from "./ranking/ui";
import SelectCampaign from "./selectCampaigns/ui";
import mymcorp from "@/img/mymcorp.png";
import RankingIcon from "@/icons/ranking";
import PlayIcon from "@/icons/play";

export default function IndexClient({data, ranking}: {data: Campaign[], ranking: Ranking}) {
    const [ connected, setConnected ] = useState(false);
    const [ vistaSeleccionada, setVistaSeleccionada ] = useState<"ranking" | "flyers">("ranking");

    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
        }
        
        socket.on("connect", () => {
            setConnected(true);
        });

        socket.on("disconnect", () => {
            setConnected(false);
        });

        return () => {
            socket.off("connect");
            socket.off("disconnect");
            socket.disconnect();
        }
    }, [])

    return (
        <div className={styles.index}>
          <nav className={styles.selector}>
            <div className={styles.logoContainer}>
              <img src={mymcorp.src} alt="MyMcorp" className={styles.logo} />
              <h1>Visor</h1>
            </div>

            <div className={styles.buttons}>
              <button
                type="button"
                className={`${styles.button} ${vistaSeleccionada === "ranking" ? styles.active : ""}`}
                onClick={() => setVistaSeleccionada("ranking")}
                aria-pressed={vistaSeleccionada === "ranking"}
              >
                <RankingIcon />
                <span className={styles.label}>Ranking</span>
              </button>
              <button
                type="button"
                className={`${styles.button} ${vistaSeleccionada === "flyers" ? styles.active : ""}`}
                onClick={() => setVistaSeleccionada("flyers")}
                aria-pressed={vistaSeleccionada === "flyers"}
              >
                <PlayIcon />
                <span className={styles.label}>Flyers</span>
              </button>
            </div>
          </nav>

          <div className={styles.content}>
            { vistaSeleccionada === "ranking" && <RankingClient data={ranking} /> }
            { vistaSeleccionada === "flyers" && <SelectCampaign data={data} /> }
          </div>

          <div className={styles.estadoServidor}>
              Estado del servidor: {" "}
              <strong style={{ color: connected ? "green" : "red" }}>
                  {connected ? "Conectado" : "Desconectado"}
              </strong>
          </div>
        </div>
    );
}