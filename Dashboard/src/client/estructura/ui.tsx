import { Campaign } from "@/types/campaign";
import { Sede } from "@/types/sede";
import styles from "./ui.module.css";
import CampaignCard from "@/components/cards/campaign/ui";
import EstructuraIcon from "@/icons/estructura";
import LocationIcon from "@/icons/location";
import CampaniaBadge from "@/components/badges/campania/ui";

export default function EstructuraUI({
  campaigns,
  sedes
} : {
  campaigns: Campaign[];
  sedes: Sede[];
}) {
  return (
    <div>
      <h1>Estructura</h1>
      <div>
        <div className={styles.header}>

        </div>
        
        <div className={styles.contenido}>
          <div className={styles.campaignsContainer}>
            <div>
              <h2>Campañas</h2>
            </div>
            <div className={styles.campaigns}>
              { campaigns.length === 0 ? <p>No hay campañas</p> : 
                campaigns.map(campaign => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))
              }
            </div>
          </div>

          <div className={styles.sedesContainer}>
            <h2>Sedes</h2>
            <div className={styles.sedes}>
              { sedes.length === 0 ? <p>No hay sedes</p> : 
                sedes.map(sede => (
                <div key={sede.id} className={styles.sedeCard}>
                  <LocationIcon />
                  <h4>{sede.nombre}</h4>
                  <div className={sede.campaigns.length > 0 ? styles.badgesContainer : styles.badgesContainerEmpty}>
                    { sede.campaigns.length === 0 ? <p>Ninguna campaña</p> :
                      sede.campaigns.map(campaign => (
                        <CampaniaBadge key={campaign.id} data={campaign}/>
                      )) 
                    }
                  </div>
                </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}