export const formatTime = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const hour = parts.find(p => p.type === "hour")?.value ?? "00";
  const minute = parts.find(p => p.type === "minute")?.value ?? "00";
  const second = parts.find(p => p.type === "second")?.value ?? "00";
  const period = parts.find(p => p.type === "dayPeriod")?.value ?? "";
  
  return {
      hour, minute, second, period
  };
}

export function formatearFecha(fecha: string) {
  const [anio, mes, dia] = fecha.split("-").map(Number);

  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(anio, mes - 1, dia));
}

export function obtenerMinutos(hora: string): number {
  const [horas, minutos] = hora.split(":").map(Number);

  return horas * 60 + minutos;
}
