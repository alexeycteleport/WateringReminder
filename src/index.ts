import { Bot } from "grammy";
import { api } from "../convex/_generated/api";
import { convex } from "./lib/convex";
import { startWateringChecker } from "./lib/watering";
import { registerAddCommands } from "./commands/add";
import { registerDeleteCommands } from "./commands/delete";
import { registerShareCommands } from "./commands/share";
import { registerJoinCommands } from "./commands/join";

const bot = new Bot(Bun.env.BOT_TOKEN!);

bot.command("start", (ctx) =>
  ctx.reply(
    "🌱 Добро пожаловать в WateringReminder!\n\n" +
      "Команды:\n" +
      "/add <имя> <дни> - добавить растение\n" +
      "/list - список ваших растений\n" +
      "/delete <номер> - удалить растение\n" +
      "/clearall - удалить все растения\n" +
      "/share <номер> - поделиться растением\n" +
      "/shareall - поделиться всеми растениями\n" +
      "/join <код> - присоединиться к растениям\n\n" +
      "💡 Отправьте фото с подписью /add <имя> <дни> чтобы добавить с фото!"
  )
);

bot.command("list", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const userPlants = await convex.query(api.plants.list, { userId });

  if (userPlants.length === 0) {
    return ctx.reply("You have no plants yet. Use /add to add one.");
  }

  const list = userPlants
    .map((p, i) => `${i + 1}. ${p.name} - every ${p.intervalDays} days`)
    .join("\n");
  return ctx.reply(`Your plants:\n${list}`);
});

registerAddCommands(bot);
registerDeleteCommands(bot);
registerShareCommands(bot);
registerJoinCommands(bot);
startWateringChecker(bot);

await bot.api.setMyCommands([
  { command: "start", description: "Начать работу с ботом" },
  { command: "add", description: "Добавить растение: /add <имя> <дни>" },
  { command: "list", description: "Список ваших растений" },
  { command: "delete", description: "Удалить растение: /delete <номер>" },
  { command: "share", description: "Поделиться растением: /share <номер>" },
  { command: "shareall", description: "Поделиться всеми растениями" },
  { command: "join", description: "Присоединиться: /join <код>" },
  { command: "clearall", description: "Удалить все растения" },
]);

bot.start();
console.log("Bot started");