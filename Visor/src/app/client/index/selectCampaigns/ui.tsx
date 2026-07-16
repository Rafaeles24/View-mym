import CampaignSelect from "@/components/campaignSelect/ui";
import Player from "@/components/player/ui";
import { Campaign, FullCampaign } from "@/types/Campaign";
import styles from "./ui.module.css";
import { useRef, useState } from "react";

export default function SelectCampaign({data}: {data: Campaign[]}) {
  const [ campaigns, setCampaigns ] = useState<Campaign[]>(data);
  const [ selected, setSelected ] = useState<{ campaignId: number; } | null>(null);
  const [ campaign, setCampaign ] = useState<FullCampaign | null>(null);
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

  return (
    <>
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
    </>
  );
}