import { CampaniaMedia } from "@/types/cardMedia";
import styles from "./ui.module.css";

export default function CampaniaBadge({data}: {data: CampaniaMedia}) {
    return (
        <div style={{ background: `color-mix(in srgb, ${data.hex} 70%, black)`, border: `1px solid ${data.hex}` }} className={styles.badge}>
            <img src={data.url} alt="" />
            <span>{data.nombre}</span>
        </div>
    );
}