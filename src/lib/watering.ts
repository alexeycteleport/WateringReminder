import { Bot, InputFile } from "grammy";
import { api } from "../../convex/_generated/api";
import { convex } from "./convex";

export function startWateringChecker(bot: Bot) {
  async function checkPlantsToWater() {
    const plants = await convex.query(api.plants.getPlantsToWater);

    for (const plant of plants) {
      const message = `🌱 Time to water "${plant.name}"!`;

      if (plant.imageId) {
        const imageUrl = await convex.query(api.plants.getImageUrl, {
          storageId: plant.imageId,
        });
        if (imageUrl) {
          try {
            const response = await fetch(imageUrl);
            const buffer = Buffer.from(await response.arrayBuffer());
            await bot.api.sendPhoto(plant.chatId, new InputFile(buffer, "plant.jpg"), {
              caption: message,
            });
          } catch (error) {
            console.error("Failed to send photo:", error);
            await bot.api.sendMessage(plant.chatId, message);
          }
        } else {
          await bot.api.sendMessage(plant.chatId, message);
        }
      } else {
        await bot.api.sendMessage(plant.chatId, message);
      }

      await convex.mutation(api.plants.markWatered, { plantId: plant._id });
    }
  }

  setInterval(checkPlantsToWater, 30 * 1000);
}