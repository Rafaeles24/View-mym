"use client";

import { getFileName } from "@/libs/getFilename";
import { getMediaType } from "@/libs/getMediaType";
import { MediaType, PaginationMedia, SedesMedia } from "@/types/media";
import { useMemo, useState } from "react";
import styles from "./ui.module.css";
import { MediaCard } from "../cards/media/ui";
import UploadMediaModal from "../modals/uploadMedia/ui";
import { Sede } from "@/types/sede";
import EditMediaModal from "../modals/editMedia/ui";
import DeleteMediaModal from "../modals/deleteMedia/ui";
import { deleteMedia } from "@/services/media/deleteMedia";
import { useRouter } from "next/navigation";

export default function MultimediaUI({
  multimedia,
  sedesData,
}: {
  multimedia: PaginationMedia;
  sedesData: Sede[];
}) {
  const [search, setSearch] = useState("");
  const [sedeFilter, setSedeFilter] = useState("TODAS");
  const [typeFilter, setTypeFilter] = useState("TODOS");

  //MODALES
  const [openUploadModal, setOpenUploadModal] = useState(false); 
  const [editingMedia, setEditingMedia] = useState<MediaType | null>(null);

  const [ deletingMedia, setDeletingMedia ] = useState<MediaType | null>(null);
  const [ deleting, setDeleting ] = useState(false);

  const router = useRouter();

  const [ error, setError ] = useState<string | null>(null);
  

  const filteredData = useMemo(() => {
    return multimedia.data.filter((item) => {
      const fileName = getFileName(item.url).toLowerCase();
      const mediaType = getMediaType(item.url);

      const matchesSearch = fileName.includes(
        search.toLowerCase(),
      );

      const matchesSede =
        sedeFilter === "TODAS" ||
        item.sedes.some(
          (sede) => sede.id === Number(sedeFilter),
        );

      const matchesType =
        typeFilter === "TODOS" ||
        mediaType === typeFilter;

      return (
        matchesSearch &&
        matchesSede &&
        matchesType
      );
    });
  }, [
    multimedia.data,
    search,
    sedeFilter,
    typeFilter,
  ]);

  const handleDelete = async () => {
    if (!deletingMedia || deleting) return;

    try {
      setDeleting(true);

      const payload = {
        id: deletingMedia.id
      };

      await deleteMedia(payload);

      router.refresh();
      setDeletingMedia(null);

    } catch (error) {
      setError( error instanceof Error ? error.message : `No se pudo eliminar la media: ${error}` );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            CONTENIDO MULTIMEDIA
          </h1>

          <p className={styles.subtitle}>
            Administra imágenes y videos que se
            muestran en las sedes mediante el Visor.
          </p>
        </div>

        <button
          type="button"
          className={styles.uploadButton}
          onClick={() =>
            setOpenUploadModal(true)
          }
        >
          <span className={styles.plus}>+</span>
          Subir contenido
        </button>

        { openUploadModal && (
          <UploadMediaModal
            open={openUploadModal}
            onClose={() => 
              setOpenUploadModal(false)
            }
          />
        )}
      </header>

      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <svg
            className={styles.searchIcon}
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
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Buscar contenido..."
            className={styles.searchInput}
          />
        </div>

        <select
          value={sedeFilter}
          onChange={(event) =>
            setSedeFilter(event.target.value)
          }
          className={styles.select}
        >
          <option value="TODAS">
            Todas las sedes
          </option>

          {sedesData.map((sede) => (
            <option
              key={sede.id}
              value={sede.id}
            >
              {sede.nombre}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(event) =>
            setTypeFilter(event.target.value)
          }
          className={styles.select}
        >
          <option value="TODOS">
            Todos los tipos
          </option>

          <option value="image">
            Imagen
          </option>

          <option value="video">
            Video
          </option>
        </select>
      </div>

      <div className={styles.summary}>
        <span>
          {filteredData.length} contenidos
        </span>

        <span>
          Página {multimedia.page} de{" "}
          {multimedia.totalPages}
        </span>
      </div>

      {filteredData.length > 0 ? (
        <div className={styles.grid}>
          {filteredData.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onEdit={setEditingMedia}
              onDelete={setDeletingMedia}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>◫</div>

          <h3>No se encontraron contenidos</h3>

          <p>Intenta cambiar los filtros de búsqueda.</p>
        </div>
      )}

      <EditMediaModal
        open={editingMedia !== null}
        media={editingMedia}
        sedesData={sedesData}
        onClose={() => setEditingMedia(null)}
      />

      <DeleteMediaModal
        open={deletingMedia !== null}
        media={deletingMedia}
        deleting={deleting}
        onClose={() => setDeletingMedia(null)}
        onConfirm={handleDelete}
      />
    </section>
  );
}
