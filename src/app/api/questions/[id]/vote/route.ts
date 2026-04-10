import { auth } from "@/lib/auth";
import { voteOnQuestion } from "@/lib/arguments";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { value } = await request.json();
  if (value !== 1 && value !== -1) {
    return Response.json({ error: "Value must be 1 or -1" }, { status: 400 });
  }

  await voteOnQuestion(id, session.user.id, value);
  return Response.json({ ok: true });
}
