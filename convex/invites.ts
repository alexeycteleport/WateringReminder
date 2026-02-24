import { mutation } from "./_generated/server";
import { v } from "convex/values";

const CODE_LENGTH = 6;
const CODE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding similar chars (0, O, I, 1)
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function generateUniqueCode(ctx: any): Promise<string> {
  let code: string;
  let attempts = 0;
  do {
    code = generateCode();
    const existing = await ctx.db
      .query("inviteCodes")
      .withIndex("by_code", (q: any) => q.eq("code", code))
      .first();
    if (!existing) return code;
    attempts++;
  } while (attempts < 10);

  throw new Error("Не удалось сгенерировать уникальный код");
}

// Share a single plant
export const create = mutation({
  args: {
    plantId: v.id("plants"),
    userId: v.number(),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this plant
    const plantUsers = await ctx.db
      .query("plantUsers")
      .withIndex("by_plant", (q) => q.eq("plantId", args.plantId))
      .collect();

    const hasAccess = plantUsers.some((pu) => pu.userId === args.userId);
    if (!hasAccess) {
      throw new Error("У вас нет доступа к этому растению");
    }

    const code = await generateUniqueCode(ctx);
    const expiresAt = Date.now() + CODE_EXPIRY_MS;

    await ctx.db.insert("inviteCodes", {
      code,
      plantIds: [args.plantId],
      createdBy: args.userId,
      expiresAt,
    });

    return { code, expiresAt };
  },
});

// Share all plants
export const createAll = mutation({
  args: {
    userId: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all plants for this user
    const plantUsers = await ctx.db
      .query("plantUsers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    if (plantUsers.length === 0) {
      throw new Error("У вас нет растений для шаринга");
    }

    const plantIds = plantUsers.map((pu) => pu.plantId);

    const code = await generateUniqueCode(ctx);
    const expiresAt = Date.now() + CODE_EXPIRY_MS;

    await ctx.db.insert("inviteCodes", {
      code,
      plantIds,
      createdBy: args.userId,
      expiresAt,
    });

    return { code, expiresAt, count: plantIds.length };
  },
});

export const use = mutation({
  args: {
    code: v.string(),
    userId: v.number(),
    chatId: v.number(),
  },
  handler: async (ctx, args) => {
    const code = args.code.toUpperCase().trim();

    // Find the invite code
    const inviteCode = await ctx.db
      .query("inviteCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    if (!inviteCode) {
      return { success: false, error: "Код не найден" };
    }

    // Check if expired
    if (inviteCode.expiresAt < Date.now()) {
      await ctx.db.delete(inviteCode._id);
      return { success: false, error: "Код истёк" };
    }

    const addedPlants: string[] = [];
    const skippedPlants: string[] = [];

    for (const plantId of inviteCode.plantIds) {
      // Check if user already has access
      const existingAccess = await ctx.db
        .query("plantUsers")
        .withIndex("by_plant", (q) => q.eq("plantId", plantId))
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .first();

      if (existingAccess) {
        const plant = await ctx.db.get(plantId);
        if (plant) skippedPlants.push(plant.name);
        continue;
      }

      // Get plant info
      const plant = await ctx.db.get(plantId);
      if (!plant) continue;

      // Add user to plant
      await ctx.db.insert("plantUsers", {
        plantId,
        userId: args.userId,
        chatId: args.chatId,
      });

      addedPlants.push(plant.name);
    }

    if (addedPlants.length === 0 && skippedPlants.length > 0) {
      return {
        success: false,
        error: "Вы уже имеете доступ ко всем этим растениям",
      };
    }

    if (addedPlants.length === 0) {
      return { success: false, error: "Растения не найдены" };
    }

    return {
      success: true,
      addedPlants,
      skippedPlants,
    };
  },
});
