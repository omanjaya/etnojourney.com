/**
 * Pure helpers for the tour gallery editor (an ordered list of image URLs).
 * Every helper returns the same array when nothing changes, so callers can
 * skip a state update with a simple identity check.
 */

/**
 * React keys for gallery tiles: the URL, plus its occurrence number for the
 * rare duplicate. Moving a photo therefore keeps its tile (and the keyboard
 * focus inside it) instead of re-creating every tile it passes.
 */
export function galleryKeys(urls: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return urls.map((url) => {
    const occurrence = seen.get(url) ?? 0;
    seen.set(url, occurrence + 1);
    return occurrence === 0 ? url : `${url}#${occurrence}`;
  });
}

/** Swaps the photo at `index` with its neighbour in `delta` direction. */
export function movePhoto(urls: string[], index: number, delta: -1 | 1): string[] {
  const target = index + delta;
  if (index < 0 || index >= urls.length || target < 0 || target >= urls.length) return urls;
  const next = [...urls];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Moves the photo at `index` to the first position (used when it becomes the cover). */
export function moveToFront(urls: string[], index: number): string[] {
  if (index <= 0 || index >= urls.length) return urls;
  return [urls[index], ...urls.slice(0, index), ...urls.slice(index + 1)];
}

export function removePhoto(urls: string[], index: number): string[] {
  if (index < 0 || index >= urls.length) return urls;
  return urls.filter((_, i) => i !== index);
}

/** Adds an uploaded photo at the end unless the gallery is full. */
export function appendPhoto(urls: string[], url: string, max: number): string[] {
  return urls.length >= max ? urls : [...urls, url];
}

/**
 * Puts `url` in place of the photo the operator chose to replace. The upload
 * takes a while, so the photo may have moved meanwhile: it is found by URL,
 * preferring its original position. Nothing changes when it was removed.
 */
export function replacePhoto(
  urls: string[],
  target: { index: number; url: string },
  url: string,
): string[] {
  const at = urls[target.index] === target.url ? target.index : urls.indexOf(target.url);
  if (at < 0) return urls;
  return urls.map((current, i) => (i === at ? url : current));
}

/**
 * The cover is usually also the first gallery photo. When the cover is
 * replaced, its copy in the gallery is replaced too, so the old photo (often
 * an AI placeholder) does not stay on the tour page as a gallery photo.
 */
export function swapCoverInGallery(
  gallery: string[],
  oldCover: string,
  newCover: string,
): string[] {
  if (!oldCover || !newCover || oldCover === newCover || gallery.includes(newCover)) {
    return gallery;
  }
  const at = gallery.indexOf(oldCover);
  if (at < 0) return gallery;
  return gallery.map((url, i) => (i === at ? newCover : url));
}
