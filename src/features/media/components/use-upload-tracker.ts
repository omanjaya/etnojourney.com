"use client";

import { useCallback, useState } from "react";
import { anyUploading, setUploading, type UploadState } from "../upload-state";

/**
 * For forms with image uploaders: `track(field)` goes to an uploader's
 * `onPendingChange`, and `uploading` stays true until every photo is in, so
 * the form can hold its save button (a save sent mid-upload keeps the old photo).
 */
export function useUploadTracker() {
  const [state, setState] = useState<UploadState>({});
  const report = useCallback(
    (field: string, pending: boolean) => setState((prev) => setUploading(prev, field, pending)),
    [],
  );
  const track = useCallback(
    (field: string) => (pending: boolean) => report(field, pending),
    [report],
  );
  return { uploading: anyUploading(state), report, track };
}
