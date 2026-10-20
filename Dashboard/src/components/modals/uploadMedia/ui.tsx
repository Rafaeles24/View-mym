"use client";

import {
  ChangeEvent,
  DragEvent,
  useRef,
  useState,
} from "react";

import styles from "./ui.module.css";
import { useRouter } from "next/navigation";
import { createMedia } from "@/services/media/createMedia";
import { UploadStatus } from "@/types/uploadStatus";

interface UploadMediaModalProps {
  open: boolean;
  onClose: () => void;
}

export default function UploadMediaModal({
  open,
  onClose,
}: UploadMediaModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  const [ uploading, setUploading ] = useState(false);
  const [ status, setStatus ] = useState<UploadStatus>({
    type: 'idle',
    message: "",
  });

  if (!open) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      1024 /
      1024
    ).toFixed(1)} MB`;
  };

  const getExtension = (file: File) => {
    return (
      file.name
        .split(".")
        .pop()
        ?.toUpperCase() ?? "FILE"
    );
  };

  const addFiles = (
    newFiles: File[],
  ) => {
    setFiles((currentFiles) => {
      const result = [...currentFiles];

      newFiles.forEach((file) => {
        const exists = result.some(
          (current) =>
            current.name === file.name &&
            current.size === file.size,
        );

        if (!exists) {
          result.push(file);
        }
      });

      return result;
    });
  };

  const handleFileInput = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    if (!event.target.files) return;

    addFiles(
      Array.from(event.target.files),
    );

    event.target.value = "";
  };

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();

    const droppedFiles = Array.from(
      event.dataTransfer.files,
    );

    addFiles(droppedFiles);
  };

  const removeFile = (
    index: number,
  ) => {
    setFiles((currentFiles) =>
      currentFiles.filter(
        (_, currentIndex) =>
          currentIndex !== index,
      ),
    );
  };

  const clearFiles = () => {
    setFiles([]);
  };

  const handleClose = () => {

    if (uploading) {
      return
    };
    
    setFiles([]);

    setStatus({
      type: "idle",
      message: "",
    });

    onClose();
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setStatus({
      type: 'uploading',
      message: `Subiendo ${files.length} ${files.length === 1 ? "archivo" : "archivos"}...`,
    });

    try {
      await createMedia(files);

      setStatus({
        type: "success",
        message: `${files.length === 1 ? "Archivo subido" : "Archivos subidos"} correctamente`,
      })

      setFiles([]);

      router.refresh();

      window.setTimeout(() => {
        setStatus({
          type: 'idle',
          message: "",
        })
      })

      onClose();
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : "Ocurrio un error al subir los archivos."
      })
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={handleClose}
    >
      <section
        className={styles.modal}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <header
          className={styles.header}
        >
          <div>
            <h2
              className={
                styles.title
              }
            >
              Subir contenido
            </h2>

            <p
              className={
                styles.subtitle
              }
            >
              Agrega imágenes o videos
              para mostrarlos en el
              visor.
            </p>
          </div>

          <button
            type="button"
            className={
              styles.closeButton
            }
            onClick={handleClose}
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </header>

        <div
          className={styles.body}
        >
          <div
            className={
              styles.dropzone
            }
            onDragOver={(event) =>
              event.preventDefault()
            }
            onDrop={handleDrop}
            onClick={() =>
              inputRef.current?.click()
            }
          >
            <div
              className={
                styles.uploadIcon
              }
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M12 16V4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />

                <path
                  d="m7 9 5-5 5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M5 20h14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <h3>
              Arrastra tus archivos aquí
            </h3>

            <p>
              o haz clic para seleccionar
              archivos
            </p>

            <span>
              JPG, PNG, WEBP, MP4 · Máx.
              100 MB por archivo
            </span>

            <input
              ref={inputRef}
              type="file"
              multiple
              hidden
              accept="
                image/jpeg,
                image/png,
                image/webp,
                video/mp4
              "
              onChange={
                handleFileInput
              }
            />
          </div>

          {files.length > 0 && (
            <div
              className={
                styles.selectedSection
              }
            >
              <div
                className={
                  styles.selectedHeader
                }
              >
                <h3>
                  Archivos seleccionados (
                  {files.length})
                </h3>

                <button
                  type="button"
                  className={
                    styles.clearButton
                  }
                  onClick={clearFiles}
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 7h16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />

                    <path
                      d="M9 7V4h6v3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />

                    <path
                      d="M7 7l1 13h8l1-13"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                  </svg>

                  Limpiar todo
                </button>
              </div>

              <div
                className={
                  styles.filesList
                }
              >
                {files.map(
                  (file, index) => (
                    <FileItem
                      key={`${file.name}-${file.size}-${index}`}
                      file={file}
                      extension={getExtension(
                        file,
                      )}
                      size={formatFileSize(
                        file.size,
                      )}
                      onRemove={() =>
                        removeFile(
                          index,
                        )
                      }
                    />
                  ),
                )}
              </div>
            </div>
          )}
        </div>

        { status.type !== "idle" &&  (
          <div
            className={`${styles.uploadStatus} ${styles[status.type]}`}
            role={status.type === "error" ? "alert" : "status"}
            aria-live="polite"
          >
            {status.type === "uploading" && (
              <span
                className={styles.spinner}
                aria-hidden="true"
              />
            )}

            {status.type === 'success' && (
              <span aria-hidden="true">✓</span>
            )} 

            {status.type === 'error' && (
              <span aria-hidden="true">!</span>
            )}

            <span>{status.message}</span>
          </div>
        )}

        <footer
          className={styles.footer}
        >
          <button
            type="button"
            className={
              styles.cancelButton
            }
            onClick={handleClose}
            disabled={uploading}
          >
            Cancelar
          </button>

          <button
            type="button"
            className={
              styles.submitButton
            }
            disabled={
              files.length === 0 || uploading
            }
            onClick={handleSubmit}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M12 16V4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />

              <path
                d="m7 9 5-5 5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path
                d="M5 20h14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>

            Subir{" "}
            {files.length > 0
              ? `${files.length} ${
                  files.length === 1
                    ? "archivo"
                    : "archivos"
                }`
              : ""}
          </button>
        </footer>
      </section>
    </div>
  );
}

function FileItem({
  file,
  extension,
  size,
  onRemove,
}: {
  file: File;
  extension: string;
  size: string;
  onRemove: () => void;
}) {
  const [preview, setPreview] =
    useState<string | null>(() => {
      if (
        file.type.startsWith(
          "image/",
        ) ||
        file.type.startsWith(
          "video/",
        )
      ) {
        return URL.createObjectURL(
          file,
        );
      }

      return null;
    });

  return (
    <div
      className={styles.fileItem}
    >
      <div
        className={
          styles.filePreview
        }
      >
        {file.type.startsWith(
          "image/",
        ) &&
        preview ? (
          <img
            src={preview}
            alt={file.name}
          />
        ) : file.type.startsWith(
            "video/",
          ) &&
          preview ? (
          <div
            className={
              styles.videoPreview
            }
          >
            <video
              src={preview}
              muted
              preload="metadata"
            />

            <span
              className={
                styles.videoPlay
              }
            >
              ▶
            </span>
          </div>
        ) : (
          <span>{extension}</span>
        )}
      </div>

      <div
        className={
          styles.fileInformation
        }
      >
        <strong
          title={file.name}
        >
          {file.name}
        </strong>

        <span>
          {extension} · {size}
        </span>
      </div>

      <div
        className={
          styles.fileStatus
        }
      >
        <span
          className={
            styles.statusIcon
          }
        >
          ✓
        </span>

        <span>
          Listo para subir
        </span>
      </div>

      <button
        type="button"
        className={
          styles.removeButton
        }
        onClick={onRemove}
        aria-label={`Eliminar ${file.name}`}
      >
        ×
      </button>
    </div>
  );
}