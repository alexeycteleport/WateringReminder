import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const TIMEZONE = "Europe/Amsterdam";
const WATERING_HOUR = 19;

function getNextWateringTime(intervalDays: number): number {
  const now = new Date();

  // Get current time in Amsterdam timezone
  const amsterdamNow = new Date(
    now.toLocaleString("en-US", { timeZone: TIMEZONE })
  );

  // Create target date at 19:00 Amsterdam time
  const target = new Date(amsterdamNow);
  target.setHours(WATERING_HOUR, 0, 0, 0);
  target.setDate(target.getDate() + intervalDays);

  // If target has passed, add one more day
  if (target <= amsterdamNow) {
    target.setDate(target.getDate() + 1);
  }

  // Convert Amsterdam time back to UTC timestamp
  const offset = now.getTime() - amsterdamNow.getTime();

  return target.getTime() + offset;
}

export const add = mutation({
  args: {
    chatId: v.number(),
    userId: v.number(),
    name: v.string(),
    intervalDays: v.number(),
    imageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const nextWatering = getNextWateringTime(args.intervalDays);

    return await ctx.db.insert("plants", {
      chatId: args.chatId,
      userId: args.userId,
      name: args.name,
      intervalDays: args.intervalDays,
      lastWatered: now,
      nextWatering,
      imageId: args.imageId,
    });
  },
});

export const list = query({
  args: { userId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("plants")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const getPlantsToWater = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db
      .query("plants")
      .withIndex("by_next_watering")
      .filter((q) => q.lte(q.field("nextWatering"), now))
      .collect();
  },
});

export const markWatered = mutation({
  args: { plantId: v.id("plants") },
  handler: async (ctx, args) => {
    const plant = await ctx.db.get(args.plantId);
    if (!plant) return;

    const now = Date.now();
    const nextWatering = getNextWateringTime(plant.intervalDays);

    await ctx.db.patch(args.plantId, {
      lastWatered: now,
      nextWatering,
    });
  },
});

export const remove = mutation({
  args: { plantId: v.id("plants") },
  handler: async (ctx, args) => {
    const plant = await ctx.db.get(args.plantId);
    if (plant?.imageId) {
      await ctx.storage.delete(plant.imageId);
    }
    await ctx.db.delete(args.plantId);
  },
});

export const clearAll = mutation({
  args: { userId: v.number() },
  handler: async (ctx, args) => {
    const plants = await ctx.db
      .query("plants")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const plant of plants) {
      if (plant.imageId) {
        await ctx.storage.delete(plant.imageId);
      }
      await ctx.db.delete(plant._id);
    }

    return plants.length;
  },
});

export const getImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});