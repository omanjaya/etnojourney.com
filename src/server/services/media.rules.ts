/**
 * Pure rules for cleaning up uploaded tour photos (no server-only imports).
 *
 * A photo is stored the moment it is chosen in the tour or destination form,
 * before the form is saved. Replaced, removed and abandoned uploads are
 * therefore left behind; the cleanup job deletes them once they are old
 * enough that no open form can still be about to save them.
 */

/** Uploads younger than this are kept, even when nothing uses them yet. */
export const ORPHAN_UPLOAD_GRACE_MS = 2 * 24 * 60 * 60 * 1000;

export type StoredUpload = { key: string; modifiedAt: Date };

/**
 * True when deleting `orphans` of `total` stored uploads looks like a normal
 * cleanup. Wiping more than half of a non-trivial library in one run is far
 * more likely a broken "in use" query than real clutter, so the job stops.
 */
export function isSafeOrphanCleanup(total: number, orphans: number): boolean {
  if (orphans === 0) return true;
  if (total < 10) return orphans < total;
  return orphans <= total / 2;
}

/** Public URL of a storage key, as saved on tours and destinations. */
export const uploadUrl = (key: string) => `/media/${key}`;

/** Keys of uploads that no tour or destination uses and that are past the grace period. */
export function orphanUploadKeys(
  files: readonly StoredUpload[],
  usedPaths: ReadonlySet<string>,
  now: Date,
  graceMs = ORPHAN_UPLOAD_GRACE_MS,
): string[] {
  return files
    .filter(
      (file) =>
        !usedPaths.has(uploadUrl(file.key)) && now.getTime() - file.modifiedAt.getTime() >= graceMs,
    )
    .map((file) => file.key);
}
