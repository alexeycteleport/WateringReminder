import { Bot } from "grammy";
import { api } from "../convex/_generated/api";
import { convex } from "./lib/convex";
import { startWateringChecker } from "./lib/watering";
import { registerAddCommands } from "./commands/add";
import { registerDeleteCommands } from "./commands/delete";

const bot = new Bot(Bun.env.BOT_TOKEN!);

bot.command("start", (ctx) =>
  ctx.reply(
    "Welcome to WateringReminder!\n\n" +
      "Commands:\n" +
      "/add <name> <days> - add a plant\n" +
      "/list - show your plants\n" +
      "/delete <number> - delete a plant by number\n" +
      "/clearall - delete all your plants\n\n" +
      "Tip: Send a photo with caption /add <name> <days> to add plant with image!"
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
startWateringChecker(bot);

await bot.api.setMyCommands([
  { command: "start", description: "Start the bot" },
  { command: "add", description: "Add a plant: /add <name> <days> with photo (optional)" },
  { command: "list", description: "Show your plants" },
  { command: "delete", description: "Delete a plant: /delete <number>" },
  { command: "clearall", description: "Delete all your plants" },
]);

bot.start();
console.log("Bot started");