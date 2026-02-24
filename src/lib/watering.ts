import { Bot, InputFile } from "grammy";
import { api } from "../../convex/_generated/api";
import { convex } from "./convex";

export function startWateringChecker(bot: Bot) {
  async function checkPlantsToWater() {
    const plants = await convex.query(api.plants.getPlantsToWater);

    for (const plant of plants) {
      const message = `🌱 Пора полить "${plant.name}"!`;

      let imageBuffer: Buffer | null = null;

      // Fetch image once if exists
      if (plant.imageId) {
        const imageUrl = await convex.query(api.plants.getImageUrl, {
          storageId: plant.imageId,
        });
        if (imageUrl) {
          try {
            const response = await fetch(imageUrl);
            imageBuffer = Buffer.from(await response.arrayBuffer());
          } catch (error) {
            console.error("Failed to fetch image:", error);
          }
        }
      }

      // Send notification to all users
      for (const user of plant.users) {
        try {
          if (imageBuffer) {
            await bot.api.sendPhoto(
              user.chatId,
              new InputFile(imageBuffer, "plant.jpg"),
              { caption: message }
            );
          } else {
            await bot.api.sendMessage(user.chatId, message);
          }
        } catch (error) {
          console.error(`Failed to notify user ${user.userId}:`, error);
        }
      }

      await convex.mutation(api.plants.markWatered, { plantId: plant._id });
    }
  }

  setInterval(checkPlantsToWater, 30 * 1000);
}