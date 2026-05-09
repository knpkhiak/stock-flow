import { supabase } from "@/integrations/supabase/client";
import { compressImage, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "./imageCompressor";

export const IDEAS_BUCKET = "ideas-images";

/**
 * 압축 → 업로드 → signed URL 반환.
 * 경로: {userId}/{ideaId}/{timestamp}.webp
 */
export async function uploadIdeaImage(opts: {
  file: File | Blob;
  userId: string;
  ideaId: string;
}): Promise<{ url: string; path: string }> {
  const { file, userId, ideaId } = opts;
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("이미지가 5MB를 초과합니다. 더 작은 이미지를 사용해주세요.");
  }
  if (file.type && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("지원하지 않는 형식입니다 (PNG, JPEG, GIF, WebP만 가능).");
  }

  const compressed = await compressImage(file);
  const path = `${userId}/${ideaId}/${Date.now()}.webp`;
  const { error } = await supabase.storage.from(IDEAS_BUCKET).upload(path, compressed, {
    contentType: "image/webp",
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);

  // 비공개 버킷 → signed URL (장기간)
  const { data, error: signErr } = await supabase.storage
    .from(IDEAS_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signErr || !data) throw new Error(signErr?.message || "URL 생성 실패");
  return { url: data.signedUrl, path };
}

export async function deleteIdeaImagesFolder(userId: string, ideaId: string) {
  const prefix = `${userId}/${ideaId}`;
  const { data, error } = await supabase.storage.from(IDEAS_BUCKET).list(prefix);
  if (error || !data?.length) return;
  const paths = data.map((f) => `${prefix}/${f.name}`);
  await supabase.storage.from(IDEAS_BUCKET).remove(paths);
}
