import { Campaign, Sede } from "@/types/Campaign";
import IndexClient from "../client/index/ui";
import { Ranking } from "@/types/ranking";

async function getSelectors(): Promise<Campaign[]> {
    const res = await fetch(`${process.env.BACKEND_INTERNAL_URL}/system/api/visor`, {
        cache: "no-store",
    });

    return await res.json() as Campaign[];
}

async function getRanking(): Promise<Ranking> {
    const res = await fetch(`${process.env.BACKEND_INTERNAL_URL}/system/api/ranking/actual`, {
        cache: "no-store",
    });

    return await res.json() as Ranking;
}

export default async function Index() {
    const data = await getSelectors();
    const ranking = await getRanking();
    return <IndexClient data={data} ranking={ranking} />
}   