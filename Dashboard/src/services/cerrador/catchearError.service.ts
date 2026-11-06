function obtenerMensajeError(
  result: unknown,
  fallback: string,
): string {
  if (!result || typeof result !== "object") {
    return fallback;
  }

  const message = (result as { message?: unknown }).message;

  if (Array.isArray(message)) {
    return message.map(String).join(", ");
  }

  return typeof message === "string"
    ? message
    : fallback;
}