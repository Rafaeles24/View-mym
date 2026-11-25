import { reenviarSolicitudSica } from "../../backend";

export async function GET() {
  return reenviarSolicitudSica("reconciliar/estado");
}
