import "server-only";
import { paginate } from "@/lib/pagination";
import {
  photoCreditRepository,
  type PhotoCreditValues,
} from "@/server/repositories/photo-credit.repository";
import { DomainError } from "./errors";

export const photoCreditService = {
  /** Credits for the given image paths (content photos and credited uploads). */
  forImages: (paths: string[]) => photoCreditRepository.findByPaths(paths),

  /** Every credited photo, for the public credits page. */
  all: () => photoCreditRepository.listAll(),

  /* -------------------------- admin -------------------------- */

  listForAdmin(q: string | undefined, page: number, pageSize: number) {
    return paginate({
      page,
      pageSize,
      count: () => photoCreditRepository.count(q),
      load: (limit, offset) => photoCreditRepository.search(q, limit, offset),
    });
  },

  uncreditedUploads: () => photoCreditRepository.uncreditedUploads(),

  /** Updates an existing credit; returns the previous and new rows for the audit log. */
  async update(path: string, values: PhotoCreditValues) {
    const before = await photoCreditRepository.findByPath(path);
    if (!before) throw new DomainError("notFound");
    const after = await photoCreditRepository.update(path, values);
    if (!after) throw new DomainError("notFound");
    return { before, after };
  },

  /** Adds a credit for an uploaded image; `null` when the image is already credited. */
  async create(path: string, values: PhotoCreditValues) {
    return (await photoCreditRepository.insert({ path, ...values })) ?? null;
  },
};
