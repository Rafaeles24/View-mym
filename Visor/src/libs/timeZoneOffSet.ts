export function getTimeZoneOffset(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter(part => part.type !== "literal")
      .map(part => [part.type, part.value])
  );

  const utcDate = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  
  return (utcDate - date.getTime()) / 60000;
}

export function getHourDifference(
  date: Date, timeZone1: string, timeZone2: string
) {
  const offset1 = getTimeZoneOffset(date, timeZone1);
  const offset2 = getTimeZoneOffset(date, timeZone2);
  return (offset2 - offset1) / 60;
}