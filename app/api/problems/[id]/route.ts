import { getProblem } from "@/lib/server/problems";

export async function GET(_req: Request, ctx: RouteContext<"/api/problems/[id]">) {
  const { id } = await ctx.params;
  return Response.json(await getProblem(id));
}
