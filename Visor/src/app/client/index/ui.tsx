"use client";

import CampaignSelect from "@/components/campaignSelect/ui";
import Player from "@/components/player/ui";
import { Campaign, FullCampaign, Sede } from "@/types/Campaign";
import { useEffect, useRef, useState } from "react";
import styles from "./ui.module.css";
import { socket } from "@/libs/socket";

export default function IndexClient({data}: {data: Campaign[]}) {
    const [ campaigns, setCampaigns ] = useState<Campaign[]>(data);
    const [ campaign, setCampaign ] = useState<FullCampaign | null>(null);
    const [ selected, setSelected ] = useState<{ campaignId: number; } | null>(null);
    const [ connected, setConnected ] = useState(false);
    
    const cache = useRef<Map<string, FullCampaign>>(new Map());

    const handleSelect = async (campaignId: number) => {

        setSelected({campaignId});

        const key = `${campaignId}`;

        if (cache.current.has(key)) {
            setCampaign(cache.current.get(key) ?? null);
            return;
        }

        try {
            
            const res = await fetch(`/api/visor/campaign/${campaignId}`);
            const data = await res.json() as FullCampaign;

            cache.current.set(key, data);
            /* console.log(data); */
            setCampaign(data);

        } catch (error) {
            console.error(`Error al cargar una campana: ${error}`)
        }
    }

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
            <div className={styles.estadoServidor}>
                Estado del servidor: {" "}
                <strong style={{ color: connected ? "green" : "red" }}>
                    {connected ? "Conectado" : "Desconectado"}
                </strong>
            </div>
            <div className={styles.campaignSelects}>
                { campaigns.length === 0 ? <div>NO hay registros</div> : (
                    campaigns.map(campaign => 
                        <CampaignSelect 
                            key={campaign.id}
                            data={campaign}
                            selectedCampaignId={selected?.campaignId ?? null}
                            onSelectCampaignId={handleSelect}
                        />
                    )
                )}
            </div>

            <Player campaign={campaign}/>
        </div>
    );
}