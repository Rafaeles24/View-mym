import ConfiguracionVisoresUI from "@/components/configVisor/ui";
import { ConfiguracionVisor } from "@/types/ranking";

async function getConfigRanking(): Promise<ConfiguracionVisor> {
  const response = await fetch(`${process.env.BACKEND_INTERNAL_URL}/system/api/config-ranking/obtener`, {
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Failed to fetch config ranking: ", response.status, response.statusText);
    throw new Error("Failed to fetch data");
  }

  const data = await response.json();
  return data;
}

async function getConfigVersus(): Promise<ConfiguracionVisor> {
  const response = await fetch(`${process.env.BACKEND_INTERNAL_URL}/system/api/versus-config/obtener`, {
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Failed to fetch config versus: ", response.status, response.statusText);
    throw new Error("Failed to fetch data");
  }

  const data = await response.json();
  return data;
}

async function getConfigSedeVersus(): Promise<ConfiguracionVisor> {
  const response = await fetch(`${process.env.BACKEND_INTERNAL_URL}/system/api/sede-versus-config/obtener`, {
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Failed to fetch config sede versus: ", response.status, response.statusText);
    throw new Error("Failed to fetch data");
  }

  return await response.json();
}

export default async function ConfigVisor() {
  const [ rankingConfig, versusConfig, sedeVersusConfig ] = await Promise.all([
    getConfigRanking(),
    getConfigVersus(),
    getConfigSedeVersus()
  ]);

  return <ConfiguracionVisoresUI rankingConfig={rankingConfig} versusConfig={versusConfig} sedeVersusConfig={sedeVersusConfig}/>
}
