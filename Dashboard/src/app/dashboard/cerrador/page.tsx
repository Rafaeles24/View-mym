import CerradoresUI from "@/components/cerradores/ui";
import { getCerradoresActivos, getCerradoresInactivos } from "@/services/cerrador/getCerradores.service";

export default async function CerradorPage() {

  const [cerradoresActivos, cerradoresInactivos] = await Promise.all([
    getCerradoresActivos(),
    getCerradoresInactivos()
  ]);

  return (
    <CerradoresUI
      cerradoresActivos={cerradoresActivos}
      cerradoresInactivos={cerradoresInactivos}
    />
  )
}