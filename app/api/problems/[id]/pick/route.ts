import { pickProviders } from "@/lib/server/problems";

export async function POST(req: Request, ctx: RouteContext<"/api/problems/[id]/pick">) {
  const { id } = await ctx.params;
  const { providerIds } = (await req.json()) as { providerIds: string[] };
  return Response.json(await pickProviders(id, providerIds));
}
