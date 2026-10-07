import { after } from "next/server";
import { answerQuestion, work } from "@/lib/server/problems";

export const maxDuration = 300;

/** multipart: text, audio */
export async function POST(req: Request, ctx: RouteContext<"/api/problems/[id]/answer">) {
  const { id } = await ctx.params;
  const form = await req.formData();
  const audio = form.get("audio");
  const problem = await answerQuestion(id, {
    text: (form.get("text") as string) || undefined,
    audio: audio instanceof Blob ? audio : null,
  });
  after(() => work(id));
  return Response.json(problem);
}
