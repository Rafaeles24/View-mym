"use client";

import { MediaType } from "@/types/media";
import { getFileName } from "@/libs/getFilename";
import styles from "./ui.module.css";

export default function DeleteMediaModal({
  media,
  open,
  deleting = false,
  onClose,
  onConfirm,
}: {
  media: MediaType | null;
  open: boolean;
  deleting?: boolean;
  onClose: () => void;
  onConfirm: (media: MediaType) => void;
}) {
  if (!open || !media) {
    return null;
  }

  const fileName = getFileName(media.url);

  return (
    <div
      className={styles.overlay}
      onMouseDown={
        deleting
          ? undefined
          : onClose
      }
    >
      <section
        className={styles.modal}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className={styles.icon}>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M4 7h16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />

            <path
              d="M9 7V4h6v3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            />

            <path
              d="M7 7l1 13h8l1-13"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            />
          </svg>
        </div>

        <h2>
          Eliminar contenido
        </h2>

        <p>
          ¿Estás seguro de que deseas eliminar
          este contenido?
        </p>

        <div className={styles.mediaInfo}>
          <strong>
            {fileName}
          </strong>

          <span>
            {media.sedes.length > 0
              ? `Asignado a ${media.sedes.length} ${
                  media.sedes.length === 1
                    ? "sede"
                    : "sedes"
                }`
              : "Sin sedes asignadas"}
          </span>
        </div>

        <p className={styles.warning}>
          Esta acción eliminará el contenido y sus
          asignaciones. No se puede deshacer.
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={deleting}
          >
            Cancelar
          </button>

          <button
            type="button"
            className={styles.deleteButton}
            onClick={() =>
              onConfirm(media)
            }
            disabled={deleting}
          >
            {deleting
              ? "Eliminando..."
              : "Eliminar"}
          </button>
        </div>
      </section>
    </div>
  );
}