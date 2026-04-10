import { cleanupUnverifiedUsers } from "@/lib/cleanup";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CLEANUP_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await cleanupUnverifiedUsers();
  return Response.json({ removed: count });
}
