export async function GET() {
    try {
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/system/api/ranking/actual`,
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