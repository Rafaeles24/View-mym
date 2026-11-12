import VersusAdmin from '@/components/versusAdmin/ui';
import { getCerradoresActivos } from '@/services/cerrador/getCerradores.service';
import { getVersus } from '@/services/versus/getVersus.service';

export default async function VersusPage() {
  const [versus, cerradores] = await Promise.all([
    getVersus(),
    getCerradoresActivos(),
  ]);

  return <VersusAdmin initialVersus={versus} cerradores={cerradores} />;
}
