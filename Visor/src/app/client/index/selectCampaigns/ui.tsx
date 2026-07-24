"use client";

import CampaignSelect from "@/components/campaignSelect/ui";
import Player from "@/components/player/ui";
import { Campaign, FullCampaign } from "@/types/Campaign";
import styles from "./ui.module.css";
import { useRef, useState } from "react";

interface SelectCampaignProps {
  data: Campaign[];
}

export default function SelectCampaign({
  data,
}: SelectCampaignProps) {
  const [selectedCampaignId, setSelectedCampaignId] =
    useState<number | null>(null);

  const [campaign, setCampaign] =
    useState<FullCampaign | null>(null);

  const [loading, setLoading] = useState(false);

  const cache = useRef<Map<number, FullCampaign>>(
    new Map(),
  );

  const handleSelect = async (
    campaignId: number,
  ) => {
    setSelectedCampaignId(campaignId);

    const cachedCampaign =
      cache.current.get(campaignId);

    if (cachedCampaign) {
      setCampaign(cachedCampaign);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `/api/visor/campaign/${campaignId}`,
      );

      if (!response.ok) {
        throw new Error(
          `Error HTTP ${response.status}`,
        );
      }

      const campaignData =
        (await response.json()) as FullCampaign;

      cache.current.set(
        campaignId,
        campaignData,
      );

      setCampaign(campaignData);
    } catch (error) {
      console.error(
        "Error al cargar la campaña:",
        error,
      );

      setCampaign(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.flyerContent}>
      <section className={styles.player}>
        {loading ? (
          <div className={styles.message}>
            Cargando campaña...
          </div>
        ) : (
          <Player campaign={campaign} />
        )}
      </section>

      <section className={styles.campaignSelects}>
        {data.length === 0 ? (
          <div className={styles.message}>
            No hay campañas registradas
          </div>
        ) : (
          data.map((item) => (
            <CampaignSelect
              key={item.id}
              data={item}
              selectedCampaignId={
                selectedCampaignId
              }
              onSelectCampaignId={
                handleSelect
              }
            />
          ))
        )}
      </section>
    </main>
  );
}