import { auth } from "@/lib/auth";
import { addCounter } from "@/lib/arguments";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { content, imageUrl } = await request.json();
  if (!content?.trim()) {
    return Response.json({ error: "Content is required" }, { status: 400 });
  }

  await addCounter(id, session.user.id, content.trim(), imageUrl);
  return Response.json({ ok: true }, { status: 201 });
}
