import styles from "./ui.module.css";
import Link from "next/link";

export default function HomeUI() {
  return (
    <main className={styles.page}>
      <header>
        <span>Panel de administración</span>
        <h1>M&M Dashboard</h1>
        <p>Gestiona el contenido y la configuración de los visores desde un solo lugar.</p>
      </header>
      <section className={styles.grid}>
        <Link href="/dashboard/media"><strong>Media</strong><span>Imágenes, videos y asignaciones por sede</span><b>Administrar →</b></Link>
        <Link href="/dashboard/config-visor"><strong>Visor</strong><span>Rangos, intervalos y actualización de datos</span><b>Configurar →</b></Link>
        <Link href="/dashboard/cerrador"><strong>Cerradores</strong><span>Directorio, perfiles y estados</span><b>Ver directorio →</b></Link>
        <Link href="/dashboard/cerrador/versus"><strong>Versus</strong><span>Equipos y enfrentamientos de cerradores</span><b>Gestionar →</b></Link>
      </section>
    </main>
  )
}
