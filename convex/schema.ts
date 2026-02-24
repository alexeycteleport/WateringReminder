import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  plants: defineTable({
    name: v.string(),
    intervalDays: v.number(),
    lastWatered: v.number(),
    nextWatering: v.number(),
    imageId: v.optional(v.id("_storage")),
  }).index("by_next_watering", ["nextWatering"]),

  // Many-to-many relationship between users and plants
  plantUsers: defineTable({
    plantId: v.id("plants"),
    userId: v.number(),
    chatId: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_plant", ["plantId"]),

  // Invite codes for sharing plants
  inviteCodes: defineTable({
    code: v.string(),
    plantIds: v.array(v.id("plants")),
    createdBy: v.number(),
    expiresAt: v.number(),
  }).index("by_code", ["code"]),
});