"use client";

import {
  useState,
} from "react";
import type { FormEvent } from "react";

import styles from "../cerradores/ui.module.css";

type Props = {
  onClose: () => void;
  onCrear: (nombre: string) => Promise<void>;
};

export default function CrearCerrador({
  onClose,
  onCrear,
}: Props) {
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nombreLimpio = nombre
      .trim()
      .replace(/\s+/g, " ");

    if (!nombreLimpio) {
      setError("El nombre del cerrador es obligatorio");
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      await onCrear(nombreLimpio);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear el cerrador",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div
      className={styles.modalOverlay}
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !guardando
        ) {
          onClose();
        }
      }}
    >
      <form
        className={styles.modal}
        onSubmit={guardar}
        role="dialog"
        aria-modal="true"
        aria-labelledby="crear-cerrador-title"
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 id="crear-cerrador-title">
              Nuevo cerrador
            </h2>
            <p>Registra un cerrador en el directorio.</p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            disabled={guardando}
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label htmlFor="nuevo-cerrador-nombre">
              Nombre del cerrador
            </label>
            <input
              id="nuevo-cerrador-nombre"
              type="text"
              value={nombre}
              minLength={1}
              maxLength={150}
              autoComplete="off"
              autoFocus
              disabled={guardando}
              placeholder="Ej. Andrea Ramírez"
              onChange={(event) => setNombre(event.target.value)}
            />
          </div>

          {error && (
            <p className={styles.errorMessage} role="alert">
              {error}
            </p>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={guardando}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={guardando || !nombre.trim()}
          >
            {guardando ? "Creando..." : "Crear cerrador"}
          </button>
        </div>
      </form>
    </div>
  );
}
