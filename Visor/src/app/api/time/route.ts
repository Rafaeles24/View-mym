export async function GET() {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/system/api/time/now`);
        const data = await res.json();
        return Response.json(data);
    } catch (error) {
        return Response.json({ error: "Failed to fetch time data" });
    }
}