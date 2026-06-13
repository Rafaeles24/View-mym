"use client";

import { MediaType } from "@/types/cardMedia";
import styles from "./ui.module.css";
import CampaniaBadge from "@/components/badges/campania/ui";
import { formatTime } from "@/libs/formatDate";

export default function MediaCard({ 
  data,
  selected,
  onSelect
}: {
  data: MediaType;
  selected: boolean;
  onSelect: (id: number) => void;
}) {

  const fecha = new Date(data.createdat);
  const parsedFecha = fecha.toLocaleDateString("es-Pe", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: true
  });

  return (
    <article 
      className={`${styles.article} ${selected && styles.selected}`}
      onClick={() => onSelect(data.id)}
    >
        <p>Subido el {parsedFecha}</p>
        <div className={styles.mediaContent}>
          {data.mimetype.includes("image") ?
            <img src={data.url} alt="flyer" className={styles.media} /> :
            <video src={data.url} className={styles.media} controls muted />  
          }
        </div>

        <p>Visible en el visor de</p>
        
        <div className={data.campanias.length > 0 ? styles.badgesContainer : styles.badgesContainerEmpty}>
          { data.campanias?.length > 0 ? 
            (data.campanias.map(campania => (
              <CampaniaBadge key={campania.id} data={campania}/>
            ))
          ): (
            <p>Ninguno</p>
          )}
        </div>
    </article>
  );
}