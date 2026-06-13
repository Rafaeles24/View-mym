import { Usuario } from "@/types/usuario";
import styles from "./ui.module.css";
import DefaultProfileIcon from "@/icons/defaultProfile";

export default function UsuarioBadge({
  user
}: {
  user: Usuario
}) {
  return (
    <div className={styles.usuarioBadge}>
      <DefaultProfileIcon/>
      <div className={styles.usuarioLabel}>
        <span className={styles.usuarioName}>{user.nombre}</span>
        <p>{user.username}</p>
      </div>
    </div>
  );
}