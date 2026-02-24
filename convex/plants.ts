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

    // Create plant
    const plantId = await ctx.db.insert("plants", {
      name: args.name,
      intervalDays: args.intervalDays,
      lastWatered: now,
      nextWatering,
      imageId: args.imageId,
    });

    // Create user-plant relationship
    await ctx.db.insert("plantUsers", {
      plantId,
      userId: args.userId,
      chatId: args.chatId,
    });

    return plantId;
  },
});

export const list = query({
  args: { userId: v.number() },
  handler: async (ctx, args) => {
    // Get all plant-user relationships for this user
    const plantUsers = await ctx.db
      .query("plantUsers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get all plants for these relationships
    const plants = await Promise.all(
      plantUsers.map(async (pu) => {
        const plant = await ctx.db.get(pu.plantId);
        return plant;
      })
    );

    return plants.filter((p) => p !== null);
  },
});

export const getPlantsToWater = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const plants = await ctx.db
      .query("plants")
      .withIndex("by_next_watering")
      .filter((q) => q.lte(q.field("nextWatering"), now))
      .collect();

    // For each plant, get all users who should be notified
    const plantsWithUsers = await Promise.all(
      plants.map(async (plant) => {
        const plantUsers = await ctx.db
          .query("plantUsers")
          .withIndex("by_plant", (q) => q.eq("plantId", plant._id))
          .collect();

        return {
          ...plant,
          users: plantUsers.map((pu) => ({
            userId: pu.userId,
            chatId: pu.chatId,
          })),
        };
      })
    );

    return plantsWithUsers;
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
  args: { plantId: v.id("plants"), userId: v.number() },
  handler: async (ctx, args) => {
    // Remove user's relationship with this plant
    const plantUsers = await ctx.db
      .query("plantUsers")
      .withIndex("by_plant", (q) => q.eq("plantId", args.plantId))
      .collect();

    const userRelation = plantUsers.find((pu) => pu.userId === args.userId);
    if (userRelation) {
      await ctx.db.delete(userRelation._id);
    }

    // Check if any users are left
    const remainingUsers = plantUsers.filter((pu) => pu.userId !== args.userId);

    // If no users left, delete the plant and its image
    if (remainingUsers.length === 0) {
      const plant = await ctx.db.get(args.plantId);
      if (plant?.imageId) {
        await ctx.storage.delete(plant.imageId);
      }

      await ctx.db.delete(args.plantId);
    }
  },
});

export const clearAll = mutation({
  args: { userId: v.number() },
  handler: async (ctx, args) => {
    const plantUsers = await ctx.db
      .query("plantUsers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    let deletedCount = 0;

    for (const pu of plantUsers) {
      // Check if other users have this plant
      const allPlantUsers = await ctx.db
        .query("plantUsers")
        .withIndex("by_plant", (q) => q.eq("plantId", pu.plantId))
        .collect();

      // Delete user's relationship
      await ctx.db.delete(pu._id);
      deletedCount++;

      // If this was the only user, delete the plant
      if (allPlantUsers.length === 1) {
        const plant = await ctx.db.get(pu.plantId);
        if (plant?.imageId) {
          await ctx.storage.delete(plant.imageId);
        }

        await ctx.db.delete(pu.plantId);
      }
    }

    return deletedCount;
  },
});

export const getImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Get plant by ID (for sharing)
export const getById = query({
  args: { plantId: v.id("plants") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.plantId);
  },
});

// Check if user has access to a plant
export const hasAccess = query({
  args: { plantId: v.id("plants"), userId: v.number() },
  handler: async (ctx, args) => {
    const plantUsers = await ctx.db
      .query("plantUsers")
      .withIndex("by_plant", (q) => q.eq("plantId", args.plantId))
      .collect();

    return plantUsers.some((pu) => pu.userId === args.userId);
  },
});