"use client";

import { Campaign } from "@/types/Campaign";
import styles from "./ui.module.css";
import { useEffect, useState } from "react";
import { socket } from "@/libs/socket";
import StarsCss from "../starsCss/ui";

export default function CampaignSelect({ 
    data, 
    selectedCampaignId,
    onSelectCampaignId 
} : { 
    data: Campaign;
    selectedCampaignId: number | null;
    onSelectCampaignId: (campaignId: number) => void; 
}) {
    const [ campaign, setCampaign ] = useState<Campaign>(data);

    /* useEffect(() => {
        const handleCreated = (campaign: Campaign) => {
            setCampaign(prev => ({
                ...prev,
                sedes: [
                    ...prev.sedes.filter(s => s.id !== campaign.id),
                    campaign
                ]
            }));
        };

        const handleDeleted = (id: number) => {
            setCampaign(prev => ({
                ...prev,
                sedes: prev.campaigns.filter(c => c.id !== id)
            }));
        };

        socket.on("global:campaign-created", handleCreated);
        socket.on("global:campaign-deleted", handleDeleted);

        return () => {
            socket.off("global:campaign-created", handleCreated);
            socket.off("global:campaign-deleted", handleDeleted);
        }
    }, []) */
    
    return (
        <article className={styles.campaignSelect} onClick={() => onSelectCampaignId(campaign.id)}>
            <StarsCss />
            <img src={campaign.logoUrl} alt={campaign.nombre} className={styles.logo} />
            <div className={styles.sedeInfo}>
                { !campaign.sedes || campaign.sedes.length === 0 ?
                    <p className={styles.sedeName}>Sin sedes</p> : 
                    campaign.sedes.map(sede => (
                        <div key={sede.id} className={styles.sedeItem}>
                            <p>{sede.nombre}</p>
                        </div>
                    ))    
                }
            </div>
        </article>
    );
}