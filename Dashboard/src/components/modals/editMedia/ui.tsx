"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./ui.module.css";
import { MediaType, SedesMedia } from "@/types/media";
import { getFileName } from "@/libs/getFilename";
import { getMediaType } from "@/libs/getMediaType";
import { formatDate } from "@/libs/formatDate";
import { SedeConfig } from "@/types/sede";
import { useRouter } from "next/navigation";
import { assignMediaToSedes } from "@/services/media/assignMediaToSedes";
import { toDateTimeLocal } from "@/libs/toDateTimeLocal";

export default function EditMediaModal({
  open,
  media,
  sedesData,
  onClose,
}: {
  open: boolean;
  media: MediaType | null;
  sedesData: SedesMedia[];
  onClose: () => void;
}) {
  const [searchSede, setSearchSede] = useState("");

  const [selectedSedes, setSelectedSedes] = useState<number[]>([]);

  const [configs, setConfigs] = useState<SedeConfig[]>([]);

  const [ durationMinutes, setDurationMinutes ] = useState<number>(1);
  
  const [ saving, setSaving ] = useState(false);

  const [ error, setError ] = useState<string | null>(null);
  
  const router = useRouter();

  useEffect(() => {
    if (!media || !open) return;

    const selected = sedesData
      .filter((sede) =>
        media.sedes.some(
          (assigned) =>
            assigned.id === sede.id,
        ),
      )
      .map((sede) => sede.id);

    const initialConfigs: SedeConfig[] =
      sedesData
        .filter((sede) =>
          media.sedes.some(
            (assigned) =>
              assigned.id === sede.id,
          ),
        )
        .map((sede) => {
          const assigned =
            media.sedes.find(
              (item) =>
                item.id === sede.id,
            );

          return {
            sedeId: sede.id,

            prioridad:
              assigned?.prioridad ?? 0,

            started_at: toDateTimeLocal(assigned?.started_at),

            ended_at: toDateTimeLocal(assigned?.ended_at),
          };
        });

    setSelectedSedes(selected);

    setConfigs(initialConfigs);

    /*
     * Ajusta esto dependiendo del tipo
     * real de media.duration.
     */
    setDurationMinutes(
      typeof media.duration === "number"
        ? media.duration / 60000
        : 60,
    );

    setSearchSede("");
    setError(null);
  }, [media, sedesData, open]);

  const filteredSedes = useMemo(() => {
    return sedesData.filter((sede) => 
      sede.nombre.toLowerCase().includes(searchSede.toLowerCase()),
    )
  }, [sedesData, searchSede])

  if (!open || !media) return null;

  const fileName = getFileName(media.url);
  const mediaType = getMediaType(media.url);

  const isSelected = (sedeId: number) =>
    selectedSedes.includes(sedeId);

  const toggleSede = (sede: SedesMedia) => {
    const alreadySelected = isSelected(sede.id);

    if (alreadySelected) {
      setSelectedSedes((current) =>
        current.filter((id) => id !== sede.id),
      );

      setConfigs((current) =>
        current.filter((config) => config.sedeId !== sede.id),
      );

      return;
    }

    setSelectedSedes((current) => [
      ...current,
      sede.id,
    ]);

    setConfigs((current) => [
      ...current,
      {
        sedeId: sede.id,
        prioridad: 0,
        started_at: "",
        ended_at: "",
        duration: media.duration ?? "10 segundos",
      },
    ]);
  };

  const updateConfig = (
    sedeId: number,
    field: keyof Omit<SedeConfig, "sedeId">,
    value: string | number,
  ) => {
    setConfigs((current) =>
      current.map((config) =>
        config.sedeId === sedeId
          ? {
              ...config,
              [field]: value,
            }
          : config,
      ),
    );
  };

  const handleSave = async () => {
    if (!media || saving) return;

    try {
      setSaving(true);
      setError(null);

      const payload = {
        mediaId: media.id,
        duration: durationMinutes * 60 * 1000,
        sedes: configs.map((config) => ({
          sedeId: config.sedeId,
          prioridad: config.prioridad,
          ...(config.started_at && {
            started_at: new Date( config.started_at ).toISOString()
          }),
          ...(config.ended_at && {
            ended_at: new Date( config.ended_at ).toISOString()
          })
        }))
      };

      await assignMediaToSedes(payload);

      router.refresh();
      onClose();
    } catch (error) {
      setError( error instanceof Error ? error.message : `No se pudo guardar la configuracion` )
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      onMouseDown={onClose}
    >
      <section
        className={styles.modal}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>
              Editar contenido
            </h2>

            <p className={styles.subtitle}>
              Configura en qué sedes se mostrará este contenido
              y sus opciones de reproducción.
            </p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </header>

        <div className={styles.body}>
          <aside className={styles.mediaColumn}>
            <h3 className={styles.sectionTitle}>
              Archivo
            </h3>

            <div className={styles.preview}>
              {mediaType === "image" && (
                <img
                  src={media.url}
                  alt={fileName}
                />
              )}

              {mediaType === "video" && (
                <video
                  src={media.url}
                  muted
                  controls
                />
              )}

              {mediaType === "unknown" && (
                <div className={styles.unknown}>
                  Archivo
                </div>
              )}
            </div>

            <div className={styles.fileSummary}>
              <div className={styles.fileIcon}>
                {mediaType === "video" ? "▶" : "▧"}
              </div>

              <div>
                <strong>{fileName}</strong>

                <span>
                  {mediaType === "video"
                    ? "Video"
                    : mediaType === "image"
                      ? "Imagen"
                      : "Archivo"}
                </span>
              </div>
            </div>

            <h3 className={styles.sectionTitle}>
              Información general
            </h3>

            <div className={styles.infoBox}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>
                  Fecha de subida
                </span>

                <strong>
                  {formatDate(media.createdat)}
                </strong>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>
                  Duración
                </span>

                <div
                  className={
                    styles.configField
                  }
                >
                  <div className={styles.durationInputWrapper}>
                    <input 
                      type="number"
                      min={1}
                      step={1}
                      value={durationMinutes}
                      onChange={(event) => 
                        setDurationMinutes(Number(event.target.value))
                      }
                    />
                    <span>min</span>
                  </div>
                </div>
              </div>

              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>
                  Tipo
                </span>

                <strong>
                  {mediaType === "video"
                    ? "Video"
                    : mediaType === "image"
                      ? "Imagen"
                      : "Archivo"}
                </strong>
              </div>
            </div>
          </aside>

          <div className={styles.configColumn}>
            <div className={styles.configHeader}>
              <h3 className={styles.sectionTitle}>
                Sedes y configuración
              </h3>

              <p>
                Selecciona las sedes donde se mostrará este
                contenido y configura sus opciones.
              </p>
            </div>

            <div className={styles.configLayout}>
              <div className={styles.sedesPanel}>
                <div className={styles.searchWrapper}>
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="m21 21-4.35-4.35m2.35-5.65A8 8 0 1 1 3 11a8 8 0 0 1 16 0Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>

                  <input
                    type="text"
                    placeholder="Buscar sedes..."
                    value={searchSede}
                    onChange={(event) =>
                      setSearchSede(event.target.value)
                    }
                  />
                </div>

                <div className={styles.sedesList}>
                  {filteredSedes.map((sede) => {
                    const selected = isSelected(sede.id);

                    return (
                      <label
                        key={sede.id}
                        className={`${styles.sedeOption} ${
                          selected ? styles.selected : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSede(sede)}
                        />

                        <span className={styles.customCheck}>
                          {selected ? "✓" : ""}
                        </span>

                        <span>
                          {sede.nombre}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className={styles.selectedCount}>
                  {selectedSedes.length}{" "}
                  {selectedSedes.length === 1
                    ? "sede seleccionada"
                    : "sedes seleccionadas"}
                </div>
              </div>

              <div className={styles.settingsPanel}>
                <div className={styles.settingsHeader}>
                  Configuración por sede
                </div>

                {selectedSedes.length === 0 ? (
                  <div className={styles.noSelection}>
                    Selecciona una sede para configurar sus
                    opciones.
                  </div>
                ) : (
                  <div className={styles.settingsList}>
                    {selectedSedes.map((sedeId) => {
                      const sede = sedesData.find(
                        (item) => item.id === sedeId,
                      );

                      const config = configs.find(
                        (item) => item.sedeId === sedeId,
                      );

                      if (!sede || !config) return null;

                      return (
                        <div
                          key={sedeId}
                          className={styles.sedeConfigCard}
                        >
                          <div
                            className={
                              styles.sedeConfigTitle
                            }
                          >
                            <span className={styles.buildingIcon}>
                              ▦
                            </span>

                            <strong>
                              {sede.nombre}
                            </strong>
                          </div>

                          <div
                            className={
                              styles.configField
                            }
                          >
                            <label>
                              Prioridad
                            </label>

                            <input
                              type="number"
                              min={0}
                              value={config.prioridad}
                              onChange={(event) =>
                                updateConfig(
                                  sedeId,
                                  "prioridad",
                                  Number(
                                    event.target.value,
                                  ),
                                )
                              }
                            />
                          </div>

                          <div
                            className={
                              styles.configField
                            }
                          >
                            <label>
                              Mostrar desde
                            </label>

                            <input
                              type="datetime-local"
                              value={config.started_at}
                              onChange={(event) =>
                                updateConfig(
                                  sedeId,
                                  "started_at",
                                  event.target.value,
                                )
                              }
                            />
                          </div>

                          <div
                            className={
                              styles.configField
                            }
                          >
                            <label>
                              Mostrar hasta
                            </label>

                            <input
                              type="datetime-local"
                              value={config.ended_at}
                              onChange={(event) =>
                                updateConfig(
                                  sedeId,
                                  "ended_at",
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
          >
            Cancelar
          </button>

          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSave}
            disabled={saving}
          >
            { saving ? "Guardando..." : "Guardar" }
          </button>
        </footer>
      </section>
    </div>
  );
}