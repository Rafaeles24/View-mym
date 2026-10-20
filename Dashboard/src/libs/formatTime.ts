export function formatearTiempo(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0 s";

  const totalSegundos = Math.floor(ms / 1000);

  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;

  return [
    horas > 0 ? `${horas} h` : "",
    minutos > 0 ? `${minutos} min` : "",
    segundos > 0 ? `${segundos} s` : "",
  ]
    .filter(Boolean)
    .join(" ") || "0 s";
}