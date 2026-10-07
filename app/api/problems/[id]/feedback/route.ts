import { submitFeedback } from "@/lib/server/problems";

/** multipart: providerId, audio */
export async function POST(req: Request, ctx: RouteContext<"/api/problems/[id]/feedback">) {
  const { id } = await ctx.params;
  const form = await req.formData();
  const audio = form.get("audio");
  return Response.json(await submitFeedback(id, form.get("providerId") as string, audio instanceof Blob ? audio : null));
}
