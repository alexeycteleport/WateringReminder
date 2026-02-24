import type { Bot } from "grammy";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { convex } from "../lib/convex";
import { uploadPhotoToConvex } from "../lib/photo";

async function addPlant(
  chatId: number,
  userId: number,
  name: string,
  intervalDays: number,
  imageId?: Id<"_storage">
) {
  await convex.mutation(api.plants.add, {
    chatId,
    userId,
    name,
    intervalDays,
    imageId,
  });
}

export function registerAddCommands(bot: Bot) {
  bot.command("add", async (ctx) => {
    const args = ctx.match.split(" ");

    if (args.length < 2) {
      return ctx.reply(
        "Usage: /add <plant name> <interval in days>\nExample: /add Ficus 7\n\nYou can also send a photo with caption /add <name> <days> to add plant with image!"
      );
    }

    const intervalDays = parseInt(args[args.length - 1]);
    const name = args.slice(0, -1).join(" ");

    if (isNaN(intervalDays) || intervalDays <= 0) {
      return ctx.reply("Interval must be a positive number");
    }

    const chatId = ctx.chat.id;
    const userId = ctx.from?.id;
    if (!userId) return;

    await addPlant(chatId, userId, name, intervalDays);

    return ctx.reply(`Added "${name}" with watering interval ${intervalDays} days. Timer started!`);
  });

  bot.on("message:photo", async (ctx) => {
    const caption = ctx.message.caption;
    if (!caption?.startsWith("/add ")) return;

    const args = caption.slice(5).trim().split(" ");

    if (args.length < 2) {
      return ctx.reply("Usage: Send photo with caption /add <plant name> <interval in days>");
    }

    const intervalDays = parseInt(args[args.length - 1]);
    const name = args.slice(0, -1).join(" ");

    if (isNaN(intervalDays) || intervalDays <= 0) {
      return ctx.reply("Interval must be a positive number");
    }

    const chatId = ctx.chat.id;
    const userId = ctx.from?.id;
    if (!userId) return;

    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const file = await ctx.api.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${Bun.env.BOT_TOKEN}/${file.file_path}`;

    try {
      const imageId = await uploadPhotoToConvex(fileUrl);
      await addPlant(chatId, userId, name, intervalDays, imageId);
      return ctx.reply(`Added "${name}" with photo! Watering interval: ${intervalDays} days. Timer started!`);
    } catch (error) {
      console.error("Failed to upload photo:", error);
      await addPlant(chatId, userId, name, intervalDays);
      return ctx.reply(`Added "${name}" (photo upload failed). Watering interval: ${intervalDays} days. Timer started!`);
    }
  });
}