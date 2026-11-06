"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import type { Cerrador } from "@/types/cerrador";

import styles from "./ui.module.css";

interface EditarCerradorProps {
  cerrador: Cerrador;
  onClose: () => void;

  onGuardarDatos: (
    id: number,
    data: {
      nombre: string;
      nombre_normalizado: string;
    },
  ) => Promise<void>;

  onGuardarAvatar: (
    id: number,
    archivo: File,
  ) => Promise<void>;

  onCambiarEstado: (
    id: number,
    activo: boolean,
  ) => Promise<void>;
}

export default function EditarCerrador({
  cerrador,
  onClose,
  onGuardarDatos,
  onGuardarAvatar,
  onCambiarEstado,
}: EditarCerradorProps) {
  const [nombre, setNombre] = useState(cerrador.nombre);

  const [nombreNormalizado, setNombreNormalizado] =
    useState(cerrador.nombre_normalizado ?? "");

  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [guardando, setGuardando] = useState(false);
  const [guardandoAvatar, setGuardandoAvatar] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  const [confirmarEstado, setConfirmarEstado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputFileRef = useRef<HTMLInputElement>(null);

  const ocupado =
    guardando || guardandoAvatar || cambiandoEstado;

  /* ========================================
     PREVISUALIZACIÓN DEL AVATAR
  ======================================== */

  useEffect(() => {
    if (!archivo) {
      setPreview(null);
      return;
    }

    const url = URL.createObjectURL(archivo);

    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  /* ========================================
     GUARDAR NOMBRES
  ======================================== */

  async function guardarDatos() {
    if (!nombre.trim() || !nombreNormalizado.trim()) {
      setError("Ambos nombres son obligatorios");
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      await onGuardarDatos(cerrador.id, {
        nombre: nombre.trim(),
        nombre_normalizado: nombreNormalizado.trim(),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el cerrador",
      );
    } finally {
      setGuardando(false);
    }
  }

  /* ========================================
     GUARDAR AVATAR
  ======================================== */

  async function guardarAvatar() {
    if (!archivo) {
      setError("Debes seleccionar una imagen");
      return;
    }

    setGuardandoAvatar(true);
    setError(null);

    try {
      await onGuardarAvatar(cerrador.id, archivo);
      setArchivo(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el avatar",
      );
    } finally {
      setGuardandoAvatar(false);
    }
  }

  /* ========================================
     CAMBIAR ESTADO
  ======================================== */

  async function cambiarEstado() {
    setCambiandoEstado(true);
    setError(null);

    try {
      await onCambiarEstado(
        cerrador.id,
        !cerrador.activo,
      );

      setConfirmarEstado(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cambiar el estado",
      );
    } finally {
      setCambiandoEstado(false);
    }
  }

  return (
    <div
      className={styles.modalOverlay}
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !ocupado
        ) {
          onClose();
        }
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editar-cerrador-title"
      >
        {/* HEADER */}

        <div className={styles.modalHeader}>
          <div>
            <h2 id="editar-cerrador-title">
              Editar cerrador
            </h2>

            <p>ID: {cerrador.id}</p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            disabled={ocupado}
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* BODY */}

        <div className={styles.modalBody}>
          {/* AVATAR */}

          <div className={styles.avatarEditor}>
            <div className={styles.avatarPreview}>
              {preview || cerrador.avatar_url ? (
                <img
                  src={preview || cerrador.avatar_url!}
                  alt={cerrador.nombre}
                />
              ) : (
                <span>Sin foto</span>
              )}
            </div>

            <input
              ref={inputFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              disabled={ocupado}
              onChange={(event) => {
                const file =
                  event.target.files?.[0] ?? null;

                event.target.value = "";

                if (!file) return;

                const formatos = [
                  "image/jpeg",
                  "image/png",
                  "image/webp",
                ];

                if (!formatos.includes(file.type)) {
                  setError("Formato de imagen no permitido");
                  return;
                }

                if (file.size > 5 * 1024 * 1024) {
                  setError("La imagen no debe superar 5 MB");
                  return;
                }

                setError(null);
                setArchivo(file);
              }}
            />

            <button
              type="button"
              className={styles.secondaryButton}
              disabled={ocupado}
              onClick={() => inputFileRef.current?.click()}
            >
              Seleccionar avatar
            </button>

            {archivo && (
              <button
                type="button"
                className={styles.primaryButton}
                disabled={ocupado}
                onClick={guardarAvatar}
              >
                {guardandoAvatar
                  ? "Subiendo..."
                  : "Guardar avatar"}
              </button>
            )}
          </div>

          {/* DATOS */}

          <div className={styles.formGroup}>
            <label htmlFor="nombre">
              Nombre
            </label>

            <input
              id="nombre"
              type="text"
              value={nombre}
              maxLength={150}
              disabled={ocupado}
              onChange={(event) =>
                setNombre(event.target.value)
              }
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="nombre_normalizado">
              Nombre normalizado
            </label>

            <input
              id="nombre_normalizado"
              type="text"
              value={nombreNormalizado}
              maxLength={150}
              disabled={ocupado}
              onChange={(event) =>
                setNombreNormalizado(event.target.value)
              }
            />
          </div>

          {/* ESTADO */}

          <div className={styles.estadoSection}>
            <div className={styles.estadoInfo}>
              <span className={styles.estadoLabel}>
                Estado del cerrador
              </span>

              <span
                className={
                  cerrador.activo
                    ? styles.estadoActivo
                    : styles.estadoInactivo
                }
              >
                {cerrador.activo
                  ? "Activo"
                  : "Inactivo"}
              </span>
            </div>

            {!confirmarEstado ? (
              <button
                type="button"
                className={
                  cerrador.activo
                    ? styles.desactivarButton
                    : styles.activarButton
                }
                disabled={ocupado}
                onClick={() => setConfirmarEstado(true)}
              >
                {cerrador.activo
                  ? "Desactivar cerrador"
                  : "Activar cerrador"}
              </button>
            ) : (
              <div className={styles.confirmacion}>
                <p>
                  ¿Confirmas que deseas{" "}
                  {cerrador.activo
                    ? "desactivar"
                    : "activar"}{" "}
                  este cerrador?
                </p>

                <div className={styles.confirmacionAcciones}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled={ocupado}
                    onClick={() => setConfirmarEstado(false)}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className={
                      cerrador.activo
                        ? styles.desactivarButton
                        : styles.activarButton
                    }
                    disabled={ocupado}
                    onClick={cambiarEstado}
                  >
                    {cambiandoEstado
                      ? "Procesando..."
                      : "Confirmar"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ERROR */}

          {error && (
            <p className={styles.errorMessage} role="alert">
              {error}
            </p>
          )}
        </div>

        {/* FOOTER */}

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={ocupado}
            onClick={onClose}
          >
            Cancelar
          </button>

          <button
            type="button"
            className={styles.primaryButton}
            disabled={ocupado}
            onClick={guardarDatos}
          >
            {guardando
              ? "Guardando..."
              : "Guardar cambios"}
          </button>
        </div>
      </section>
    </div>
  );
}