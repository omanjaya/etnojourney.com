import "server-only";
import { getEnv } from "@/server/env";
import { LocalDiskStorage } from "./local-disk-storage";
import type { Storage } from "./storage";

let instance: Storage | undefined;

export function getStorage(): Storage {
  instance ??= new LocalDiskStorage(getEnv().UPLOAD_DIR ?? "./storage/uploads");
  return instance;
}

export type { Storage } from "./storage";
