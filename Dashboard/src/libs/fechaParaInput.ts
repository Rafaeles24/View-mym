import { formatTime } from "./formatDate";

export function fechaParaInput(
  fecha: string,
  timeZone = "America/Lima"
): string {
  if (!fecha) return "";

  const date = new Date(fecha);

  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  /*
   * Obtener año, mes y día
   * según la zona horaria.
   */
  const dateParts = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(date);

  const obtener = (tipo: string) =>
    dateParts.find(p => p.type === tipo)?.value ?? "";

  const year = obtener("year");
  const month = obtener("month");
  const day = obtener("day");

  /*
   * Reutilizar tu función formatTime.
   */
  const { hour, minute, period } =
    formatTime(date, timeZone);

  /*
   * Convertir formato AM/PM a 24 horas,
   * porque datetime-local utiliza HH:mm.
   */
  let hour24 = Number(hour);

  const periodo = period.toUpperCase();

  if (periodo === "PM" && hour24 < 12) {
    hour24 += 12;
  }

  if (periodo === "AM" && hour24 === 12) {
    hour24 = 0;
  }

  const horaFormateada =
    String(hour24).padStart(2, "0");

  return (
    `${year}-${month}-${day}` +
    `T${horaFormateada}:${minute}`
  );
}