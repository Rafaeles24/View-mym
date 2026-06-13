export async function GET(
    req: Request,
    context: { params: Promise<{ campaignId: string }> }
) {
    const params = context?.params;

    if (!params) {
        return new Response("Params missing", { status: 400 });
    }

    const { campaignId } = await context.params;

    try {
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/system/api/visor/campaign/${campaignId}`,
            { cache: "no-store" }
        );

        if (!res.ok) {
            const text = await res.text();
            console.error("Backend error:", text);
            return new Response("Backend error", { status: res.status });
        }

        const data = await res.json();

        return Response.json(data);

    } catch (err) {
        console.error("Route error:", err);
        return new Response("Internal error", { status: 500 });
    }
}