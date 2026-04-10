import { auth } from "@/lib/auth";
import { getChildArguments } from "@/lib/arguments";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  const section = searchParams.get("section") as "questions" | "supports" | "counters";
  if (!["questions", "supports", "counters"].includes(section)) {
    return Response.json({ error: "Invalid section" }, { status: 400 });
  }

  const skip = parseInt(searchParams.get("skip") || "0", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  const result = await getChildArguments(id, section, session?.user?.id, skip, limit);
  return Response.json(result);
}
