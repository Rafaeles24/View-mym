'use client';

import { FormEvent, useMemo, useState } from 'react';
import Image from 'next/image';
import type { Cerrador } from '@/types/cerrador';
import type {
  Versus,
  VersusInput,
  VersusParticipanteInput,
} from '@/types/versus';
import {
  actualizarVersus,
  crearVersus,
  eliminarVersus,
} from '@/services/versus/gestionarVersus.service';
import styles from './ui.module.css';

type Filter = 'activos' | 'inactivos';

type FormState = {
  nombre: string;
  activo: boolean;
  equipos: Record<number, number[]>;
};

const emptyForm = (): FormState => ({
  nombre: '',
  activo: true,
  equipos: { 1: [], 2: [] },
});

function initials(nombre: string): string {
  return nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((item) => item.charAt(0))
    .join('')
    .toUpperCase();
}

function avatarUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base =
    process.env.NEXT_PUBLIC_STATIC_URL ??
    process.env.NEXT_PUBLIC_BACKEND_API_URL ??
    '';
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export default function VersusAdmin({
  initialVersus,
  cerradores,
}: {
  initialVersus: Versus[];
  cerradores: Cerrador[];
}) {
  const [items, setItems] = useState(initialVersus);
  const [filter, setFilter] = useState<Filter>('activos');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cerradoresById = useMemo(
    () => new Map(cerradores.map((cerrador) => [cerrador.id, cerrador])),
    [cerradores],
  );
  const visibleItems = items.filter((item) =>
    filter === 'activos' ? item.activo : !item.activo,
  );
  const teamNumbers = Object.keys(form.equipos)
    .map(Number)
    .sort((a, b) => a - b);
  const assignedIds = new Set(Object.values(form.equipos).flat());
  const activeCount = items.filter((item) => item.activo).length;
  const inactiveCount = items.length - activeCount;
  const formats = new Set(
    items.map((item) => {
      return [...new Set(item.participantes.map((p) => p.equipo))]
        .sort((a, b) => a - b)
        .map((team) => item.participantes.filter((p) => p.equipo === team).length)
        .join(' vs ');
    }),
  );

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setOpen(true);
  }

  function openEdit(item: Versus) {
    setEditingId(item.id);
    setForm({
      nombre: item.nombre,
      activo: item.activo,
      equipos: Object.fromEntries(
        [...new Set(item.participantes.map((p) => p.equipo))]
          .sort((a, b) => a - b)
          .map((team) => [
            team,
            item.participantes
              .filter((p) => p.equipo === team)
              .sort((a, b) => a.orden - b.orden)
              .map((p) => p.cerrador_id),
          ]),
      ),
    });
    setError(null);
    setOpen(true);
  }

  function addMember(team: number, id: number) {
    if (!id || assignedIds.has(id)) return;
    setForm((current) => ({
      ...current,
      equipos: {
        ...current.equipos,
        [team]: [...current.equipos[team], id],
      },
    }));
  }

  function removeMember(team: number, id: number) {
    setForm((current) => ({
      ...current,
      equipos: {
        ...current.equipos,
        [team]: current.equipos[team].filter((item) => item !== id),
      },
    }));
  }

  function moveMember(team: number, index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= form.equipos[team].length) return;

    setForm((current) => {
      const next = [...current.equipos[team]];
      [next[index], next[destination]] = [next[destination], next[index]];
      return {
        ...current,
        equipos: { ...current.equipos, [team]: next },
      };
    });
  }

  function addTeam() {
    setForm((current) => ({
      ...current,
      equipos: {
        ...current.equipos,
        [Object.keys(current.equipos).length + 1]: [],
      },
    }));
  }

  function removeTeam(team: number) {
    setForm((current) => {
      const equipos = Object.entries(current.equipos)
        .filter(([numero]) => Number(numero) !== team)
        .sort(([a], [b]) => Number(a) - Number(b));

      return {
        ...current,
        equipos: Object.fromEntries(
          equipos.map(([, miembros], index) => [index + 1, miembros]),
        ),
      };
    });
  }

  function toPayload(): VersusInput {
    const participantes: VersusParticipanteInput[] = teamNumbers.flatMap(
      (team) =>
        form.equipos[team].map((cerradorId, index) => ({
          cerrador_id: cerradorId,
          equipo: team,
          orden: index + 1,
        })),
    );

    return {
      nombre: form.nombre.trim(),
      activo: form.activo,
      participantes,
    };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.nombre.trim()) {
      setError('Ingresa un nombre para el versus.');
      return;
    }
    if (
      teamNumbers.length < 2 ||
      teamNumbers.some((team) => !form.equipos[team].length)
    ) {
      setError('Cada equipo debe tener al menos un cerrador.');
      return;
    }

    try {
      setSaving(true);
      const saved = editingId
        ? await actualizarVersus(editingId, toPayload())
        : await crearVersus(toPayload());
      setItems((current) =>
        editingId
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current],
      );
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el versus.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Versus) {
    if (!window.confirm(`¿Eliminar el versus “${item.nombre}”?`)) return;
    try {
      await eliminarVersus(item.id);
      setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
      if (editingId === item.id) setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo eliminar el versus.');
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Cerradores / Versus</span>
          <h1>Gestión de versus</h1>
          <p>Crea y administra enfrentamientos entre equipos de cerradores.</p>
        </div>
        <button type="button" className={styles.primary} onClick={openCreate}>
          <span>＋</span> Nuevo versus
        </button>
      </header>

      <section className={styles.stats} aria-label="Resumen de versus">
        <article><span>Versus activos</span><strong>{activeCount}</strong></article>
        <article><span>Participantes asignados</span><strong>{items.reduce((sum, item) => sum + item.participantes.length, 0)}</strong></article>
        <article><span>Formatos configurados</span><strong>{[...formats].join(' · ') || 'Sin formatos'}</strong></article>
      </section>

      {error && !open && <div className={styles.error}>{error}</div>}

      <div className={`${styles.workspace} ${open ? styles.withEditor : ''}`}>
        <section className={styles.listCard}>
          <div className={styles.listHeader}>
            <div><h2>Versus configurados</h2><span>{visibleItems.length} registros</span></div>
            <div className={styles.filters}>
              <button className={filter === 'activos' ? styles.filterActive : ''} onClick={() => setFilter('activos')}>Activos <span>{activeCount}</span></button>
              <button className={filter === 'inactivos' ? styles.filterActive : ''} onClick={() => setFilter('inactivos')}>Inactivos <span>{inactiveCount}</span></button>
            </div>
          </div>

          <div className={styles.list}>
            {visibleItems.length === 0 ? (
              <div className={styles.empty}>No existen versus {filter}.</div>
            ) : visibleItems.map((item) => {
              const teamIds = [...new Set(item.participantes.map((p) => p.equipo))].sort((a, b) => a - b);
              const teams = teamIds.map((team) =>
                item.participantes.filter((p) => p.equipo === team).sort((a, b) => a.orden - b.orden),
              );
              return (
                <article className={styles.row} key={item.id}>
                  <div className={styles.name}><strong>{item.nombre}</strong><span>ID #{item.id}</span></div>
                  <div className={styles.teamCollection}>{teams.map((team, index) => (
                    <div className={styles.teamSummary} key={teamIds[index]}>
                      <div className={styles.avatars}>{team.slice(0, 3).map((p) => (
                        <span className={styles.avatar} key={p.cerrador_id} title={p.cerrador.nombre}>
                          {p.cerrador.avatar_url ? <Image src={avatarUrl(p.cerrador.avatar_url)} alt="" fill unoptimized sizes="30px" /> : initials(p.cerrador.nombre)}
                        </span>
                      ))}{team.length > 3 && <span className={styles.avatar}>+{team.length - 3}</span>}</div>
                      <div><strong>{team[0]?.cerrador.nombre ?? 'Sin integrantes'}{team.length > 1 ? ` y ${team.length - 1} más` : ''}</strong><span>Equipo {teamIds[index]} · {team.length} {team.length === 1 ? 'integrante' : 'integrantes'}</span></div>
                    </div>
                  )).flatMap((team, index) => index < teams.length - 1 ? [team, <span className={styles.vs} key={`vs-${index}`}>VS</span>] : [team])}</div>
                  <span className={item.activo ? styles.activeStatus : styles.inactiveStatus}>{item.activo ? 'Activo' : 'Inactivo'}</span>
                  <div className={styles.actions}><button onClick={() => openEdit(item)} aria-label={`Editar ${item.nombre}`}>✎</button><button onClick={() => remove(item)} aria-label={`Eliminar ${item.nombre}`}>⌫</button></div>
                </article>
              );
            })}
          </div>
        </section>

        {open && (
          <aside className={styles.editor}>
            <form onSubmit={submit}>
              <div className={styles.editorHeader}><div><h2>{editingId ? 'Editar versus' : 'Nuevo versus'}</h2><p>Configura dos o más equipos</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar">×</button></div>
              {error && <div className={styles.error}>{error}</div>}
              <label className={styles.field}>Nombre del versus<input value={form.nombre} maxLength={100} onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))} placeholder="Ej. SEMANAL" /></label>
              <div className={styles.teamEditors}>{teamNumbers.map((team) => (
                <section className={styles.teamEditor} key={team}>
                  <header><strong>Equipo {team}</strong><span>{form.equipos[team].length}</span>{teamNumbers.length > 2 && <button type="button" onClick={() => removeTeam(team)} aria-label={`Eliminar equipo ${team}`}>×</button>}</header>
                  <div className={styles.members}>{form.equipos[team].map((id, index) => { const cerrador = cerradoresById.get(id); return (
                    <div className={styles.member} key={id}><span className={styles.memberAvatar}>{cerrador ? initials(cerrador.nombre) : '?'}</span><span>{cerrador?.nombre ?? `Cerrador #${id}`}</span><div><button type="button" disabled={index === 0} onClick={() => moveMember(team, index, -1)}>↑</button><button type="button" disabled={index === form.equipos[team].length - 1} onClick={() => moveMember(team, index, 1)}>↓</button><button type="button" onClick={() => removeMember(team, id)}>×</button></div></div>
                  ); })}</div>
                  <select value="" onChange={(event) => addMember(team, Number(event.target.value))}><option value="">＋ Agregar cerrador</option>{cerradores.filter((c) => !assignedIds.has(c.id)).map((c) => <option value={c.id} key={c.id}>{c.nombre}</option>)}</select>
                </section>
              ))}</div>
              <button type="button" className={styles.addTeam} onClick={addTeam}>＋ Agregar equipo</button>
              <p className={styles.hint}>Un cerrador no puede repetirse. Usa las flechas para definir el orden dentro de cada equipo.</p>
              <label className={styles.switch}><span><strong>Versus activo</strong><small>Se mostrará en el visor</small></span><input type="checkbox" checked={form.activo} onChange={(event) => setForm((current) => ({ ...current, activo: event.target.checked }))} /></label>
              <div className={styles.formActions}><button type="button" onClick={() => setOpen(false)}>Cancelar</button><button className={styles.primary} disabled={saving}>{saving ? 'Guardando…' : 'Guardar versus'}</button></div>
            </form>
          </aside>
        )}
      </div>
    </main>
  );
}
