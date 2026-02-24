import type { Id } from "../../convex/_generated/dataModel";
import { CONVEX_SITE_URL } from "./convex";

export async function uploadPhotoToConvex(fileUrl: string): Promise<Id<"_storage">> {
  const response = await fetch(fileUrl);
  const blob = await response.blob();

  const uploadResponse = await fetch(`${CONVEX_SITE_URL}/upload`, {
    method: "POST",
    body: blob,
  });

  const { storageId } = await uploadResponse.json();
  return storageId;
}