import { BadRequestException, Logger, ServiceUnavailableException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";
import { join } from "path";
import { getUploadsDirectory, supabaseStorageConfig, uploadStorageMode } from "../common/deployment-config";

export function supabaseImageObjectPath(imageUrl: string) {
  const { url, bucket } = supabaseStorageConfig();
  const prefix = `${url}/storage/v1/object/public/${bucket}/`;
  if (!imageUrl.startsWith(prefix)) return null;
  const objectPath = imageUrl.slice(prefix.length);
  return /^products\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(objectPath) ? objectPath : null;
}

function imageExtension(bytes: Buffer, mimeType: string) {
  if (mimeType === "image/png" && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (mimeType === "image/jpeg" && bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpg";
  if (mimeType === "image/webp" && bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  throw new BadRequestException("Only PNG, JPEG and WebP image files are supported.");
}

export async function storeProductImage(file: Express.Multer.File) {
  const mode = uploadStorageMode();
  if (mode === "disabled") throw new ServiceUnavailableException("Image storage is unavailable.");
  const extension = imageExtension(file.buffer, file.mimetype);
  const filename = `${randomUUID()}.${extension}`;
  if (mode === "local") {
    await writeFile(join(getUploadsDirectory(), filename), file.buffer, { flag: "wx" });
    return { filename, url: `/uploads/${filename}`, provider: "local-disk" };
  }
  const { url, bucket, key } = supabaseStorageConfig();
  const objectPath = `products/${filename}`;
  let response: Response;
  try {
    response = await fetch(`${url}/storage/v1/object/${bucket}/${objectPath}`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": file.mimetype, "x-upsert": "false" },
      body: new Uint8Array(file.buffer),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    Logger.error("Product image storage request failed; provider details withheld.", "ImageStorage");
    throw new ServiceUnavailableException("Image upload failed. Please retry.");
  }
  if (!response.ok) {
    Logger.error(`Product image storage rejected upload (HTTP ${response.status}); provider details withheld.`, "ImageStorage");
    throw new ServiceUnavailableException("Image storage rejected the upload. Contact the administrator.");
  }
  return { filename, url: `${url}/storage/v1/object/public/${bucket}/${objectPath}`, provider: "supabase" };
}
