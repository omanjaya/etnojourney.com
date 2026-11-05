import "server-only";
import { paginate } from "@/lib/pagination";
import {
  photoCreditRepository,
  type PhotoCreditValues,
} from "@/server/repositories/photo-credit.repository";
import { DomainError } from "./errors";
import {
  creditDeletionBlocker,
  isPlaceholderCredit,
  isSitePhoto,
  PLACEHOLDER_LICENSE_PREFIX,
  SITE_PHOTO_PREFIX,
} from "./photo-credit.rules";

export type { ImageOwner } from "@/server/repositories/photo-credit.repository";

export const photoCreditService = {
  /** Credits for the given image paths (content photos and credited uploads). */
  forImages: (paths: string[]) => photoCreditRepository.findByPaths(paths),

  /** Which of the given images are temporary AI placeholders. */
  async placeholdersAmong(paths: string[]): Promise<string[]> {
    const credits = await photoCreditRepository.findByPaths(paths);
    return [...credits.values()].filter(isPlaceholderCredit).map((credit) => credit.path);
  },

  /**
   * Tours and destinations still showing AI placeholder images, published
   * tours first, so the operator knows what is left to replace.
   */
  async placeholderUsage() {
    const usage = await photoCreditRepository.usageByLicensePrefix(PLACEHOLDER_LICENSE_PREFIX);
    const rank = ({ owner }: (typeof usage)[number]) =>
      owner.kind === "destination" ? 1 : owner.isPublished ? 0 : 2;
    return usage.sort((a, b) => rank(a) - rank(b) || a.owner.id - b.owner.id);
  },

  /** Credits of photos the site still shows, for the public credits page. */
  all: () => photoCreditRepository.listInUse(SITE_PHOTO_PREFIX),

  /* -------------------------- admin -------------------------- */

  async listForAdmin(q: string | undefined, page: number, pageSize: number) {
    const result = await paginate({
      page,
      pageSize,
      count: () => photoCreditRepository.count(q),
      load: (limit, offset) => photoCreditRepository.search(q, limit, offset),
    });
    return {
      ...result,
      items: result.items.map(({ usedByCatalogue, ...credit }) => {
        const inUse = usedByCatalogue || isSitePhoto(credit.path);
        return { ...credit, inUse, deletable: creditDeletionBlocker({ ...credit, inUse }) === null };
      }),
    };
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

  /**
   * Deletes the credit of an upload the site no longer shows; returns the
   * deleted row for the audit log. Credits still in use keep their attribution.
   */
  async remove(path: string) {
    const credit = await photoCreditRepository.findByPath(path);
    if (!credit) throw new DomainError("notFound");
    const inUse = await photoCreditRepository.isUsedByCatalogue(path);
    const blocker = creditDeletionBlocker({ path, inUse });
    if (blocker === "inUse") throw new DomainError("creditInUse");
    if (blocker === "notUpload") throw new DomainError("forbidden");
    const deleted = await photoCreditRepository.delete(path);
    if (!deleted) throw new DomainError("notFound");
    return deleted;
  },
};
