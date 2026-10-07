import { after } from "next/server";
import { listProblems, submitProblem, work } from "@/lib/server/problems";

export const maxDuration = 300;

export async function GET() {
  return Response.json(await listProblems());
}

/** multipart: text, audio, lat, lng */
export async function POST(req: Request) {
  const form = await req.formData();
  const num = (k: string) => (form.get(k) ? Number(form.get(k)) : undefined);
  const audio = form.get("audio");
  const problem = await submitProblem({
    text: (form.get("text") as string) ?? undefined,
    audio: audio instanceof Blob ? audio : null,
    lat: num("lat"),
    lng: num("lng"),
  });
  after(() => work(problem.id));
  return Response.json(problem);
}
