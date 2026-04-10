import { auth } from "@/lib/auth";
import { getRootArguments, createRootArgument } from "@/lib/arguments";

export async function GET(request: Request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const skip = parseInt(searchParams.get("skip") || "0", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const sort = (searchParams.get("sort") || "newest") as "newest" | "oldest" | "votes" | "replies";
  const result = await getRootArguments(session?.user?.id, skip, limit, sort);
  return Response.json(result);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content, imageUrl, tag } = await request.json();
  if (!content?.trim()) {
    return Response.json({ error: "Content is required" }, { status: 400 });
  }

  await createRootArgument(session.user.id, content.trim(), imageUrl, tag);
  return Response.json({ ok: true }, { status: 201 });
}
