import "server-only";
import { mediaRepository } from "@/server/repositories/media.repository";
import { photoCreditRepository } from "@/server/repositories/photo-credit.repository";
import { getStorage } from "@/server/storage";
import { isSafeOrphanCleanup, orphanUploadKeys, uploadUrl } from "./media.rules";

/** Storage folder of tour and destination photos (review photos live elsewhere and stay). */
const CATALOGUE_FOLDER = "tours";

export const mediaService = {
  /**
   * Deletes uploaded catalogue photos that no tour or destination uses any
   * more (replaced, removed or never saved) once they are past the grace
   * period, together with their credits. Run daily from the cleanup cron.
   */
  async pruneOrphanUploads(now = new Date()) {
    const storage = getStorage();
    const [files, used] = await Promise.all([
      storage.list(CATALOGUE_FOLDER),
      mediaRepository.usedUploadPaths(),
    ]);
    const orphans = orphanUploadKeys(files, used, now);
    if (!isSafeOrphanCleanup(files.length, orphans.length)) {
      throw new Error(
        `media cleanup refused: ${orphans.length} of ${files.length} uploads look unused`,
      );
    }
    for (const key of orphans) await storage.delete(key);
    const credits = await photoCreditRepository.deleteByPaths(orphans.map(uploadUrl));
    return { checked: files.length, deleted: orphans.length, credits };
  },
};
