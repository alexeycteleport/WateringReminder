import type { Bot } from "grammy";
import { api } from "../../convex/_generated/api";
import { convex } from "../lib/convex";

export function registerJoinCommands(bot: Bot) {
  bot.command("join", async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (!userId || !chatId) return;

    const code = ctx.match.trim();

    if (!code) {
      return ctx.reply("Использование: /join <код>\nПример: /join ABC123");
    }

    const result = await convex.mutation(api.invites.use, {
      code,
      userId,
      chatId,
    });

    if (!result.success) {
      return ctx.reply(`❌ ${result.error}`);
    }

    const addedPlants = result.addedPlants ?? [];
    let message = `✅ Вы присоединились к ${addedPlants.length} растениям:\n`;
    message += addedPlants.map((name) => `• ${name}`).join("\n");

    if (result.skippedPlants && result.skippedPlants.length > 0) {
      message += `\n\n⏭️ Пропущено (уже есть доступ):\n`;
      message += result.skippedPlants.map((name) => `• ${name}`).join("\n");
    }

    message += "\n\nТеперь вы будете получать напоминания о поливе.";

    return ctx.reply(message);
  });
}