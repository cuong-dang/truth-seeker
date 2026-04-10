import { auth } from "@/lib/auth";
import { getQuestionReplies } from "@/lib/arguments";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  const skip = parseInt(searchParams.get("skip") || "0", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  const result = await getQuestionReplies(id, session?.user?.id, skip, limit);
  return Response.json(result);
}
