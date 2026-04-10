import { auth } from "@/lib/auth";
import { getArgumentTree, createRootArgument } from "@/lib/arguments";

export async function GET() {
  const session = await auth();
  const tree = await getArgumentTree(session?.user?.id);
  return Response.json(tree);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content } = await request.json();
  if (!content?.trim()) {
    return Response.json({ error: "Content is required" }, { status: 400 });
  }

  await createRootArgument(session.user.id, content.trim());
  return Response.json({ ok: true }, { status: 201 });
}
