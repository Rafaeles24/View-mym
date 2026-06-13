import { Campaign, Sede } from "@/types/Campaign";
import IndexClient from "../client/index/ui";

async function getSelectors(): Promise<Campaign[]> {
    const res = await fetch(`${process.env.BACKEND_INTERNAL_URL}/system/api/visor`, {
        cache: "no-store",
    });

    return await res.json() as Campaign[];
}

export default async function Index() {
    const data = await getSelectors();
    return <IndexClient data={data} />
}   