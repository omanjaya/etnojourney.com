/**
 * Which uploaders of a form are still uploading, keyed by field (e.g.
 * "coverImage", "gallery"). Tracked per key so an uploader reporting
 * "not uploading" on mount can never cancel out another one's upload.
 */
export type UploadState = Readonly<Record<string, boolean>>;

export function setUploading(state: UploadState, key: string, uploading: boolean): UploadState {
  if (Boolean(state[key]) === uploading) return state;
  return { ...state, [key]: uploading };
}

export function anyUploading(state: UploadState): boolean {
  return Object.values(state).some(Boolean);
}
