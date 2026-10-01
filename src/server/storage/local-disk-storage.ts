import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { contentTypeForKey, normalizeKey, type Storage, type StoredObject } from "./storage";

export class LocalDiskStorage implements Storage {
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  /** Resolves a key to an absolute path inside the root, or null if unsafe. */
  private resolve(key: string): string | null {
    const normalized = normalizeKey(key);
    if (!normalized) return null;
    const absolute = path.resolve(this.root, normalized);
    return absolute.startsWith(this.root + path.sep) ? absolute : null;
  }

  async put(key: string, body: Buffer): Promise<void> {
    const target = this.resolve(key);
    if (!target) throw new Error("Invalid storage key");
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body, { flag: "wx" });
  }

  async get(key: string): Promise<StoredObject | null> {
    const target = this.resolve(key);
    const contentType = contentTypeForKey(key);
    if (!target || !contentType) return null;
    try {
      const body = await readFile(target);
      return { body, contentType, size: body.byteLength };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      if ((error as NodeJS.ErrnoException).code === "EISDIR") return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const target = this.resolve(key);
    if (!target) return;
    await rm(target, { force: true });
  }
}
