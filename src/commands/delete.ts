import type { Bot } from "grammy";
import type { Doc } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { convex } from "../lib/convex";

type Plant = Doc<"plants">;

export function registerDeleteCommands(bot: Bot) {
  bot.command("delete", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const num = parseInt(ctx.match);

    if (isNaN(num) || num <= 0) {
      return ctx.reply("Usage: /delete <number>\nExample: /delete 1");
    }

    const userPlants: Plant[] = await convex.query(api.plants.list, { userId });

    if (num > userPlants.length) {
      return ctx.reply(`You only have ${userPlants.length} plants`);
    }

    const plant = userPlants[num - 1];
    await convex.mutation(api.plants.remove, { plantId: plant._id });

    return ctx.reply(`Deleted "${plant.name}"`);
  });

  bot.command("clearall", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const count = await convex.mutation(api.plants.clearAll, { userId });

    if (count === 0) {
      return ctx.reply("You have no plants to delete.");
    }

    return ctx.reply(`Deleted all ${count} plant(s) and their images.`);
  });
}