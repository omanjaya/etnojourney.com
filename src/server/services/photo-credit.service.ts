import "server-only";
import { photoCreditRepository } from "@/server/repositories/photo-credit.repository";

export const photoCreditService = {
  /** Credits for the given image paths (uploads and remote URLs have none). */
  forImages: (paths: string[]) => photoCreditRepository.findByPaths(paths),

  /** Every credited photo, for the public credits page. */
  all: () => photoCreditRepository.listAll(),
};
