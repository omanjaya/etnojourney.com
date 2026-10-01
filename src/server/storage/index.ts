import "server-only";
import { LocalDiskStorage } from "./local-disk-storage";
import type { Storage } from "./storage";

let instance: Storage | undefined;

export function getStorage(): Storage {
  instance ??= new LocalDiskStorage(process.env.UPLOAD_DIR ?? "./storage/uploads");
  return instance;
}

export type { Storage } from "./storage";
