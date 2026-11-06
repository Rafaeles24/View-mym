"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import type { Cerrador } from "@/types/cerrador";
import DefaultPerson from "@/img/default.png";

import styles from "./ui.module.css";
import { actualizarCerrador, cambiarEstadoCerrador } from "@/services/cerrador/actualizarCerrador.service";
import EditarCerrador from "../editarCerrador/ui";
import { actualizarAvatarCerrador } from "@/services/cerrador/actualizarAvatar.service";

interface CerradoresUIProps {
  cerradoresActivos: Cerrador[];
  cerradoresInactivos: Cerrador[];

  onGuardarAvatar?: (
    id: number,
    archivo: File,
  ) => Promise<void>;
}

type Estado = "activos" | "inactivos";

export default function CerradoresUI({
  cerradoresActivos,
  cerradoresInactivos,
  onGuardarAvatar,
}: CerradoresUIProps) {
  const router = useRouter();

  const [estado, setEstado] = useState<Estado>("activos");
  const [seleccionado, setSeleccionado] =
    useState<Cerrador | null>(null);

  const cerradores =
    estado === "activos"
      ? cerradoresActivos
      : cerradoresInactivos;

  async function guardarCambios(
    id: number,
    data: {
      nombre: string;
      nombre_normalizado: string;
    },
  ) {
    await actualizarCerrador(id, data);

    setSeleccionado(null);
    router.refresh();
  }

  /* ========================================
     ACTUALIZAR AVATAR
  ======================================== */

  async function guardarAvatar(
    id: number,
    archivo: File,
  ) {
    await actualizarAvatarCerrador(id, archivo);

    setSeleccionado(null);
    router.refresh();
  }

  /* ========================================
     ACTIVAR / DESACTIVAR
  ======================================== */

  async function guardarEstado(
    id: number,
    activo: boolean,
  ) {
    await cambiarEstadoCerrador(id, activo);

    setSeleccionado(null);
    router.refresh();
  }

  return (
    <>
      <main className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerInfo}>
            <h1>Cerradores</h1>
            <p>Administración de cerradores</p>
          </div>

          <div className={styles.toggle}>
            <button
              type="button"
              className={`${styles.toggleButton} ${
                estado === "activos"
                  ? styles.toggleActive
                  : ""
              }`}
              aria-pressed={estado === "activos"}
              onClick={() => setEstado("activos")}
            >
              Activos
              <span>{cerradoresActivos.length}</span>
            </button>

            <button
              type="button"
              className={`${styles.toggleButton} ${
                estado === "inactivos"
                  ? styles.toggleActive
                  : ""
              }`}
              aria-pressed={estado === "inactivos"}
              onClick={() => setEstado("inactivos")}
            >
              Inactivos
              <span>{cerradoresInactivos.length}</span>
            </button>
          </div>
        </header>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Cerradores {estado}</h2>
            <span>{cerradores.length} registros</span>
          </div>

          <div className={styles.listScroll}>
            {cerradores.length === 0 ? (
              <div className={styles.empty}>
                No existen cerradores {estado}.
              </div>
            ) : (
              <div className={styles.grid}>
                {cerradores.map((cerrador) => (
                  <button
                    key={cerrador.id}
                    type="button"
                    className={styles.card}
                    onClick={() => setSeleccionado(cerrador)}
                  >
                    <div className={styles.avatar}>
                      {cerrador.avatar_url ? (
                        <img
                          src={cerrador.avatar_url}
                          alt={cerrador.nombre}
                          className={styles.avatarImage}
                        />
                      ) : (
                        <Image
                          src={DefaultPerson}
                          alt={cerrador.nombre}
                          fill
                          sizes="72px"
                          className={styles.avatarImage}
                        />
                      )}
                    </div>

                    <div className={styles.info}>
                      <strong className={styles.nombre}>
                        {cerrador.nombre}
                      </strong>

                      <span className={styles.normalizado}>
                        {cerrador.nombre_normalizado || "Sin normalizar"}
                      </span>

                      <span
                        className={
                          cerrador.activo
                            ? styles.estadoActivo
                            : styles.estadoInactivo
                        }
                      >
                        <span className={styles.estadoPunto} />
                        {cerrador.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    <span className={styles.editIcon}>
                      ✎
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {seleccionado && (
        <EditarCerrador
          key={seleccionado.id}
          cerrador={seleccionado}
          onClose={() => setSeleccionado(null)}
          onGuardarDatos={guardarCambios}
          onGuardarAvatar={ guardarAvatar }
          onCambiarEstado={guardarEstado}
        />
      )}
    </>
  );
}