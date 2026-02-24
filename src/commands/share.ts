import type { Bot } from "grammy";
import type { Doc } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { convex } from "../lib/convex";

type Plant = Doc<"plants">;

export function registerShareCommands(bot: Bot) {
  // Share single plant
  bot.command("share", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const num = parseInt(ctx.match);

    if (isNaN(num) || num <= 0) {
      return ctx.reply("Использование: /share <номер>\nПример: /share 1");
    }

    const userPlants: Plant[] = await convex.query(api.plants.list, { userId });

    if (num > userPlants.length) {
      return ctx.reply(`У вас только ${userPlants.length} растений`);
    }

    const plant = userPlants[num - 1];

    const result = await convex.mutation(api.invites.create, {
      plantId: plant._id,
      userId,
    });

    const expiresIn = Math.round((result.expiresAt - Date.now()) / 3600000);

    return ctx.reply(
      `🔗 Код для "${plant.name}":\n\n` +
        `<code>${result.code}</code>\n\n` +
        `Отправьте этот код другому пользователю.\n` +
        `Команда: /join ${result.code}\n\n` +
        `Код действителен ${expiresIn} ч.`,
      { parse_mode: "HTML" }
    );
  });

  // Share all plants
  bot.command("shareall", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    try {
      const result = await convex.mutation(api.invites.createAll, { userId });

      const expiresIn = Math.round((result.expiresAt - Date.now()) / 3600000);

      return ctx.reply(
        `🔗 Код для всех растений (${result.count} шт.):\n\n` +
          `<code>${result.code}</code>\n\n` +
          `Отправьте этот код другому пользователю.\n` +
          `Команда: /join ${result.code}\n\n` +
          `Код действителен ${expiresIn} ч.`,
        { parse_mode: "HTML" }
      );
    } catch (error: any) {
      return ctx.reply(`❌ ${error.message || "Ошибка"}`);
    }
  });
}