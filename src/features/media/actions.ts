"use server";

import { getTranslations } from "next-intl/server";
import { runAction } from "@/features/shared/run-action";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { assertPermission } from "@/server/auth/guards";
import { ImageRejectedError, storeTourImage } from "@/server/storage/image-processing";
import { MAX_UPLOAD_BYTES } from "@/server/storage/image-validation";

export type UploadedImage = { url: string; width: number; height: number };

type Outcome = { image: UploadedImage } | { rejected: ImageRejectedError["reason"] };

/** Admin-only image upload. The file is validated by content and re-encoded server-side. */
export async function uploadImageAction(formData: FormData): Promise<ActionResult<UploadedImage>> {
  const result = await runAction<Outcome>(async () => {
    await assertPermission("catalogue.manage");

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return { rejected: "empty" };
    if (file.size > MAX_UPLOAD_BYTES) return { rejected: "tooLarge" };

    try {
      const { url, width, height } = await storeTourImage(new Uint8Array(await file.arrayBuffer()));
      return { image: { url, width, height } };
    } catch (error) {
      if (error instanceof ImageRejectedError) return { rejected: error.reason };
      throw error;
    }
  });

  if (!result.ok) return result;
  if ("rejected" in result.data) {
    const t = await getTranslations("media.errors");
    return fail(t(result.data.rejected));
  }
  return ok(result.data.image);
}
