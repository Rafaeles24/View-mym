import { Campaign } from "@/types/campaign";
import styles from "./ui.module.css";

export default function CampaignCard(
  { campaign } : { campaign: Campaign }
) {

  return (
    <div
      style={{ background: `color-mix(in srgb, ${campaign.hex} 70%, black)`, border: `1px solid ${campaign.hex}` }}
      className={styles.card}
    >
      <img src={campaign.logo_url} alt={campaign.nombre} className={styles.logo}/>
      <h4>{campaign.nombre}</h4>
    </div>
  )
}