import { reenviarSolicitudSica } from "../backend";

export async function POST() {
  return reenviarSolicitudSica("sync", {
    method: "POST",
  });
}
