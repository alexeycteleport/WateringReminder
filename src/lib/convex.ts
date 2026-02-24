import { ConvexHttpClient } from "convex/browser";

export const convex = new ConvexHttpClient(Bun.env.CONVEX_URL!);
export const CONVEX_SITE_URL = Bun.env.CONVEX_SITE_URL!;