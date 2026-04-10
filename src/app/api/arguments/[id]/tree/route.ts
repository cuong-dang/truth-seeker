import { auth } from "@/lib/auth";
import { getFullSubtree } from "@/lib/arguments";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;
  const tree = await getFullSubtree(id, session?.user?.id);

  if (!tree) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(tree);
}
