import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  plants: defineTable({
    chatId: v.number(),
    userId: v.number(),
    name: v.string(),
    intervalDays: v.number(),
    lastWatered: v.number(),
    nextWatering: v.number(),
    imageId: v.optional(v.id("_storage")),
  })
    .index("by_user", ["userId"])
    .index("by_next_watering", ["nextWatering"]),
});