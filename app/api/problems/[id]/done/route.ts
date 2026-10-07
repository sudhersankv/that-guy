import { markDone } from "@/lib/server/problems";
import type { DoneOutcome } from "@/lib/types";

export async function POST(req: Request, ctx: RouteContext<"/api/problems/[id]/done">) {
  const { id } = await ctx.params;
  const { providerId, outcome } = (await req.json()) as { providerId: string; outcome: DoneOutcome };
  return Response.json(await markDone(id, providerId, outcome));
}
