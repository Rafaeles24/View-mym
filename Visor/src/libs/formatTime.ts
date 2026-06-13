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