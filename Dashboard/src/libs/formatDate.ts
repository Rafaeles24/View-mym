export const formatTime = (date: Date, timeZone: string) => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    }).formatToParts(date);

    const hour = parts.find(p => p.type === "hour")?.value ?? "00";
    const minute = parts.find(p => p.type === "minute")?.value ?? "00";
    const period = parts.find(p => p.type === "dayPeriod")?.value ?? "";

    return {
        hour, minute, period
    };
}

export const formatDate = (
  date: Date | string,
  timeZone = "America/Lima"
) => {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
};

export function fechaInputValida(valor: string): boolean {
  const coincidencia = valor.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/
  );

  if (!coincidencia) return false;

  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);
  const hora = Number(coincidencia[4]);
  const minuto = Number(coincidencia[5]);

  const fecha = new Date(
    Date.UTC(anio, mes - 1, dia, hora, minuto)
  );

  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia &&
    fecha.getUTCHours() === hora &&
    fecha.getUTCMinutes() === minuto
  );
}