"use client";

import MediaCard from "@/components/cards/media/ui";
import { CampaniaMedia, MediaType, PaginationMedia } from "@/types/cardMedia";
import styles from "./ui.module.css";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Select from "@/components/select/ui";
import Input from "@/components/input/ui";
import AddIcon from "@/icons/add";
import StartIcon from "@/icons/star";
import Modal from "@/forms/ui";
import Button from "@/components/button/ui";
import CardFile from "@/components/cards/file/ui";
import ImportIcon from "@/icons/import";
import DeleteIcon from "@/icons/delete";
import { CampaignOptions } from "@/types/campaign";

export default function MediaUI({ contentData } : { contentData: PaginationMedia }) {
  const [ data, setData ] = useState(contentData.data || []);

  const [ campaignsOptions, setCampaignsOptions ] = useState<CampaignOptions[]>([]);

  const [ pagination, setPagination ] = useState({
    page: contentData.page,
    limit: contentData.limit,
    total: contentData.total,
    totalPages: contentData.totalPages
  })

  const [ tipo, setTipo ] = useState("");
  const [ campania, setCampania ] = useState("");
  const [ startedAt, setStartedAt ] = useState("");
  const [ endedAt, setEndedAt ] = useState("");

  //MODALES
  const [ addModal, setAddModal ] = useState(false);
  const [ vinculoModal, setVinculoModal ] = useState(false);
  const [ confirmDeleteVinculoModal, setConfirmDeleteVinculoModal ] = useState(false);
  const [ confirmDeleteMediaModal, setConfirmDeleteMediaModal ] = useState(false);

  //MODAL AGREGAR FLYER
  
  const [ files, setFiles ] = useState<{ id: string; file: File; preview: string }[]>([]);
  const [ filesSelected, setFilesSelected ] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const [ uploading, setUploading ] = useState(false);
  const [ uploadingMessage, setUploadingMessage ] = useState("");

  //GESTION DE MEDIA CARDS
  const [ selectedMediaIds, setSelectedMediaIds ] = useState<number[]>([]);
  const [ selectCampaignId, setSelectCampaignId ] = useState<string>("");


  //OBTENER CAMPANIAS
  useEffect(() => {
    const getCampaigns = async () => {
      try {
        const res = await fetch("/api/campanias");

        if (!res.ok) {
          throw new Error("Error al obtener campanias");
        }

        const data: CampaignOptions[] = await res.json();

        setCampaignsOptions(data || []);
      } catch (error) {
        console.error(error);
      }
    };

    getCampaigns();

  }, []);

  const handleSelected = (id: number) => {
    setSelectedMediaIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(mediaId => mediaId !== id);
      }

      return [...prev, id];
    })
  }

  const handleFiles = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selected = Array.from(e.target.files);
    const mapped = selected.map((file, index) => ({
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
    }))

    setFiles(prev => [...prev, ...mapped]);
  }

  useEffect(() => {
    return () => {
      files.forEach(f => URL.revokeObjectURL(f.preview));
    };
  }, [files]);

  const selectAll = () => {
    setFilesSelected(files.map(f => f.id));
  }

  //SELECCION DE CARDS
  const toggleSelect = (id: string) => {
    setFilesSelected(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }
  const removeSelect = () => {
    setFiles(prev => 
      prev.filter(f => !filesSelected.includes(f.id))
    );

    setFilesSelected([]);
  }

  const campaignsVinculadas = useMemo(() => {
    const map = new Map<number, CampaniaMedia>();
    
    data
      .filter(media => selectedMediaIds.includes(media.id))
      .forEach(media => {
        media.campanias.forEach(campania => {
          map.set(campania.id, campania)
        })
      });
    
    return Array.from(map.values())
  }, [data, selectedMediaIds]); 

  //MODAL AGREGAR VINCULO
  const handleVincular = async () => {
    try {
      if (!selectCampaignId) {
        alert("No hay una campana seleccionada.");
        return;
      }

      const payload = {
        campaignId: selectCampaignId,
        asignaciones: selectedMediaIds.map(id => ({
          id: Number(id)
        }))
      }

      const res = await fetch("/api/campanias", {
        method: "POST",
        headers: {
          "Content-Type" : "application/json"
        },
        body: JSON.stringify(payload)
      })

      const result = await res.json();

      if (!res.ok) {
          throw new Error(
            typeof result.message === "string"
              ? result.message
              : JSON.stringify(result.message)
          );
      }

      setSelectedMediaIds([]);
      setSelectCampaignId("");
      handleReload();
    } catch (error) {
      console.error(`Error al vincular ${error}`);
    }
  }

  const handleDesvincular = async () => {
    try {
      if (!selectCampaignId) {
        alert("Selecciona una campania");
        return;
      }

      const res = await fetch("/api/campanias/vinculo/quitar", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          campaignId: String(selectCampaignId),
          asignaciones: selectedMediaIds.map(id => ({
            id: Number(id)
          }))
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Error al desvincular");
      }

      setSelectedMediaIds([]);
      setSelectCampaignId("");
      handleReload();
    } catch (error) {
      console.error(`Error al desvincular ${error}`);
    }
  }

  //MODAL DE AGREGAR
  const handleUpload = async () => {
    if (files.length === 0) return;

    const formData = new FormData();

    files.forEach(item => {
      formData.append("files", item.file);
    });

    try {
      setUploading(true);
      setUploadingMessage("Subiendo y procesando archivos...");
      const res = await fetch("/api/media", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error( typeof data.message === "string" ? data.message : "Error al subir los archivos");
      }

      setUploadingMessage("Archivos subidos correctamente, recargando...");

      setFiles([]);
      setFilesSelected([]);
      setAddModal(false);

      await handleReload();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Error al subir los archivos");
    } finally {
      setUploading(false);
      setUploadingMessage("");
    }
  }

  //MODAL ELIMINAR MEDIA
  const handleDeleteMedia = async () => {
    try {
      const res = await fetch("/api/media", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
          selectedMediaIds.map(id => ({ id }))
        )
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(`Error al eliminar media: ${data.message}`);
      }

      setSelectedMediaIds([]);
      handleReload();
    } catch (error) {
      console.error(error);
    }
  }

  //RELOAD
  const handleReload = async () => {
    try {
      setTipo("");
      setCampania("")
      setStartedAt("")
      setEndedAt("")

      const res = await fetch("/api/media");

      if (!res.ok) throw new Error("Error al recargar");

      const data = await res.json();

      setData(data.data || []);
    } catch (error) {   
      console.error(error);
    }
  }

  const handleFiltro = async ({
    currentPage = 1
  } : {
    currentPage?: number;
  } = {}) => {
    try {
      const params = new URLSearchParams();

      params.append("page", String(currentPage));
      params.append("limit", "50");

      if (tipo) params.append("mimetype", tipo);
      if (campania) params.append("campaignId", campania);
      if (startedAt) params.append("startDate", startedAt);
      if (endedAt) params.append("endDate", endedAt);

      const res = await fetch(`/api/media?${params.toString()}`, {
        method: "GET"
      });

      if (!res.ok) {
        throw new Error("Error al aplicar filtro");
      }

      const data: PaginationMedia = await res.json();

      setData(data.data || []);
      setPagination({
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: data.totalPages
      })

    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    handleFiltro();
  }, [tipo, campania, startedAt, endedAt])

  return (
    <div className={styles.media}>
      <h1>Media</h1>
      <div className={styles.content}>
        <div className={styles.header}>
          <Button
            variant="primary"
            type="button"
            onClick={() => setAddModal(true)}
            disabled={uploading ? true : false}
          >
            <AddIcon/>
            <span>Agregar</span>            
          </Button>

          { addModal && 
            <Modal>
              <h2>Agregar Flyers</h2>

              {files.length > 0 &&
                <div className={styles.fileActions}>
                  <Button
                    variant="cancel"
                    type="button"
                    onClick={() => selectAll()}
                  >
                    Seleccionar todo
                  </Button>

                  { filesSelected &&
                    <Button
                      variant="danger"
                      type="button"
                      onClick={() => removeSelect()}
                      disabled={uploading ? true : false}
                    >
                      <DeleteIcon/>
                    </Button>
                  }
                </div>
              }

              <div className={styles.uploadContent} onClick={() => inputRef.current?.click()}>
                {files.length === 0 ? (
                  <div className={styles.uploadEmpty}>
                    <ImportIcon/>

                    <small>Haz click en el área para agregar imágenes o videos.</small>

                    <input 
                      ref={inputRef}
                      type="file"
                      multiple
                      hidden
                      accept="image/*,video/*"
                      onChange={handleFiles}
                    />
                  </div>
                ) : (
                  <div className={styles.uploadList}>
                    {files.map(item => (
                      <CardFile 
                        key={item.id} 
                        data={item}
                        selected={filesSelected.includes(item.id)}
                        onSelect={() => toggleSelect(item.id)} 
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.actions}>
                <Button
                  variant="cancel"
                  type="button"
                  onClick={() => {
                    setFiles([]);
                    setAddModal(false);
                  }}
                  disabled={uploading ? true : false}
                >
                  Cancelar
                </Button>

                { files.length > 0 &&
                  <Button
                    variant="success"
                    type="button"
                    onClick={handleUpload}
                    disabled={uploading ? true : false}
                  >
                    {uploading ? uploadingMessage || "Subiendo..." : "Subir"}
                  </Button>
                }

                { uploading &&
                    <div className={styles.uploadingBox}>
                      <div className={styles.spinner}></div>
                      <p>{uploadingMessage}</p>
                      <small>Esto puede tardar si son muchos archivos.</small>
                    </div>
                }
              </div>
            </Modal>
          }

          <Button
            variant="cancel"
            type="button"
            onClick={() => setVinculoModal(true)}
            disabled={selectedMediaIds.length == 0 ? true : false}
          >
            <StartIcon/>
            <span>Agregar vínculos</span>
          </Button>

          {vinculoModal &&
            <Modal>
              <h2>Gestionar vinculos</h2>
              <p>{selectedMediaIds.length} medias seleccionadas</p>

              <div
                className={styles.campaignsVinculo}
              >
                <Select
                  label="Vincular a"
                  options={campaignsOptions.map(campaign => ({
                    label: String(campaign.nombre),
                    value: String(campaign.id)
                  }))}
                  value={selectCampaignId}
                  onChange={(value) => setSelectCampaignId(value)}
                />
              </div>
              <div className={styles.actions}>
                <Button
                  variant="cancel"
                  type="button"
                  onClick={() => {
                    setFiles([]);
                    setVinculoModal(false);
                  }}
                >
                  Cancelar
                </Button>

                <Button
                  variant="success"
                  type="button"
                  onClick={() => {
                    handleVincular();
                    setVinculoModal(false);
                  }}
                >
                  Publicar
                </Button>
              </div>
            </Modal>
          }

          <Button
            variant="danger"
            type="button"
            onClick={() => { setConfirmDeleteVinculoModal(true) }}
            disabled={selectedMediaIds.length == 0 ? true : false}
          >
            <DeleteIcon/>
            <span>Quitar vínculos</span>
          </Button>

          { confirmDeleteVinculoModal &&
            <Modal>
              <h2>Quitar vinculos</h2>
              <Select
                label="Selecciona"
                options={campaignsVinculadas.map(campania => ({
                  label: campania.nombre,
                  value: String(campania.id)
                }))}
                value={selectCampaignId}
                onChange={setSelectCampaignId}
              />

              <div className={styles.actions}>
                <Button
                  variant="cancel"
                  type="button"
                  onClick={() => {
                    setConfirmDeleteVinculoModal(false);
                  }}
                >
                  Cancelar
                </Button>

                <Button
                  variant="danger"
                  type="button"
                  onClick={() => {
                    handleDesvincular();
                    setConfirmDeleteVinculoModal(false);
                  }}
                >
                  Eliminar
                </Button>
                
              </div>
            </Modal>
          }

          <Button
            variant="danger"
            type="button"
            onClick={() => { setConfirmDeleteMediaModal(true) }}
            disabled={selectedMediaIds.length == 0 ? true : false}
          >
            <DeleteIcon/>
            <span>Eliminar Medias</span>
          </Button>

          {confirmDeleteMediaModal &&
            <Modal>
              <p>Se eliminara {selectedMediaIds.length} media(s)</p>

              <div className={styles.actions}>
                <Button
                  variant="cancel"
                  type="button"
                  onClick={() => {
                    setConfirmDeleteMediaModal(false);
                  }}
                >
                  Cancelar
                </Button>

                <Button
                  variant="danger"
                  type="button"
                  onClick={() => {
                    handleDeleteMedia();
                    setConfirmDeleteMediaModal(false);
                  }}
                >
                  Eliminar
                </Button>
                
              </div>
            </Modal>
          }

          <div className={styles.filtro}>
            <Select
              label="Tipo"
              options={[
                { label: "Imagen", value: "image" },
                { label: "Video", value: "video" }
              ]}
              value={tipo}
              onChange={setTipo}
            />

            <Select
              label="Campaña"
              options={campaignsOptions.map(campaign => ({
                label: String(campaign.nombre),
                value: String(campaign.id)
              }))}
              value={campania}
              onChange={setCampania}
            />

            <Input
              type="date"
              label="Desde"
              value={startedAt}
              onChange={setStartedAt}
              placeholder="--/--/--"
            />

            <Input
              type="date"
              label="Hasta"
              value={endedAt}
              onChange={setEndedAt}
              placeholder="--/--/--"
            />
          </div>

          <div className={styles.pagination}>
            <div className={styles.paginationButtons}>
              <Button
                variant="cancel"
                type="button"
                onClick={() => handleFiltro({ currentPage: pagination.page - 1 })}
                disabled={pagination.page <= 1}
              >
                Anterior
              </Button>
              <Button
                variant="cancel"
                type="button"
                onClick={() => handleFiltro({ currentPage: pagination.page + 1 })}
                disabled={pagination.page >= pagination.totalPages}
              >
                Siguiente
              </Button>
            </div>
            
            <small>Mostrando {data.length} de {pagination.limit} resultados</small>
            <small>Página {pagination.page} de {pagination.totalPages}</small>
          </div>
        </div>
        <div className={styles.flyerContent}>
          {data.length > 0 ? (
            data.map(flyer => (
              <MediaCard 
                key={flyer.id} 
                data={flyer}
                selected={selectedMediaIds.includes(flyer.id)}
                onSelect={handleSelected} 
              />
            ))
          ) : (
            <p>No hay flyers</p>
          )}
        </div>
      </div>
    </div>
  );
}