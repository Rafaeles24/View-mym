import { getFileName } from "@/libs/getFilename";
import { getMediaType } from "@/libs/getMediaType";
import { MediaType } from "@/types/media";
import styles from "./ui.module.css";
import { formatDate } from "@/libs/formatDate";
import { formatearTiempo } from "@/libs/formatTime";

export function MediaCard({
  item,
  onEdit,
  onDelete,
}: {
  item: MediaType;
  onEdit: (item: MediaType) => void;
  onDelete: (item: MediaType) => void;
}) {
  const type = getMediaType(item.url);
  const fileName = getFileName(item.url);

  const hasSedes = item.sedes.length > 0;

  return (
    <article className={styles.card}>
      <div className={styles.preview}>
        {type === "video" && (
          <>
            <video
              src={item.url}
              className={styles.media}
              preload="metadata"
              muted
            />

            <button
              type="button"
              className={styles.playButton}
              aria-label={`Reproducir ${fileName}`}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M8 5v14l11-7Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </>
        )}

        {type === "image" && (
          <img
            src={item.url}
            alt={fileName}
            className={styles.media}
          />
        )}

        {type === "unknown" && (
          <div className={styles.unknownPreview}>
            Archivo
          </div>
        )}

        <span className={styles.typeIndicator}>
          {type === "video" ? (
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M8 5v14l11-7Z"
                fill="currentColor"
              />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <rect
                x="3"
                y="4"
                width="18"
                height="16"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />

              <circle
                cx="8"
                cy="9"
                r="1.5"
                fill="currentColor"
              />

              <path
                d="m5 17 4-4 3 3 2-2 5 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          )}
        </span>

        {type === "video" && (
          <span className={styles.duration}>
            {formatearTiempo(item.duration)}
          </span>
        )}
      </div>

      <div className={styles.cardBody}>
        <h3 className={styles.fileName}>
          {fileName}
        </h3>

        <div className={styles.sedes}>
          {hasSedes ? (
            item.sedes.map((sede) => (
              <span
                key={sede.id}
                className={styles.sedeBadge}
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M5 21V5l7-3v19m7 0V8l-7-3M3 21h18M8 8h1m-1 4h1m-1 4h1m6-5h1m-1 4h1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>

                {sede.nombre}
              </span>
            ))
          ) : (
            <span className={styles.noSedeBadge}>
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M5 21V5l7-3v19m7 0V8l-7-3M3 21h18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>

              Sin sedes
            </span>
          )}
        </div>

        <div className={styles.meta}>
          {hasSedes ? (
            <>
              <span>
                Prioridad: {item.sedes[0].prioridad}
              </span>

              <span className={styles.dot} />

              <span>
                {formatDate(item.createdat)}
              </span>
            </>
          ) : (
            <>
              <span>{formatearTiempo(item.duration)}</span>

              <span className={styles.dot} />

              <span>
                {formatDate(item.createdat)}
              </span>
            </>
          )}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryAction}
            onClick={() => onEdit(item)}
          >
            {hasSedes ? (
              <>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="m4 20 4.5-1L19 8.5a2.12 2.12 0 0 0-3-3L5.5 16Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <path
                    d="m14.5 7 3 3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                </svg>

                Editar
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="m10 13 4-4m-7.5 8.5-1 1a3.54 3.54 0 0 1-5-5l4-4a3.54 3.54 0 0 1 5 0M17.5 6.5l1-1a3.54 3.54 0 0 1 5 5l-4 4a3.54 3.54 0 0 1-5 0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>

                Asignar
              </>
            )}
          </button>

          <button
            type="button"
            className={styles.deleteButton}
            onClick={() => onDelete(item)}
            aria-label={`Eliminar ${fileName}`}
            title="Eliminar contenido"
          >
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
                strokeLinecap="round"
              />

              <path
                d="M7 7l1 13h8l1-13"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />

              <path
                d="M10 11v5M14 11v5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}