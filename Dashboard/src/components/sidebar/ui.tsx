"use client";

import { usePathname } from "next/navigation";
import styles from "./ui.module.css";
import Link from "next/link";
import PlayIcon from "@/icons/play";
import EstructuraIcon from "@/icons/estructura";
import HomeIcon from "@/icons/home";
import { AuthResponse } from "@/types/auth";
import UsuarioBadge from "../badges/usuario/ui";
import logo from "@/img/mymcorp.png";
import StartIcon from "@/icons/star";

export default function Sidebar({
  user,
} : {
  user: AuthResponse
}) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      <div className={styles.logo}>
        <img src={logo.src} alt="MyDecks Logo" width={30} height={30} />
        <h2>Dashboard</h2>
      </div>
      <div className={styles.links}>
        <Link href={"/dashboard"} className={`${styles.navLinks} ${pathname === "/dashboard" && styles.active}`}>
          <HomeIcon />
          <span>Inicio</span>
        </Link>
        <Link href={"/dashboard/media"} className={`${styles.navLinks} ${pathname === "/dashboard/media" && styles.active}`}>
          <PlayIcon />  
          <span>Media</span>
        </Link>

        <Link href={"/dashboard/ranking"} className={`${styles.navLinks} ${pathname === "/dashboard/ranking" && styles.active}`}>
          <StartIcon/>
          <span>Ranking</span>
        </Link>
        <Link href={"/dashboard/colaborador"} className={`${styles.navLinks} ${pathname === "/dashboard/colaborador" && styles.active}`}>
          <EstructuraIcon/>
          <span>Colaboradores</span>
        </Link>
      </div>

      <div className={styles.user}>
        <UsuarioBadge user={user} />
      </div>
    </nav>
  )
}